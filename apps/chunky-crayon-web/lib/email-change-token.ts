// Pure helpers for the verified email-change flow. Extracted from the
// settings server action so the security-critical bits (which email a
// confirmation token actually applies to, what counts as a valid address)
// are unit-testable in isolation. A silent bug here means applying an email
// change to the wrong address, so this logic is pinned by tests.

export const EMAIL_CHANGE_PREFIX = 'email-change';

export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase();

// Conservative check. The real proof of ownership is clicking the emailed
// link; this only needs to reject obvious garbage before we send anything.
export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Identifier format stored in the VerificationToken row:
//   email-change:<userId>:<newEmail>
// userId is a cuid (no colons); an email address cannot contain a colon,
// so splitting on ':' and taking [0]=prefix, [1]=userId, rest=email is
// unambiguous. Returns null if the identifier is not a well-formed
// email-change identifier for the given user.
export const buildEmailChangeIdentifier = (
  userId: string,
  newEmail: string,
): string => `${EMAIL_CHANGE_PREFIX}:${userId}:${newEmail}`;

export const parseEmailChangeIdentifier = (
  identifier: string,
  expectedUserId: string,
): { newEmail: string } | null => {
  const parts = identifier.split(':');
  if (parts.length < 3) return null;
  const [prefix, userId] = parts;
  if (prefix !== EMAIL_CHANGE_PREFIX) return null;
  if (userId !== expectedUserId) return null;
  const newEmail = parts.slice(2).join(':');
  if (!newEmail || !isValidEmail(newEmail)) return null;
  return { newEmail };
};

export const emailChangeIdentifierPrefix = (userId: string): string =>
  `${EMAIL_CHANGE_PREFIX}:${userId}:`;
