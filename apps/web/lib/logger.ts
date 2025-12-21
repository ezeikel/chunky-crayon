import * as Sentry from '@sentry/nextjs';
import { track as vercelTrack } from '@vercel/analytics';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  page?: string;
  action?: string;
  userId?: string;
  coloringImageId?: string;
  description?: string;
  planName?: string;
  planInterval?: string;
  creditAmount?: number;
  color?: string;
  duration?: number;
  [key: string]: unknown;
};

// Module-level state
let posthogInstance: unknown = null;

export const setPostHog = (posthog: unknown) => {
  posthogInstance = posthog;
};

// Clean properties for Vercel Analytics (only string, number, boolean, null)
const cleanVercelProperties = (
  properties: Record<string, unknown>,
): Record<string, string | number | boolean | null> =>
  Object.entries(properties).reduce(
    (cleaned, [key, value]) => {
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        return { ...cleaned, [key]: value };
      }
      if (value !== undefined) {
        return { ...cleaned, [key]: String(value) };
      }
      return cleaned;
    },
    {} as Record<string, string | number | boolean | null>,
  );

const logToConsole = (
  level: LogLevel,
  message: string,
  context?: LogContext,
  err?: Error,
) => {
  if (process.env.NODE_ENV !== 'development') return;

  const prefix = `[${level.toUpperCase()}]`;
  const logFn = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }[level];
  // eslint-disable-next-line no-console
  logFn(prefix, message, context ?? '', err ?? '');
};

const logToPostHog = (
  level: LogLevel,
  message: string,
  context?: LogContext,
  err?: Error,
) => {
  try {
    let posthog = posthogInstance;
    if (!posthog && typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      posthog = (window as any).posthog;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (posthog && (posthog as any).__loaded) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (posthog as any).capture('log_entry', {
        log_level: level,
        log_message: message,
        log_error: err?.message,
        ...context,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to log to PostHog:', error);
    }
  }
};

const logToVercel = (
  level: LogLevel,
  message: string,
  context?: LogContext,
) => {
  try {
    vercelTrack(`log_${level}`, cleanVercelProperties({ message, ...context }));
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to log to Vercel:', err);
    }
  }
};

const logToSentry = (message: string, context?: LogContext, err?: Error) => {
  try {
    if (context) {
      Sentry.setContext('error_context', context);
      if (context.page) Sentry.setTag('page', context.page);
      if (context.action) Sentry.setTag('action', context.action);
      if (context.userId) Sentry.setUser({ id: context.userId });
    }

    if (err) {
      Sentry.captureException(err);
    } else {
      Sentry.captureMessage(message, 'error');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Failed to log to Sentry:', error);
    }
  }
};

// Main logging functions - logs go to PostHog and Vercel
export const debug = (message: string, context?: LogContext) => {
  logToConsole('debug', message, context);
  logToPostHog('debug', message, context);
  logToVercel('debug', message, context);
};

export const info = (message: string, context?: LogContext) => {
  logToConsole('info', message, context);
  logToPostHog('info', message, context);
  logToVercel('info', message, context);
};

export const warn = (message: string, context?: LogContext, err?: Error) => {
  logToConsole('warn', message, context, err);
  logToPostHog('warn', message, context, err);
  logToVercel('warn', message, context);
};

// Errors go to all three: PostHog, Vercel, AND Sentry
export const error = (message: string, context?: LogContext, err?: Error) => {
  logToConsole('error', message, context, err);
  logToPostHog('error', message, context, err);
  logToVercel('error', message, context);
  logToSentry(message, context, err); // Only errors go to Sentry
};

// Specialized error logging
export const apiError = (
  message: string,
  err?: Error,
  context?: LogContext,
) => {
  error(message, { error_type: 'api', ...context }, err);
};

export const imageGenerationError = (
  message: string,
  err?: Error,
  context?: LogContext,
) => {
  error(message, { error_type: 'image_generation', ...context }, err);
};

export const paymentError = (
  message: string,
  err?: Error,
  context?: LogContext,
) => {
  error(message, { error_type: 'payment', ...context }, err);
};

export const authError = (
  message: string,
  err?: Error,
  context?: LogContext,
) => {
  error(message, { error_type: 'auth', ...context }, err);
};

// Utility logging
export const logPerformance = (
  action: string,
  duration: number,
  context?: LogContext,
) => {
  info(`Performance: ${action}`, {
    action,
    performance_duration_ms: duration,
    ...context,
  });
};

export const logUserFlow = (step: string, context?: LogContext) => {
  info(`User flow: ${step}`, { user_flow_step: step, ...context });
};

// Helper to create scoped loggers
export const createScopedLogger = (baseContext: LogContext) => ({
  debug: (message: string, context?: LogContext) =>
    debug(message, { ...baseContext, ...context }),
  info: (message: string, context?: LogContext) =>
    info(message, { ...baseContext, ...context }),
  warn: (message: string, context?: LogContext, err?: Error) =>
    warn(message, { ...baseContext, ...context }, err),
  error: (message: string, context?: LogContext, err?: Error) =>
    error(message, { ...baseContext, ...context }, err),
});
