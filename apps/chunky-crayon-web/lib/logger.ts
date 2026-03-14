import * as Sentry from '@sentry/nextjs';

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

/**
 * Log to console - these are automatically captured by:
 * - Vercel Logs (server-side)
 * - Sentry Breadcrumbs (client-side, attached to error reports)
 */
const logToConsole = (
  level: LogLevel,
  message: string,
  context?: LogContext,
  err?: Error,
) => {
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

/**
 * Send error to Sentry as an issue
 */
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
    // eslint-disable-next-line no-console
    console.error('Failed to log to Sentry:', error);
  }
};

/**
 * Debug logs - console only
 * Captured by: Vercel Logs (server), Sentry Breadcrumbs (client)
 */
export const debug = (message: string, context?: LogContext) => {
  logToConsole('debug', message, context);
};

/**
 * Info logs - console only
 * Captured by: Vercel Logs (server), Sentry Breadcrumbs (client)
 */
export const info = (message: string, context?: LogContext) => {
  logToConsole('info', message, context);
};

/**
 * Warning logs - console only
 * Captured by: Vercel Logs (server), Sentry Breadcrumbs (client)
 */
export const warn = (message: string, context?: LogContext, err?: Error) => {
  logToConsole('warn', message, context, err);
};

/**
 * Error logs - console + Sentry issue
 * Creates a Sentry issue for investigation
 */
export const error = (message: string, context?: LogContext, err?: Error) => {
  logToConsole('error', message, context, err);
  logToSentry(message, context, err);
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
