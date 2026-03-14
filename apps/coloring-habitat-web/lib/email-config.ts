const RESEND_EMAIL_DOMAIN =
  process.env.RESEND_EMAIL_DOMAIN || "notifications.coloringhabitat.com";

export const getResendFromAddress = (
  prefix: string = "no-reply",
  displayName?: string,
): string => {
  const email = `${prefix}@${RESEND_EMAIL_DOMAIN}`;
  return displayName ? `${displayName} <${email}>` : email;
};

export const getResendEmailDomain = (): string => RESEND_EMAIL_DOMAIN;
