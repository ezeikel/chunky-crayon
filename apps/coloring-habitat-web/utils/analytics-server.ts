import { captureServerEvent } from "@/lib/posthog-server";

export function track(event: string, properties?: Record<string, unknown>) {
  captureServerEvent("server", event, properties);
}

export function trackWithUser(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  captureServerEvent(userId, event, properties);
}

export function trackServerEvent(..._args: unknown[]) {}
