/**
 * Email configuration utilities
 * Centralizes email domain and from address configuration
 */

const RESEND_EMAIL_DOMAIN =
  process.env.RESEND_EMAIL_DOMAIN || 'notifications.chunkycrayon.com';

/**
 * Get the full "from" email address for Resend
 * @param prefix - Email prefix (e.g., 'no-reply', 'billing')
 * @param displayName - Optional display name (e.g., 'Chunky Crayon')
 * @returns Formatted email address string
 */
export const getResendFromAddress = (
  prefix: string = 'no-reply',
  displayName?: string,
): string => {
  const email = `${prefix}@${RESEND_EMAIL_DOMAIN}`;
  return displayName ? `${displayName} <${email}>` : email;
};

/**
 * Get the email domain configured for Resend
 */
export const getResendEmailDomain = (): string => RESEND_EMAIL_DOMAIN;
