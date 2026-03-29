import { captureServerEvent } from "@/lib/posthog-server";

export async function track(
  event: string,
  properties?: Record<string, unknown>,
) {
  await captureServerEvent("server", event, properties);
}

export async function trackWithUser(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  await captureServerEvent(userId, event, properties);
}

export function trackServerEvent(..._args: unknown[]) {}
