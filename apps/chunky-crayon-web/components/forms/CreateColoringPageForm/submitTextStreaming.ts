/**
 * Client-side SSE consumer for the text-input create flow.
 *
 * Posts to /api/coloring-image/generate-stream and reads the SSE response.
 * Calls onPartial() for each `partial` event, resolves with the new
 * coloringImageId on `final`, or with an error message on `error`.
 *
 * The promise stays pending while the SSE stream is open so that
 * <form>'s useFormStatus().pending remains true throughout the long wait.
 */
export type SubmitTextStreamingArgs = {
  description: string;
  locale: string;
  clientDistinctId: string | null;
  /** Called for each partial-image SSE event with the raw base64 PNG. */
  onPartial?: (b64: string, index: number) => void;
};

export type SubmitTextStreamingResult =
  | { id: string }
  | { error: string; credits?: number };

type ServerEvent =
  | { type: 'partial'; index: number; b64_json: string }
  | {
      type: 'final';
      coloringImageId: string;
      url?: string;
      svgUrl?: string;
    }
  | { type: 'error'; message: string };

/** Read a fetch ReadableStream and yield SSE events as parsed objects. */
async function* readSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerEvent, void, unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let blankIdx;
    while ((blankIdx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, blankIdx);
      buffer = buffer.slice(blankIdx + 2);

      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('data:')) {
          dataLine += line.slice(5).trimStart();
        }
      }
      if (!dataLine) continue;
      try {
        yield JSON.parse(dataLine) as ServerEvent;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[submitTextStreaming] failed to parse SSE block:', err);
      }
    }
  }
}

export const submitTextStreaming = async (
  args: SubmitTextStreamingArgs,
): Promise<SubmitTextStreamingResult> => {
  let resp: Response;
  try {
    resp = await fetch('/api/coloring-image/generate-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: args.description,
        locale: args.locale,
        clientDistinctId: args.clientDistinctId ?? undefined,
      }),
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'network_error',
    };
  }

  if (!resp.ok) {
    // Non-200 means the server didn't open a stream — usually auth or
    // credit error returned as JSON.
    let payload: { error?: string; credits?: number } = {};
    try {
      payload = (await resp.json()) as typeof payload;
    } catch {
      /* ignore */
    }
    return {
      error: payload.error ?? `HTTP ${resp.status}`,
      ...(typeof payload.credits === 'number'
        ? { credits: payload.credits }
        : {}),
    };
  }

  if (!resp.body) {
    return { error: 'empty_response_body' };
  }

  for await (const event of readSSE(resp.body)) {
    if (event.type === 'partial') {
      args.onPartial?.(event.b64_json, event.index);
      continue;
    }
    if (event.type === 'final') {
      return { id: event.coloringImageId };
    }
    if (event.type === 'error') {
      return { error: event.message };
    }
  }

  return { error: 'stream_ended_without_final' };
};
