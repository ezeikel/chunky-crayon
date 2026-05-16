import type { APIRoute } from "astro";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import QRCode from "qrcode";
import { StickerChartDocument } from "../../lib/pdf/stickerChartDocument";
import { resolveEmojiToDataUrl } from "@one-colored-pixel/satellite-shared/pdf/twemoji";
import {
  SLOT_OPTIONS,
  type StickerChartConfig,
} from "../../components/StickerChart/types";

export const prerender = false;

const CC_REWARD_URL =
  "https://chunkycrayon.com/?utm_source=stickerchartmaker&utm_medium=pdf_reward&utm_campaign=chart_pdf";

const REWARD_EMOJI = "🎉";

const isString = (value: unknown): value is string => typeof value === "string";

const sanitizeConfig = (raw: unknown): StickerChartConfig | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  if (
    !isString(candidate.childName) ||
    !isString(candidate.goal) ||
    !isString(candidate.reward)
  ) {
    return null;
  }
  // Clamp slot count to one of the allowed options; default 10.
  const rawSlots = Number(candidate.slots);
  const slots = (SLOT_OPTIONS as readonly number[]).includes(rawSlots)
    ? (rawSlots as StickerChartConfig["slots"])
    : 10;
  return {
    childName: candidate.childName.slice(0, 40),
    goal: candidate.goal.slice(0, 120) || "My sticker chart",
    slots,
    reward: candidate.reward.slice(0, 120) || "Pick a reward",
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
    return new Response(JSON.stringify({ error: "Invalid chart config" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const [qrDataUrl, rewardEmojiDataUrl] = await Promise.all([
    QRCode.toDataURL(CC_REWARD_URL, {
      margin: 1,
      width: 400,
      color: { dark: "#0f172a", light: "#ffffff" },
    }),
    resolveEmojiToDataUrl(REWARD_EMOJI),
  ]);

  const pdfBuffer = await renderToBuffer(
    createElement(StickerChartDocument, {
      goal: config.goal,
      childName: config.childName,
      slots: config.slots,
      reward: config.reward,
      qrDataUrl,
      rewardEmojiDataUrl,
    }),
  );

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=sticker-chart.pdf",
      "Cache-Control": "no-store",
    },
  });
};
