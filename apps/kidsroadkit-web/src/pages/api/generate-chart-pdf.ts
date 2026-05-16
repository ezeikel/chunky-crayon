import type { APIRoute } from "astro";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import QRCode from "qrcode";
import { RoadKitDocument } from "../../lib/pdf/roadKitDocument";
import { resolveEmojiToDataUrl } from "@one-colored-pixel/satellite-shared/pdf/twemoji";
import {
  AGE_BANDS,
  AGE_BAND_KEYS,
  MAX_KIDS,
  MIN_KIDS,
  TRIP_LENGTHS,
  TRIP_LENGTH_KEYS,
  buildPack,
  type AgeBandKey,
  type RoadKitConfig,
  type TripLengthKey,
} from "../../components/RoadKit/types";

export const prerender = false;

const CC_REWARD_URL =
  "https://chunkycrayon.com/?utm_source=kidsroadkit&utm_medium=pdf_reward&utm_campaign=road_kit_pdf";

const REWARD_EMOJI = "🎉";

const sanitizeConfig = (raw: unknown): RoadKitConfig | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  // Whitelist age band; default to the middle band.
  const ageBand = AGE_BAND_KEYS.includes(candidate.ageBand as string)
    ? (candidate.ageBand as AgeBandKey)
    : "6-8";
  // Whitelist trip length; default 1 to 3 hours.
  const tripLength = TRIP_LENGTH_KEYS.includes(candidate.tripLength as string)
    ? (candidate.tripLength as TripLengthKey)
    : "1-3h";
  // Clamp kids count to the allowed range; default 2.
  const rawKids = Math.round(Number(candidate.kids));
  const kids = Number.isFinite(rawKids)
    ? Math.min(MAX_KIDS, Math.max(MIN_KIDS, rawKids))
    : 2;
  return { ageBand, tripLength, kids };
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
    return new Response(JSON.stringify({ error: "Invalid pack config" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const games = buildPack(config.ageBand, config.tripLength);
  const ageLabel =
    AGE_BANDS.find((band) => band.key === config.ageBand)?.label ??
    config.ageBand;
  const tripLabel =
    TRIP_LENGTHS.find((trip) => trip.key === config.tripLength)?.label ??
    config.tripLength;

  const [qrDataUrl, rewardEmojiDataUrl] = await Promise.all([
    QRCode.toDataURL(CC_REWARD_URL, {
      margin: 1,
      width: 400,
      color: { dark: "#0f172a", light: "#ffffff" },
    }),
    resolveEmojiToDataUrl(REWARD_EMOJI),
  ]);

  const pdfBuffer = await renderToBuffer(
    createElement(RoadKitDocument, {
      tripLabel,
      ageLabel,
      games,
      qrDataUrl,
      rewardEmojiDataUrl,
    }),
  );

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=road-trip-activity-pack.pdf",
      "Cache-Control": "no-store",
    },
  });
};
