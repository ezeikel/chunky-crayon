"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  RegionStoreJson,
  PaletteVariant,
} from "@one-colored-pixel/coloring-core";
import { regenerateRegionStoreDev } from "./regenerate";

const PALETTE_VARIANTS: PaletteVariant[] = [
  "realistic",
  "pastel",
  "cute",
  "surprise",
];

type Props = {
  id: string;
  title: string;
  svgUrl: string;
  regionMapUrl: string;
  regionMapWidth: number;
  regionMapHeight: number;
  regionsJson: RegionStoreJson;
};

type LoadState =
  | { status: "loading"; message: string }
  | { status: "ready"; pixelToRegion: Uint16Array; compressedBytes: number }
  | { status: "error"; error: string };

const hexToRgb = (hex: string): [number, number, number] => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [128, 128, 128];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
};

/**
 * Decompress a gzipped ArrayBuffer into a Uint8Array using DecompressionStream.
 * Works on modern browsers (Chrome 80+, Safari 16.4+, Firefox 113+).
 */
const gunzipToBytes = async (gzipBuffer: ArrayBuffer): Promise<Uint8Array> => {
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([gzipBuffer]).stream().pipeThrough(ds);
  const decompressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(decompressed);
};

const RegionStoreViewer = ({
  id,
  title,
  svgUrl,
  regionMapUrl,
  regionMapWidth,
  regionMapHeight,
  regionsJson,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const [isRegenerating, startRegenerate] = useTransition();
  const [regenerateMessage, setRegenerateMessage] = useState<string | null>(
    null,
  );
  const [loadState, setLoadState] = useState<LoadState>({
    status: "loading",
    message: "Fetching regionMapUrl...",
  });
  const [variant, setVariant] = useState<PaletteVariant>("realistic");
  const [hoverRegionId, setHoverRegionId] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const handleRegenerate = () => {
    setRegenerateMessage("Running pipeline — this takes ~60s...");
    startRegenerate(async () => {
      try {
        const result = await regenerateRegionStoreDev(id);
        setRegenerateMessage(result.message);
        if (result.success) {
          // Reload the server component data so we re-read regionsJson
          router.refresh();
        }
      } catch (err) {
        setRegenerateMessage(
          err instanceof Error ? err.message : "Unknown error",
        );
      }
    });
  };

  // Build region-id → region lookup once
  const regionById = useMemo(() => {
    const map = new Map<number, RegionStoreJson["regions"][number]>();
    for (const r of regionsJson.regions) map.set(r.id, r);
    return map;
  }, [regionsJson]);

  // Sorted-by-size view for the stats sidebar
  const topRegions = useMemo(
    () =>
      [...regionsJson.regions]
        .sort((a, b) => b.pixelCount - a.pixelCount)
        .slice(0, 15),
    [regionsJson],
  );

  // --- Step 1: fetch + decompress the gzipped region map -------------------
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoadState({
          status: "loading",
          message: "Fetching regionMapUrl...",
        });
        // Cache-bust with the regionsGeneratedAt-equivalent via a timestamp,
        // plus explicit no-store to dodge Chrome's aggressive R2 blob cache.
        // Without this, regenerating the region store shows stale pixel data
        // even though regionsJson is fresh, and you waste time thinking the
        // pipeline is broken when it's just a cache hit.
        const response = await fetch(`${regionMapUrl}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status}`);
        }
        const gzipBuffer = await response.arrayBuffer();
        const compressedBytes = gzipBuffer.byteLength;

        if (cancelled) return;
        setLoadState({
          status: "loading",
          message: `Decompressing ${compressedBytes} bytes...`,
        });

        const bytes = await gunzipToBytes(gzipBuffer);
        if (cancelled) return;

        const expectedBytes = regionMapWidth * regionMapHeight * 2;
        if (bytes.byteLength !== expectedBytes) {
          throw new Error(
            `Decompressed size mismatch: got ${bytes.byteLength}, expected ${expectedBytes}`,
          );
        }

        // Wrap the decompressed bytes as a Uint16Array. Node is little-endian
        // and so is every modern browser, so the raw bytes map directly.
        const pixelToRegion = new Uint16Array(
          bytes.buffer,
          bytes.byteOffset,
          bytes.byteLength / 2,
        );

        setLoadState({ status: "ready", pixelToRegion, compressedBytes });
      } catch (error) {
        if (cancelled) return;
        setLoadState({
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [regionMapUrl, regionMapWidth, regionMapHeight]);

  // --- Step 2: render the region map to canvas whenever data or variant change
  useEffect(() => {
    if (loadState.status !== "ready") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = regionMapWidth;
    canvas.height = regionMapHeight;

    const imageData = ctx.createImageData(regionMapWidth, regionMapHeight);
    const data = imageData.data;
    const { pixelToRegion } = loadState;

    // Precompute RGB per region for speed
    const rgbByRegion = new Map<number, [number, number, number]>();
    for (const region of regionsJson.regions) {
      const hex = region.palettes[variant]?.hex ?? "#888888";
      rgbByRegion.set(region.id, hexToRgb(hex));
    }

    for (let i = 0; i < pixelToRegion.length; i++) {
      const regionId = pixelToRegion[i];
      const rgb = rgbByRegion.get(regionId);
      const p = i * 4;
      if (rgb) {
        data[p] = rgb[0];
        data[p + 1] = rgb[1];
        data[p + 2] = rgb[2];
        data[p + 3] = 255;
      } else {
        // Boundary pixel (regionId 0) or unassigned — transparent
        data[p] = 255;
        data[p + 1] = 255;
        data[p + 2] = 255;
        data[p + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [loadState, variant, regionsJson, regionMapWidth, regionMapHeight]);

  // --- Step 3: hover → region lookup ---------------------------------------
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (loadState.status !== "ready") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;

    // Translate CSS → canvas pixel coordinates
    const canvasX = Math.floor((cssX / rect.width) * regionMapWidth);
    const canvasY = Math.floor((cssY / rect.height) * regionMapHeight);
    if (
      canvasX < 0 ||
      canvasX >= regionMapWidth ||
      canvasY < 0 ||
      canvasY >= regionMapHeight
    ) {
      setHoverRegionId(null);
      return;
    }

    const idx = canvasY * regionMapWidth + canvasX;
    const regionId = loadState.pixelToRegion[idx];
    setHoverRegionId(regionId === 0 ? null : regionId);
    setHoverPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoverRegionId(null);
    setHoverPos(null);
  };

  const hoverRegion =
    hoverRegionId != null ? regionById.get(hoverRegionId) : null;
  const totalPixels = regionMapWidth * regionMapHeight;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-mono">
      <div className="max-w-[1600px] mx-auto p-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Region Store Debug</h1>
            <p className="text-sm text-neutral-400 mt-1">
              {title} · {id}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Scene: {regionsJson.sceneDescription}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white text-xs font-bold rounded"
            >
              {isRegenerating ? "Regenerating…" : "Regenerate region store"}
            </button>
            {regenerateMessage && (
              <div className="text-xs text-neutral-400 max-w-xs text-right">
                {regenerateMessage}
              </div>
            )}
          </div>
        </header>

        <div className="flex gap-6">
          {/* Canvas + SVG overlay */}
          <div className="flex-1">
            <div className="flex gap-2 mb-3">
              {PALETTE_VARIANTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVariant(v)}
                  className={`px-3 py-1.5 text-xs rounded ${
                    variant === v
                      ? "bg-orange-500 text-white"
                      : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {loadState.status === "loading" && (
              <div className="aspect-square bg-neutral-900 rounded flex items-center justify-center text-neutral-500">
                {loadState.message}
              </div>
            )}

            {loadState.status === "error" && (
              <div className="aspect-square bg-red-950 rounded flex items-center justify-center text-red-300 p-8">
                Error: {loadState.error}
              </div>
            )}

            {loadState.status === "ready" && (
              <div
                className="relative aspect-square bg-white rounded overflow-hidden border border-neutral-800"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  style={{ imageRendering: "pixelated" }}
                />
                {/* Line art overlaid semi-transparent so regions and lines both show */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={svgUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ mixBlendMode: "multiply" }}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-96 space-y-4 text-xs">
            <div className="bg-neutral-900 rounded p-3 space-y-1">
              <div className="text-neutral-400 uppercase tracking-wide text-[10px]">
                Region map
              </div>
              <div>
                Dimensions: {regionMapWidth}×{regionMapHeight}
              </div>
              <div>Total pixels: {totalPixels.toLocaleString()}</div>
              <div>
                Region pixels: {regionsJson.regionPixelCount.toLocaleString()} (
                {((regionsJson.regionPixelCount / totalPixels) * 100).toFixed(
                  1,
                )}
                %)
              </div>
              <div>Regions detected: {regionsJson.regions.length}</div>
              {loadState.status === "ready" && (
                <div>
                  Gzipped: {loadState.compressedBytes.toLocaleString()} bytes (
                  {(
                    (loadState.compressedBytes / (totalPixels * 2)) *
                    100
                  ).toFixed(1)}
                  %)
                </div>
              )}
            </div>

            <div className="bg-neutral-900 rounded p-3">
              <div className="text-neutral-400 uppercase tracking-wide text-[10px] mb-2">
                Top 15 regions
              </div>
              <div className="space-y-1">
                {topRegions.map((r) => {
                  const pct = ((r.pixelCount / totalPixels) * 100).toFixed(1);
                  const isHovered = r.id === hoverRegionId;
                  return (
                    <div
                      key={r.id}
                      className={`flex items-center gap-2 ${
                        isHovered ? "bg-neutral-800" : ""
                      } rounded px-1 py-0.5`}
                    >
                      <div
                        className="w-3 h-3 rounded-sm border border-neutral-700"
                        style={{ background: r.palettes[variant].hex }}
                      />
                      <div className="flex-1 truncate">
                        #{r.id} {r.label}
                      </div>
                      <div className="text-neutral-500">{pct}%</div>
                    </div>
                  );
                })}
                {regionsJson.regions.length > 15 && (
                  <div className="text-neutral-500 pt-1">
                    + {regionsJson.regions.length - 15} more
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoverRegion && hoverPos && (
        <div
          className="fixed pointer-events-none bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-xs shadow-lg z-50"
          style={{ left: hoverPos.x + 16, top: hoverPos.y + 16 }}
        >
          <div className="font-bold mb-1">
            #{hoverRegion.id} · {hoverRegion.label}
          </div>
          {hoverRegion.objectGroup &&
            hoverRegion.objectGroup !== hoverRegion.label && (
              <div className="text-neutral-500 mb-1">
                group: {hoverRegion.objectGroup}
              </div>
            )}
          <div className="text-neutral-400 mb-2">
            {hoverRegion.pixelCount.toLocaleString()} px
          </div>
          <div className="space-y-0.5">
            {PALETTE_VARIANTS.map((v) => {
              const entry = hoverRegion.palettes[v];
              return (
                <div key={v} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm border border-neutral-700"
                    style={{ background: entry.hex }}
                  />
                  <div className="text-neutral-300 w-16">{v}</div>
                  <div className="text-neutral-500">
                    {entry.hex} {entry.colorName}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionStoreViewer;
