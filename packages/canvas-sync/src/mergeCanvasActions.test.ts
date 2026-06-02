import { describe, it, expect } from "vitest";
import {
  mergeCanvasActions,
  makeActionId,
  canonicalLegacyId,
  sanitizeWireActions,
  SKEW_WINDOW_MS,
} from "./mergeCanvasActions";
import type { CanvasAction } from "./canvas-types";

// ---------------------------------------------------------------------------
// Test factories. Every action carries a stable id + timestamp + (optionally)
// seq + originDeviceId, mirroring what the clients stamp at creation.
// ---------------------------------------------------------------------------

const DEV_A = "device-aaaaaaaa";
const DEV_B = "device-bbbbbbbb";

let idCounter = 0;
const nextId = () =>
  `11111111-1111-4111-8111-${String(idCounter++).padStart(12, "0")}`;

const stroke = (
  ts: number,
  opts: { id?: string; seq?: number; device?: string; path?: string } = {},
): CanvasAction => ({
  id: opts.id ?? nextId(),
  type: "stroke",
  timestamp: ts,
  data: {
    path: opts.path ?? `M0 0 L${ts} ${ts}`,
    color: "#000000",
    brushType: "crayon",
    seq: opts.seq,
    originDeviceId: opts.device,
  },
});

const auto = (
  ts: number,
  opts: { id?: string; seq?: number; device?: string } = {},
): CanvasAction => ({
  id: opts.id ?? nextId(),
  type: "region",
  timestamp: ts,
  data: {
    mode: "auto",
    variant: "realistic",
    seq: opts.seq,
    originDeviceId: opts.device,
  },
});

const reveal = (
  ts: number,
  opts: { id?: string; device?: string } = {},
): CanvasAction => ({
  id: opts.id ?? nextId(),
  type: "region",
  timestamp: ts,
  data: {
    mode: "reveal",
    variant: "realistic",
    path: `M0 0 L${ts} ${ts}`,
    originDeviceId: opts.device,
  },
});

const clear = (
  ts: number,
  opts: { id?: string; device?: string } = {},
): CanvasAction => ({
  id: opts.id ?? nextId(),
  type: "clear",
  timestamp: ts,
  data: { originDeviceId: opts.device },
});

const ids = (arr: CanvasAction[]) => arr.map((a) => a.id);
const types = (arr: CanvasAction[]) => arr.map((a) => a.type);

describe("makeActionId", () => {
  it("produces UUID-v4-shaped ids", () => {
    const id = makeActionId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
  it("does not repeat across many calls", () => {
    const set = new Set(Array.from({ length: 1000 }, () => makeActionId()));
    expect(set.size).toBe(1000);
  });
});

describe("mergeCanvasActions — dedup by id", () => {
  it("dedups same-id action, local wins on divergent data", () => {
    const a = stroke(10, { id: "shared-1", path: "REMOTE" });
    const aLocal = { ...a, data: { ...a.data, path: "LOCAL" } };
    const b = stroke(20, { id: "b" });
    const c = stroke(30, { id: "c" });
    const merged = mergeCanvasActions([aLocal, b], [a, c]);
    expect(ids(merged)).toEqual(["shared-1", "b", "c"]);
    expect(merged[0].data.path).toBe("LOCAL"); // local overlay wins
  });

  it("same logical action with same UUID dedups to one (no index-suffix dup)", () => {
    const a = stroke(10, { id: "44444444-4444-4444-4444-444444444444" });
    const merged = mergeCanvasActions([a], [a]);
    expect(merged).toHaveLength(1);
  });

  it("two DIFFERENT actions at same timestamp+seq are BOTH kept", () => {
    // exactly the case the legacy `action-<ts>-<index>` scheme would clobber
    const a = stroke(10, { id: "id-a", seq: 0, device: DEV_A });
    const b = stroke(10, { id: "id-b", seq: 0, device: DEV_B });
    const merged = mergeCanvasActions([a], [b]);
    expect(merged).toHaveLength(2);
  });
});

describe("mergeCanvasActions — ordering", () => {
  it("sorts by (timestamp, seq, id) and is order-independent of input", () => {
    const a = stroke(10, { id: "a", seq: 1 });
    const b = stroke(10, { id: "b", seq: 0 }); // earlier seq → before a
    const c = stroke(20, { id: "c" });
    const one = mergeCanvasActions([c, a], [b]);
    const two = mergeCanvasActions([a], [b, c]);
    expect(ids(one)).toEqual(["b", "a", "c"]);
    expect(ids(two)).toEqual(ids(one)); // deterministic regardless of input order
  });
});

describe("mergeCanvasActions — terminal collapse (same device)", () => {
  it("case A: [stroke@10, auto@20] + [stroke@10, stroke@30] → [auto@20, stroke@30]", () => {
    const s10 = stroke(10, { id: "s10", device: DEV_A });
    const a20 = auto(20, { id: "a20", device: DEV_A });
    const s30 = stroke(30, { id: "s30", device: DEV_A });
    const merged = mergeCanvasActions([s10, s30], [s10, a20]);
    expect(ids(merged)).toEqual(["a20", "s30"]); // s10 dropped, s30 on top
  });

  it("a stroke created AFTER a terminal survives on top", () => {
    const a100 = auto(100, { id: "a100", device: DEV_A });
    const s110 = stroke(110, { id: "s110", device: DEV_A });
    const merged = mergeCanvasActions([s110], [a100]);
    expect(ids(merged)).toEqual(["a100", "s110"]);
  });

  it("two terminals: later auto wins as the collapse point", () => {
    const a100 = auto(100, { id: "a100", device: DEV_A });
    const a120 = auto(120, { id: "a120", device: DEV_A });
    const merged = mergeCanvasActions([a120], [a100]);
    expect(ids(merged)).toEqual(["a120"]); // a100 dropped
  });

  it("clear is terminal: a later clear collapses earlier work", () => {
    const s10 = stroke(10, { id: "s10", device: DEV_A });
    const c20 = clear(20, { id: "c20", device: DEV_A });
    const merged = mergeCanvasActions([c20], [s10]);
    expect(ids(merged)).toEqual(["c20"]);
  });

  it("an EARLIER clear does NOT nuke a later stroke", () => {
    const c5 = clear(5, { id: "c5", device: DEV_A });
    const s40 = stroke(40, { id: "s40", device: DEV_A });
    const merged = mergeCanvasActions([s40], [c5]);
    expect(ids(merged)).toEqual(["c5", "s40"]); // s40 is after the clear → kept
  });
});

describe("mergeCanvasActions — skew guard (cross device)", () => {
  it("fast-clock auto does NOT eat a correct-clock cross-device stroke within the skew window", () => {
    const autoFast = auto(100000, { id: "autoFast", device: DEV_A });
    const strokeSlow = stroke(100000 - 500, { id: "sSlow", device: DEV_B }); // 500ms before, < window
    const merged = mergeCanvasActions([strokeSlow], [autoFast]);
    // cross-device, within skew window → kept, floated on top of the terminal
    expect(ids(merged)).toEqual(["autoFast", "sSlow"]);
  });

  it("same scenario but SAME device → stroke is correctly dropped", () => {
    const autoFast = auto(100000, { id: "autoFast", device: DEV_A });
    const strokeSame = stroke(100000 - 500, { id: "sSame", device: DEV_A });
    const merged = mergeCanvasActions([strokeSame], [autoFast]);
    expect(ids(merged)).toEqual(["autoFast"]);
  });

  it("cross-device stroke OLDER than the skew window IS dropped", () => {
    const autoTs = 100000;
    const autoFast = auto(autoTs, { id: "autoFast", device: DEV_A });
    const strokeOld = stroke(autoTs - SKEW_WINDOW_MS - 1, {
      id: "sOld",
      device: DEV_B,
    });
    const merged = mergeCanvasActions([strokeOld], [autoFast]);
    expect(ids(merged)).toEqual(["autoFast"]);
  });
});

describe("mergeCanvasActions — same-ms terminal race", () => {
  it("same-ms stroke with larger seq sorts AFTER the terminal and survives", () => {
    const a = auto(50, { id: "auto-zzz", seq: 0, device: DEV_A });
    const s = stroke(50, { id: "stroke-aaa", seq: 1, device: DEV_A }); // smaller id, but larger seq
    const merged = mergeCanvasActions([s], [a]);
    // seq breaks the tie before id → stroke is after the auto → survives
    expect(ids(merged)).toEqual(["auto-zzz", "stroke-aaa"]);
  });
});

describe("mergeCanvasActions — reveal is non-terminal", () => {
  it("a Magic Brush reveal does NOT collapse prior hand-coloring", () => {
    const s10 = stroke(10, { id: "s10", device: DEV_A });
    const r20 = reveal(20, { id: "r20", device: DEV_A });
    const merged = mergeCanvasActions([], [s10, r20]);
    expect(ids(merged)).toEqual(["s10", "r20"]); // nothing collapsed
  });
});

describe("sanitize / legacy", () => {
  it("strips snapshot and stray entries from the wire array", () => {
    const snap = {
      id: "snap",
      type: "snapshot",
      timestamp: 5,
      data: {},
    } as unknown as CanvasAction;
    const s = stroke(10, { id: "s" });
    const merged = mergeCanvasActions([], [snap, s]);
    expect(ids(merged)).toEqual(["s"]);
  });

  it("folds legacy magic-fill → region/auto and treats it as terminal", () => {
    const mf = {
      id: "mf",
      type: "magic-fill",
      timestamp: 20,
      data: {
        magicFills: [{ x: 1, y: 1, color: "#f00" }],
        originDeviceId: DEV_A,
      },
    } as unknown as CanvasAction;
    const s10 = stroke(10, { id: "s10", device: DEV_A });
    const s30 = stroke(30, { id: "s30", device: DEV_A });
    const merged = mergeCanvasActions([s30], [s10, mf]);
    expect(types(merged)).toEqual(["region", "stroke"]); // mf folded to region/auto, terminal
    expect(merged[0].data.mode).toBe("auto");
    expect(ids(merged)).toEqual(["mf", "s30"]); // s10 collapsed under the folded auto
  });

  it("canonicalLegacyId is stable across differing data key orders (cross-client)", () => {
    const webFill = {
      id: "",
      type: "fill",
      timestamp: 10,
      data: {
        x: 5,
        y: 6,
        fillColor: "#00f",
        color: "#00f",
        patternType: "dots",
      },
    } as unknown as CanvasAction;
    const mobileFill = {
      id: "",
      type: "fill",
      timestamp: 10,
      data: { fillColor: "#00f", y: 6, x: 5, fillType: "solid" },
    } as unknown as CanvasAction;
    expect(canonicalLegacyId(webFill)).toBe(canonicalLegacyId(mobileFill));
  });

  it("dedups the same legacy fill serialized differently by web vs mobile", () => {
    const webFill = {
      id: "",
      type: "fill",
      timestamp: 10,
      data: { x: 5, y: 6, fillColor: "#00f", color: "#00f" },
    } as unknown as CanvasAction;
    const mobileFill = {
      id: "",
      type: "fill",
      timestamp: 10,
      data: { fillColor: "#00f", y: 6, x: 5 },
    } as unknown as CanvasAction;
    const merged = mergeCanvasActions([webFill], [mobileFill]);
    expect(merged).toHaveLength(1);
  });

  it("normalizes a legacy positional id so an index-drifted copy dedups", () => {
    const orig = {
      id: "action-1717-3",
      type: "stroke",
      timestamp: 1717,
      data: { path: "P", color: "#000", brushType: "crayon" },
    } as unknown as CanvasAction;
    // same logical stroke, index drifted to 2 after a trim/undo
    const drifted = { ...orig, id: "action-1717-2" };
    const merged = mergeCanvasActions([drifted], [orig]);
    expect(merged).toHaveLength(1); // both normalized to the same content id
  });
});

describe("mergeCanvasActions — empties & idempotence", () => {
  it("merge(local, []) collapses local alone", () => {
    const s10 = stroke(10, { id: "s10", device: DEV_A });
    const a20 = auto(20, { id: "a20", device: DEV_A });
    const merged = mergeCanvasActions([s10, a20], []);
    expect(ids(merged)).toEqual(["a20"]);
  });

  it("merge([], remote) adopts the server state", () => {
    const s = stroke(10, { id: "s" });
    expect(ids(mergeCanvasActions([], [s]))).toEqual(["s"]);
  });

  it("is idempotent: merge(local, merge(local, remote)) === merge(local, remote)", () => {
    const s10 = stroke(10, { id: "s10", device: DEV_A });
    const a20 = auto(20, { id: "a20", device: DEV_A });
    const s30 = stroke(30, { id: "s30", device: DEV_B }); // cross-device after the auto
    const sSkew = stroke(20 - 100, { id: "sSkew", device: DEV_B }); // cross-device, in skew window
    const local = [s10, s30];
    const remote = [s10, a20, sSkew];
    const once = mergeCanvasActions(local, remote);
    const twice = mergeCanvasActions(local, once);
    expect(twice).toEqual(once);
  });

  it("sanitizeWireActions keeps only the canonical wire types", () => {
    const snap = {
      id: "x",
      type: "snapshot",
      timestamp: 1,
      data: {},
    } as unknown as CanvasAction;
    const s = stroke(10, { id: "s" });
    const f = {
      id: "f",
      type: "fill",
      timestamp: 11,
      data: { x: 1, y: 1, fillColor: "#000" },
    } as CanvasAction;
    const out = sanitizeWireActions([snap, s, f]);
    expect(ids(out)).toEqual(["s", "f"]);
  });
});
