import { NextResponse } from "next/server";
import { db } from "@one-colored-pixel/db";
import { getUserId } from "@/app/actions/user";
import { ACTIONS } from "@/constants";

export const maxDuration = 600;

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * SSE passthrough — see CC version at
 * `apps/chunky-crayon-web/app/api/coloring-image/[id]/events/route.ts`
 * for the full design rationale.
 */
export const GET = async (
  request: Request,
  { params }: RouteContext,
): Promise<Response> => {
  const userId = await getUserId(ACTIONS.CREATE_COLORING_IMAGE);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const row = await db.coloringImage.findUnique({
    where: { id },
    select: { userId: true, status: true },
  });
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.userId !== userId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const workerUrl = process.env.CHUNKY_CRAYON_WORKER_URL;
  const workerSecret = process.env.WORKER_SECRET;
  if (!workerUrl) {
    return NextResponse.json(
      { error: "CHUNKY_CRAYON_WORKER_URL not set" },
      { status: 500 },
    );
  }

  const upstream = await fetch(
    `${workerUrl}/sse/coloring-image/${encodeURIComponent(id)}`,
    {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        ...(workerSecret ? { Authorization: `Bearer ${workerSecret}` } : {}),
      },
      signal: request.signal,
    },
  );

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: "worker_sse_failed",
        status: upstream.status,
        body: text.slice(0, 300),
      },
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
