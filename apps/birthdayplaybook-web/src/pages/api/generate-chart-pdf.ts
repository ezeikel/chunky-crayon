import type { APIRoute } from "astro";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import QRCode from "qrcode";
import { PartyPlanDocument } from "../../lib/pdf/partyPlanDocument";
import { resolveEmojiToDataUrl } from "@one-colored-pixel/satellite-shared/pdf/twemoji";
import {
  PARTY_LENGTHS,
  THEME_KEYS,
  buildInviteWording,
  getTheme,
  type PartyLength,
  type PartyPlanConfig,
} from "../../components/PartyPlanner/types";

export const prerender = false;

const CC_REWARD_URL =
  "https://chunkycrayon.com/?utm_source=birthdayplaybook&utm_medium=pdf_reward&utm_campaign=party_plan_pdf";

const REWARD_EMOJI = "🎉";

const isString = (value: unknown): value is string => typeof value === "string";

const sanitizeConfig = (raw: unknown): PartyPlanConfig | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  if (!isString(candidate.childName) || !isString(candidate.themeKey)) {
    return null;
  }
  // Whitelist theme; default to the first curated theme.
  const themeKey = THEME_KEYS.includes(candidate.themeKey)
    ? candidate.themeKey
    : THEME_KEYS[0];
  // Clamp age to a sensible kid range; default 5.
  const rawAge = Math.round(Number(candidate.age));
  const age = Number.isFinite(rawAge) ? Math.min(12, Math.max(1, rawAge)) : 5;
  // Whitelist party length; default 2h.
  const partyLength = (PARTY_LENGTHS as readonly string[]).includes(
    candidate.partyLength as string,
  )
    ? (candidate.partyLength as PartyLength)
    : "2h";
  return {
    childName: candidate.childName.slice(0, 40),
    age,
    themeKey,
    partyLength,
  };
};

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const config = sanitizeConfig(body);
  if (!config) {
    return new Response(JSON.stringify({ error: "Invalid party config" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const theme = getTheme(config.themeKey);
  const checklist = [...theme.decor, ...theme.food, ...theme.activities];
  const invite = buildInviteWording(config.childName, config.age, theme.label);

  const [qrDataUrl, themeEmojiDataUrl, rewardEmojiDataUrl] = await Promise.all([
    QRCode.toDataURL(CC_REWARD_URL, {
      margin: 1,
      width: 400,
      color: { dark: "#0f172a", light: "#ffffff" },
    }),
    resolveEmojiToDataUrl(theme.emoji),
    resolveEmojiToDataUrl(REWARD_EMOJI),
  ]);

  const pdfBuffer = await renderToBuffer(
    createElement(PartyPlanDocument, {
      childName: config.childName,
      age: config.age,
      themeLabel: theme.label,
      partyLength: config.partyLength,
      checklist,
      invite,
      stations: theme.stations,
      qrDataUrl,
      themeEmojiDataUrl,
      rewardEmojiDataUrl,
    }),
  );

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=party-plan.pdf",
      "Cache-Control": "no-store",
    },
  });
};
