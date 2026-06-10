#!/usr/bin/env node
/**
 * Poster CLI — entrypoint for the headless poster generator.
 *
 * Commands:
 *   posters gen           Composite captured shots into store-res poster PNGs.
 *   posters headlines     Draft on-brand headlines + subheads per screen
 *                         (Claude) and write them into src/headlines.json.
 *   posters list-devices  Print the device presets (px dims + bezel insets).
 *
 * Run via tsx (see package.json). Flags use a tiny hand-rolled parser (no
 * external arg dep — the brief only verifies playwright + @ai-sdk/anthropic +
 * ai + zod). Each command dispatches to the renderer / headline modules the
 * sibling modules expose.
 *
 * Layout: this file is tools/posters/src/cli.ts.
 *   mobile app dir = tools/posters/../..      (apps/chunky-crayon-mobile)
 *   tool dir       = tools/posters            (where posters.config.ts lives)
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listDevices, getDevice, type DevicePreset } from "./devices";
import type { PostersConfig, PanelConfig } from "./config-types";
import { renderAll, type RenderContext } from "./render";
import { CC_CAPTURE_PLAN, grab, type CaptureStep } from "./capture";
import {
  generateHeadlines,
  writeHeadlinesJson,
  type ScreenDescriptor,
  type HeadlinesFile,
} from "./headlines";

const HERE = dirname(fileURLToPath(import.meta.url));
/** tools/posters/src → tools/posters */
const TOOL_DIR = resolve(HERE, "..");
/** tools/posters → apps/chunky-crayon-mobile */
const MOBILE_APP_DIR = resolve(TOOL_DIR, "..", "..");

const CONFIG_PATH = join(TOOL_DIR, "posters.config.ts");
const HEADLINES_JSON = join(HERE, "headlines.json");

// ───────────────────────────────────────────────────────────────────────
// Tiny flag parser
// ───────────────────────────────────────────────────────────────────────

type Flags = Record<string, string | boolean>;

const parseFlags = (argv: string[]): Flags => {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (!tok.startsWith("--")) continue;
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
    } else {
      flags[key] = next;
      i += 1;
    }
  }
  return flags;
};

const str = (flags: Flags, key: string, fallback: string): string => {
  const v = flags[key];
  return typeof v === "string" ? v : fallback;
};

// ───────────────────────────────────────────────────────────────────────
// Config + headlines loading
// ───────────────────────────────────────────────────────────────────────

/** Dynamically import posters.config.ts (tsx resolves the TS on the fly). */
const loadConfig = async (): Promise<PostersConfig> => {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `posters.config.ts not found at ${CONFIG_PATH}. Create one (see README "Config shape").`,
    );
  }
  const mod = (await import(pathToFileURL(CONFIG_PATH).href)) as {
    default: PostersConfig;
  };
  if (!mod.default || !Array.isArray(mod.default.panels)) {
    throw new Error(
      `posters.config.ts must default-export a PostersConfig with a panels[] array.`,
    );
  }
  return mod.default;
};

/**
 * Read src/headlines.json if present and return the keyed copy map. The
 * `headlines` subcommand writes this; `gen` merges it over the config panels
 * so Claude-drafted copy actually takes effect without editing the config.
 */
const loadHeadlines = (): HeadlinesFile["headlines"] => {
  if (!existsSync(HEADLINES_JSON)) return {};
  try {
    const parsed = JSON.parse(readFileSync(HEADLINES_JSON, "utf8")) as Partial<HeadlinesFile>;
    return parsed.headlines ?? {};
  } catch {
    return {};
  }
};

/**
 * Merge headlines.json copy over a panel's inline copy. The drafted copy wins
 * (the headlines step is the source of truth once it has run); inline copy is
 * the placeholder fallback when no draft exists for that panel.
 *
 * Panels are keyed in headlines.json by their stem with the NN- prefix
 * stripped (so "01-home" and "home" both resolve), matching how the
 * `headlines` command builds ScreenDescriptors below.
 */
const mergeHeadlines = (
  panels: PanelConfig[],
  drafted: HeadlinesFile["headlines"],
): PanelConfig[] =>
  panels.map((p) => {
    const key = stripIndex(p.name);
    const copy = drafted[p.name] ?? drafted[key];
    if (!copy) return p;
    return {
      ...p,
      headline: copy.headline ?? p.headline,
      subhead: copy.subhead ?? p.subhead,
    };
  });

const stripIndex = (name: string): string => name.replace(/^\d+[-_]/, "");

// ───────────────────────────────────────────────────────────────────────
// Path resolution
// ───────────────────────────────────────────────────────────────────────

/** Resolve a config-relative dir against the mobile app dir (or absolute). */
const resolveAppPath = (p: string): string =>
  isAbsolute(p) ? p : join(MOBILE_APP_DIR, p);

// ───────────────────────────────────────────────────────────────────────
// Command: list-devices
// ───────────────────────────────────────────────────────────────────────

const cmdListDevices = (): void => {
  const devices = listDevices();
  const lines: string[] = [
    "Device presets (store resolution + bezel screen-cutout inset):",
    "",
  ];
  for (const d of devices) {
    lines.push(`  ${d.key}`);
    lines.push(`    ${d.label}`);
    lines.push(
      `    store: ${d.store.width} x ${d.store.height} px   bezel: ${d.bezelPng}`,
    );
    const ins = d.screenInset;
    lines.push(
      `    screenInset (frac of bezel): left ${ins.left} top ${ins.top} w ${ins.width} h ${ins.height} r ${ins.radius}`,
    );
    lines.push("");
  }
  lines.push(
    "Store dims are verbatim from the research brief (storeSpecs). A missing",
  );
  lines.push("bezel PNG falls back to the built-in CSS device frame.");
  process.stdout.write(`${lines.join("\n")}\n`);
};

// ───────────────────────────────────────────────────────────────────────
// Command: gen
// ───────────────────────────────────────────────────────────────────────

const cmdGen = async (flags: Flags): Promise<void> => {
  const platform = str(flags, "platform", "ios");
  const deviceKey = str(flags, "device", "ipad-13");
  const locale = str(flags, "locale", "en");

  const config = await loadConfig();
  const device: DevicePreset = getDevice(deviceKey);

  const marketingRoot = resolveAppPath(config.marketingDir);
  const outRoot = resolveAppPath(str(flags, "out", config.outDir));

  const captureDir = join(marketingRoot, platform, locale);
  if (!existsSync(captureDir)) {
    throw new Error(
      `Capture dir not found: ${captureDir}\n` +
        `Run the rn-marketing-capture step first so ` +
        `marketing/${platform}/${locale}/NN-*.png exist.`,
    );
  }

  const outDir = join(outRoot, platform, deviceKey, locale);

  // Merge any Claude-drafted headlines (headlines.json) over the config panels.
  const merged = mergeHeadlines(config.panels, loadHeadlines());

  // Retarget every panel's device frame to the --device the user is rendering
  // for, so ONE locked panel set (posters.config.ts) renders against ANY device
  // (iPad-13, iPhone-6.9, …) without duplicating the config. The art direction
  // (template-v2, colors, copy, panel structure) is unchanged — only the device
  // frame the screenshot sits in swaps. Panels that intentionally show no device
  // frame ("none") are left alone, as are the card-style panels (request/voice)
  // that replace the device entirely.
  const retargeted = merged.map((p) =>
    p.deviceFrame && p.deviceFrame !== "none"
      ? { ...p, deviceFrame: deviceKey }
      : p,
  );
  const renderConfig: PostersConfig = { ...config, panels: retargeted };

  const ctx: RenderContext = {
    config: renderConfig,
    captureDir,
    outDir,
    device,
  };

  process.stdout.write(
    `[posters] gen platform=${platform} device=${deviceKey} locale=${locale}\n` +
      `[posters]   in:  ${captureDir}\n` +
      `[posters]   out: ${outDir}\n`,
  );

  const results = await renderAll(ctx);

  for (const r of results) {
    process.stdout.write(`[posters]   wrote ${r.path}\n`);
  }
  process.stdout.write(
    `[posters] done — ${results.length} poster(s) + a contact sheet (_contact-sheet.png) at ${device.store.width}x${device.store.height}.\n`,
  );
};

// ───────────────────────────────────────────────────────────────────────
// Command: headlines
// ───────────────────────────────────────────────────────────────────────

const cmdHeadlines = async (flags: Flags): Promise<void> => {
  const platform = str(flags, "platform", "ios");
  const locale = str(flags, "locale", "en");

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is required for the headlines command (read by the " +
        "@ai-sdk/anthropic provider). Run: ANTHROPIC_API_KEY=<key> pnpm posters headlines ...",
    );
  }

  const config = await loadConfig();
  const captureDir = join(
    resolveAppPath(config.marketingDir),
    platform,
    locale,
  );

  // Build one ScreenDescriptor per panel. `name` is the stem (NN- stripped) so
  // it is stable across re-numbering and matches the headlines.json key
  // mergeHeadlines reads. `role` gives the model context: the placeholder
  // headline if present, else the screen name. Attach the captured shot when
  // it exists so the model can SEE the screen.
  const screens: ScreenDescriptor[] = config.panels.map((p) => {
    const name = stripIndex(p.name);
    const shotPath = join(captureDir, p.screenshot);
    const role =
      p.headline ?? `The ${name.replace(/[-_]/g, " ")} screen of the app.`;
    return {
      name,
      role,
      ...(existsSync(shotPath) ? { screenshotPath: shotPath } : {}),
    };
  });

  process.stdout.write(
    `[posters] drafting headlines for ${screens.length} screen(s) ` +
      `(platform=${platform} locale=${locale}) via Claude...\n`,
  );

  const drafted = await generateHeadlines(screens);
  for (const d of drafted) {
    process.stdout.write(
      `[posters]   ${d.name}: "${d.headline}"${d.subhead ? ` — ${d.subhead}` : ""}\n`,
    );
  }

  const written = await writeHeadlinesJson(drafted, HEADLINES_JSON);
  process.stdout.write(
    `[posters] wrote ${written}. Run "posters gen" to render with this copy.\n`,
  );
};

// ───────────────────────────────────────────────────────────────────────
// Usage
// ───────────────────────────────────────────────────────────────────────

const USAGE = `Chunky Crayon poster CLI

Usage:
  posters gen [--platform ios] [--device ipad-13] [--locale en] [--out marketing-posters]
  posters headlines [--platform ios] [--locale en]      (needs ANTHROPIC_API_KEY)
  posters list-devices

Commands:
  capture        Print the capture nav plan, or grab one native-res screenshot.
                   capture plan  [--platform ios] [--locale en]
                   capture grab  --name <file.png> --device-id <udid> [--rotate 180]
  gen            Composite captured shots into store-res poster PNGs + a contact sheet.
  headlines      Draft on-brand headlines/subheads per screen (Claude) → src/headlines.json.
  list-devices   Print the device presets (store px + bezel insets).

gen flags:
  --platform   ios | android        (input subtree under marketing/)   default: ios
  --device     a device preset key  (see list-devices)                 default: ipad-13
  --locale     locale subfolder                                        default: en
  --out        output root (relative to the mobile app dir)            default: config.outDir
`;

// ───────────────────────────────────────────────────────────────────────
// Command: capture
// ───────────────────────────────────────────────────────────────────────

/** App URL scheme for the deep links in the capture plan. */
const APP_SCHEME = "chunkycrayon";

/**
 * `capture plan` — print the ordered nav recipe (deep link / settle / taps)
 * for every screen, so the driving agent knows what to do before each grab.
 * `capture grab` — write ONE native-res screenshot for a named screen.
 *
 * The agent loop: boot a device (Argent) → for each plan step, navigate
 * (open-url <scheme>://<deepLink> or the tap notes), wait settleMs, then run
 * `posters capture grab --name <file> --device-id <udid>`. The CLI never drives
 * the device itself (that's Argent's job); it just emits the plan and writes
 * the final native-res PNG via simctl/adb.
 */
const cmdCapture = async (flags: Flags): Promise<void> => {
  const sub = typeof flags._sub === "string" ? flags._sub : "plan";
  const platform = str(flags, "platform", "ios") as "ios" | "android";
  const locale = str(flags, "locale", "en");
  const config = await loadConfig().catch(() => null);
  const marketingRoot = config
    ? resolveAppPath(config.marketingDir)
    : resolveAppPath("marketing");
  const captureDir = join(marketingRoot, platform, locale);

  if (sub === "grab") {
    const name = str(flags, "name", "");
    const deviceId = str(flags, "device-id", "");
    if (!name || !deviceId) {
      throw new Error(
        "capture grab needs --name <file.png> and --device-id <udid|serial>.",
      );
    }
    const step = CC_CAPTURE_PLAN.find((s) => s.file === name);
    if (!step) {
      const names = CC_CAPTURE_PLAN.map((s) => s.file).join(", ");
      throw new Error(`Unknown screen "${name}". Plan screens: ${names}`);
    }
    const rotateDeg = (Number(str(flags, "rotate", "0")) || 0) as
      | 0
      | 90
      | 180
      | 270;
    const outPath = join(captureDir, step.file);
    grab({ platform, deviceId, outPath, rotateDeg });
    process.stdout.write(
      `[capture] wrote ${outPath}` +
        (rotateDeg ? ` (rotated ${rotateDeg}°)` : "") +
        "\n",
    );
    return;
  }

  // sub === "plan" (default): print the nav recipe.
  const fmt = (s: CaptureStep, i: number): string => {
    const nav = s.deepLink
      ? `open-url  ${APP_SCHEME}://${s.deepLink.replace(/^\//, "")}`
      : "navigate via taps (see notes)";
    return (
      `  ${String(i + 1).padStart(2, "0")}. ${s.label}\n` +
      `      file:  ${s.file}\n` +
      `      nav:   ${nav}\n` +
      `      wait:  ${s.settleMs}ms` +
      (s.notes ? `\n      note:  ${s.notes}` : "")
    );
  };
  process.stdout.write(
    `[capture] plan for platform=${platform} locale=${locale}\n` +
      `[capture] out dir: ${captureDir}\n` +
      `[capture] scheme:  ${APP_SCHEME}://\n\n` +
      `Drive each step with Argent, then grab native-res:\n` +
      `  pnpm posters capture grab --name <file> --device-id <udid> [--rotate 180]\n\n` +
      CC_CAPTURE_PLAN.map(fmt).join("\n\n") +
      `\n\nThen render the deck:\n` +
      `  pnpm posters headlines\n` +
      `  pnpm posters gen --platform ${platform} --device iphone-6.9 --locale ${locale}\n` +
      `  pnpm posters gen --platform ${platform} --device ipad-13 --locale ${locale}\n`,
  );
};

// ───────────────────────────────────────────────────────────────────────
// main
// ───────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  const [, , command, ...rest] = process.argv;
  const flags = parseFlags(rest);

  switch (command) {
    case "capture": {
      // `capture` takes an optional sub-verb (plan|grab) as the first
      // positional; default to "plan". Stash it on flags._sub.
      const sub = rest[0] && !rest[0].startsWith("--") ? rest[0] : "plan";
      flags._sub = sub;
      await cmdCapture(flags);
      break;
    }
    case "gen":
      await cmdGen(flags);
      break;
    case "headlines":
      await cmdHeadlines(flags);
      break;
    case "list-devices":
      cmdListDevices();
      break;
    case undefined:
    case "help":
    case "--help":
    case "-h":
      process.stdout.write(USAGE);
      break;
    default:
      process.stderr.write(`Unknown command "${command}".\n\n${USAGE}`);
      process.exitCode = 1;
  }
};

main().catch((err) => {
  process.stderr.write(`[posters] error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exitCode = 1;
});
