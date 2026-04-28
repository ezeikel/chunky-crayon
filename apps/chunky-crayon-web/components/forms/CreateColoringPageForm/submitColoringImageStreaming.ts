/**
 * Client-side SSE consumer for the create flow.
 *
 * Posts to /api/coloring-image/generate-stream and reads the SSE response.
 * Calls onPartial() for each `partial` event, resolves with the new
 * coloringImageId on `final`, or with an error message on `error`.
 *
 * The promise stays pending while the SSE stream is open so that
 * <form>'s useFormStatus().pending remains true throughout the long wait.
 *
 * Modes:
 *   - 'text':  description is the kid's typed prompt.
 *   - 'photo': photoBase64 is the kid's uploaded photo (as data URL or
 *              raw base64). Photo mode skips style refs server-side.
 *   - 'voice': firstAnswer + secondAnswer are the two voice answers.
 *              Server concatenates them into a description.
 */
export type SubmitStreamingArgs =
  | {
      mode: 'text';
      description: string;
      locale: string;
      clientDistinctId: string | null;
      onPartial?: (b64: string, index: number) => void;
    }
  | {
      mode: 'photo';
      photoBase64: string;
      locale: string;
      clientDistinctId: string | null;
      onPartial?: (b64: string, index: number) => void;
    }
  | {
      mode: 'voice';
      firstAnswer: string;
      secondAnswer: string;
      locale: string;
      clientDistinctId: string | null;
      onPartial?: (b64: string, index: number) => void;
    };

export type SubmitStreamingResult =
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
        console.warn('[submitStreaming] failed to parse SSE block:', err);
      }
    }
  }
}

const buildPayload = (args: SubmitStreamingArgs): Record<string, unknown> => {
  const base = {
    mode: args.mode,
    locale: args.locale,
    clientDistinctId: args.clientDistinctId ?? undefined,
  };
  if (args.mode === 'text') {
    return { ...base, description: args.description };
  }
  if (args.mode === 'photo') {
    return { ...base, photoBase64: args.photoBase64 };
  }
  // voice
  return {
    ...base,
    firstAnswer: args.firstAnswer,
    secondAnswer: args.secondAnswer,
  };
};

export const submitColoringImageStreaming = async (
  args: SubmitStreamingArgs,
): Promise<SubmitStreamingResult> => {
  let resp: Response;
  try {
    resp = await fetch('/api/coloring-image/generate-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(args)),
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
