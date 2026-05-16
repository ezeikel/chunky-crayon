import type { APIRoute } from "astro";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import QRCode from "qrcode";
import { ChartDocument, type ResolvedRow } from "../../lib/pdf/chartDocument";
import { resolveEmojiToDataUrl } from "@one-colored-pixel/satellite-shared/pdf/twemoji";
import type {
  ChartConfig,
  ChartRow,
} from "../../components/ChartBuilder/types";

export const prerender = false;

const CC_REWARD_URL =
  "https://chunkycrayon.com/?utm_source=routinecharts&utm_medium=pdf_reward&utm_campaign=chart_pdf";

const REWARD_EMOJI = "🎉";

const isString = (value: unknown): value is string => typeof value === "string";

const sanitizeRow = (raw: unknown): ChartRow | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  if (
    !isString(candidate.id) ||
    !isString(candidate.label) ||
    !isString(candidate.icon) ||
    !isString(candidate.time)
  ) {
    return null;
  }
  return {
    id: candidate.id,
    label: candidate.label.slice(0, 80),
    icon: candidate.icon.slice(0, 8),
    time: candidate.time.slice(0, 20),
  };
};

const sanitizeConfig = (raw: unknown): ChartConfig | null => {
  if (typeof raw !== "object" || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  if (
    !isString(candidate.childName) ||
    !isString(candidate.title) ||
    !Array.isArray(candidate.rows)
  ) {
    return null;
  }
  const rows = candidate.rows
    .map(sanitizeRow)
    .filter((row): row is ChartRow => row !== null)
    .slice(0, 30);
  if (rows.length === 0) return null;
  return {
    childName: candidate.childName.slice(0, 40),
    title: candidate.title.slice(0, 60) || "My Routine",
    rows,
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

  const [resolvedRows, qrDataUrl, rewardEmojiDataUrl] = await Promise.all([
    Promise.all(
      config.rows.map(async (row): Promise<ResolvedRow> => {
        const iconDataUrl = await resolveEmojiToDataUrl(row.icon);
        return {
          id: row.id,
          label: row.label,
          time: row.time,
          iconDataUrl,
        };
      }),
    ),
    QRCode.toDataURL(CC_REWARD_URL, {
      margin: 1,
      width: 400,
      color: { dark: "#0f172a", light: "#ffffff" },
    }),
    resolveEmojiToDataUrl(REWARD_EMOJI),
  ]);

  const pdfBuffer = await renderToBuffer(
    createElement(ChartDocument, {
      title: config.title,
      childName: config.childName,
      rows: resolvedRows,
      qrDataUrl,
      rewardEmojiDataUrl,
    }),
  );

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=routine-chart.pdf",
      "Cache-Control": "no-store",
    },
  });
};
