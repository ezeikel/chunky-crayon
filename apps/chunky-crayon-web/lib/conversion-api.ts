import crypto from 'crypto';

// =============================================================================
// HASHING UTILITIES (required by both APIs for PII)
// =============================================================================

const hashSha256 = (value: string): string => {
  return crypto
    .createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
};

// =============================================================================
// SHARED MATCH DATA
// =============================================================================

// Identity hints captured at the user's browser and forwarded to CAPI.
// fbp / fbc are Meta's primary match keys (browser id and click id from
// the _fbp / _fbc cookies set by the Pixel). Without them Meta has to
// match purely on hashed email/external_id, which is materially weaker.
type ClientMatchData = {
  ipAddress?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
};

// Identity fields Meta hashes for matching. Adding phone + first/last
// name pushes Match Quality from ~6/10 toward ~8/10, which directly
// improves ad attribution and lookalike audience seeding. Pass
// whatever's available — fields are only included when set.
type IdentityData = {
  email?: string;
  userId?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
};

const buildFacebookUserData = (params: IdentityData & ClientMatchData) => ({
  ...(params.email && { em: hashSha256(params.email) }),
  ...(params.userId && { external_id: hashSha256(params.userId) }),
  ...(params.phone && { ph: hashSha256(params.phone.replace(/\D/g, '')) }),
  ...(params.firstName && { fn: hashSha256(params.firstName) }),
  ...(params.lastName && { ln: hashSha256(params.lastName) }),
  ...(params.ipAddress && { client_ip_address: params.ipAddress }),
  ...(params.userAgent && { client_user_agent: params.userAgent }),
  ...(params.fbp && { fbp: params.fbp }),
  ...(params.fbc && { fbc: params.fbc }),
});

const buildPinterestUserData = (params: IdentityData & ClientMatchData) => ({
  ...(params.email && { em: [hashSha256(params.email)] }),
  ...(params.userId && { external_id: [hashSha256(params.userId)] }),
  ...(params.phone && { ph: [hashSha256(params.phone.replace(/\D/g, ''))] }),
  ...(params.firstName && { fn: [hashSha256(params.firstName)] }),
  ...(params.lastName && { ln: [hashSha256(params.lastName)] }),
  ...(params.ipAddress && { client_ip_address: params.ipAddress }),
  ...(params.userAgent && { client_user_agent: params.userAgent }),
});

const FB_API = 'https://graph.facebook.com/v21.0';
const FB_EVENT_SOURCE_URL = 'https://chunkycrayon.com';

const postFacebookEvent = async (
  event: Record<string, unknown>,
  label: string,
): Promise<{ success: boolean; error?: string }> => {
  const pixelId = process.env.FACEBOOK_PIXEL_ID;
  const accessToken = process.env.FACEBOOK_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.log(`[FB CAPI] Missing credentials, skipping ${label}`);
    return { success: false, error: 'Missing Facebook CAPI credentials' };
  }

  try {
    const response = await fetch(
      `${FB_API}/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [event],
          ...(process.env.FACEBOOK_CAPI_TEST_CODE && {
            test_event_code: process.env.FACEBOOK_CAPI_TEST_CODE,
          }),
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(`[FB CAPI] ${label} error:`, data);
      return { success: false, error: data.error?.message };
    }

    console.log(`[FB CAPI] ${label} event sent:`, event.event_id);
    return { success: true };
  } catch (error) {
    console.error(`[FB CAPI] ${label} request failed:`, error);
    return { success: false, error: String(error) };
  }
};

// =============================================================================
// FACEBOOK: PURCHASE
// =============================================================================

export const sendFacebookConversionEvent = async ({
  email,
  userId,
  phone,
  firstName,
  lastName,
  value,
  currency,
  eventId,
  contentName,
  ipAddress,
  userAgent,
  fbp,
  fbc,
}: {
  email: string;
  userId: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  value: number;
  currency: string;
  eventId: string;
  contentName: string;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  return postFacebookEvent(
    {
      event_name: 'Purchase',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: FB_EVENT_SOURCE_URL,
      user_data: buildFacebookUserData({
        email,
        userId,
        phone,
        firstName,
        lastName,
        ipAddress,
        userAgent,
        fbp,
        fbc,
      }),
      custom_data: {
        currency: currency.toUpperCase(),
        value: value / 100,
        content_name: contentName,
        content_type: 'product',
      },
      action_source: 'website',
    },
    'Purchase',
  );
};

// =============================================================================
// FACEBOOK: SUBSCRIBE
// =============================================================================

// Subscribe is distinct from Purchase: Meta uses it specifically for
// subscription starts (and the dashboard shows it separately). Fire
// alongside Purchase when the checkout was for a subscription. Use a
// distinct event_id so Meta doesn't merge it with the Purchase event.
export const sendFacebookSubscribeEvent = async ({
  email,
  userId,
  phone,
  firstName,
  lastName,
  value,
  currency,
  eventId,
  planName,
  predictedLtvMultiplier = 12,
  ipAddress,
  userAgent,
  fbp,
  fbc,
}: {
  email: string;
  userId: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  value: number;
  currency: string;
  eventId: string;
  planName: string;
  predictedLtvMultiplier?: number;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  return postFacebookEvent(
    {
      event_name: 'Subscribe',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: FB_EVENT_SOURCE_URL,
      user_data: buildFacebookUserData({
        email,
        userId,
        phone,
        firstName,
        lastName,
        ipAddress,
        userAgent,
        fbp,
        fbc,
      }),
      custom_data: {
        currency: currency.toUpperCase(),
        value: value / 100,
        content_name: `${planName} Subscription`,
        predicted_ltv: (value / 100) * predictedLtvMultiplier,
      },
      action_source: 'website',
    },
    'Subscribe',
  );
};

// =============================================================================
// FACEBOOK: INITIATE CHECKOUT
// =============================================================================

// Fired from the server action that creates the Stripe Checkout session,
// before the user reaches Stripe. Server-side counterpart to the
// browser's trackInitiateCheckout — survives ad-blockers and iOS 14+
// tracking restrictions. Pinterest has no distinct InitiateCheckout
// event (its "checkout" maps to Purchase), so we only fire to Meta here
// to avoid double-counting Pinterest purchases.
export const sendFacebookInitiateCheckoutEvent = async ({
  email,
  userId,
  phone,
  firstName,
  lastName,
  value,
  currency,
  eventId,
  contentName,
  ipAddress,
  userAgent,
  fbp,
  fbc,
}: {
  email?: string;
  userId?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  value: number;
  currency: string;
  eventId: string;
  contentName: string;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  return postFacebookEvent(
    {
      event_name: 'InitiateCheckout',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: FB_EVENT_SOURCE_URL,
      user_data: buildFacebookUserData({
        email,
        userId,
        phone,
        firstName,
        lastName,
        ipAddress,
        userAgent,
        fbp,
        fbc,
      }),
      custom_data: {
        currency: currency.toUpperCase(),
        value: value / 100,
        content_name: contentName,
        content_type: 'product',
      },
      action_source: 'website',
    },
    'InitiateCheckout',
  );
};

// =============================================================================
// PINTEREST: PURCHASE
// =============================================================================

interface PinterestConversionEvent {
  event_name: 'checkout';
  action_source: 'web';
  event_time: number;
  event_id: string;
  event_source_url?: string;
  user_data: ReturnType<typeof buildPinterestUserData>;
  custom_data: {
    currency: string;
    value: string;
    content_name?: string;
    num_items?: number;
  };
}

export const sendPinterestConversionEvent = async ({
  email,
  userId,
  phone,
  firstName,
  lastName,
  value,
  currency,
  eventId,
  contentName,
  ipAddress,
  userAgent,
}: {
  email: string;
  userId: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  value: number;
  currency: string;
  eventId: string;
  contentName: string;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  const adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID;
  const accessToken = process.env.PINTEREST_CAPI_ACCESS_TOKEN;

  if (!adAccountId || !accessToken) {
    console.log('[Pinterest CAPI] Missing credentials, skipping');
    return { success: false, error: 'Missing Pinterest CAPI credentials' };
  }

  const event: PinterestConversionEvent = {
    event_name: 'checkout',
    action_source: 'web',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: FB_EVENT_SOURCE_URL,
    user_data: buildPinterestUserData({
      email,
      userId,
      phone,
      firstName,
      lastName,
      ipAddress,
      userAgent,
    }),
    custom_data: {
      currency: currency.toUpperCase(),
      value: (value / 100).toFixed(2),
      content_name: contentName,
      num_items: 1,
    },
  };

  try {
    const response = await fetch(
      `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [event] }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Pinterest CAPI] Error:', data);
      return { success: false, error: data.message };
    }

    console.log('[Pinterest CAPI] Checkout event sent:', eventId);
    return { success: true };
  } catch (error) {
    console.error('[Pinterest CAPI] Request failed:', error);
    return { success: false, error: String(error) };
  }
};

// =============================================================================
// FACEBOOK: LEAD
// =============================================================================

// Server-side counterpart to the browser PixelTracker's trackLead. Fires
// from createPendingColoringImage when an image-creation job is accepted
// — the strongest top-of-funnel intent signal we have. Guests have no
// userId/email so we send what we have (fbp/fbc/IP/UA) so Meta's
// browser-id matching still works. Use a fresh eventId (the
// coloringImageId) so client + server fires deduplicate.
export const sendFacebookLeadEvent = async ({
  email,
  userId,
  eventId,
  contentName,
  contentCategory,
  ipAddress,
  userAgent,
  fbp,
  fbc,
}: {
  email?: string;
  userId?: string;
  eventId: string;
  contentName: string;
  contentCategory?: string;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  return postFacebookEvent(
    {
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: FB_EVENT_SOURCE_URL,
      user_data: buildFacebookUserData({
        email,
        userId,
        ipAddress,
        userAgent,
        fbp,
        fbc,
      }),
      custom_data: {
        content_name: contentName,
        ...(contentCategory && { content_category: contentCategory }),
      },
      action_source: 'website',
    },
    'Lead',
  );
};

// =============================================================================
// PINTEREST: LEAD
// =============================================================================

export const sendPinterestLeadEvent = async ({
  email,
  userId,
  eventId,
  leadType,
  ipAddress,
  userAgent,
}: {
  email?: string;
  userId?: string;
  eventId: string;
  leadType: string;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  const adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID;
  const accessToken = process.env.PINTEREST_CAPI_ACCESS_TOKEN;

  if (!adAccountId || !accessToken) {
    console.log('[Pinterest CAPI] Missing credentials, skipping lead');
    return { success: false, error: 'Missing Pinterest CAPI credentials' };
  }

  const event = {
    event_name: 'lead' as const,
    action_source: 'web' as const,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: FB_EVENT_SOURCE_URL,
    user_data: buildPinterestUserData({ email, userId, ipAddress, userAgent }),
    custom_data: { lead_type: leadType },
  };

  try {
    const response = await fetch(
      `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [event] }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Pinterest CAPI] lead error:', data);
      return { success: false, error: data.message };
    }

    console.log('[Pinterest CAPI] lead event sent:', eventId);
    return { success: true };
  } catch (error) {
    console.error('[Pinterest CAPI] lead request failed:', error);
    return { success: false, error: String(error) };
  }
};

// =============================================================================
// FACEBOOK: VIEW CONTENT
// =============================================================================

// Server-side ViewContent for high-intent surfaces (pricing page,
// coloring-image detail). Browser pixel ViewContent is unreliable on
// iOS in-app browsers + ad blockers; CAPI plugs that gap.
export const sendFacebookViewContentEvent = async ({
  email,
  userId,
  eventId,
  contentType,
  contentId,
  contentName,
  value,
  currency,
  ipAddress,
  userAgent,
  fbp,
  fbc,
}: {
  email?: string;
  userId?: string;
  eventId: string;
  contentType: string;
  contentId?: string;
  contentName?: string;
  value?: number;
  currency?: string;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  return postFacebookEvent(
    {
      event_name: 'ViewContent',
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: FB_EVENT_SOURCE_URL,
      user_data: buildFacebookUserData({
        email,
        userId,
        ipAddress,
        userAgent,
        fbp,
        fbc,
      }),
      custom_data: {
        content_type: contentType,
        ...(contentId && { content_ids: [contentId] }),
        ...(contentName && { content_name: contentName }),
        ...(value !== undefined && { value }),
        ...(currency && { currency: currency.toUpperCase() }),
      },
      action_source: 'website',
    },
    'ViewContent',
  );
};

// =============================================================================
// FACEBOOK COMPLETE REGISTRATION (signup)
// =============================================================================

// Server-side counterpart to PixelTracker's browser-side CompleteRegistration.
// Fires from the NextAuth signIn callback the moment a new user row is
// created. eventId matches the user.id so when the browser also fires
// CompleteRegistration via fbq, Meta deduplicates against this server send.
export const sendFacebookCompleteRegistrationEvent = async ({
  email,
  userId,
  phone,
  firstName,
  lastName,
  ipAddress,
  userAgent,
  fbp,
  fbc,
  signupMethod,
}: {
  email: string;
  userId: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  signupMethod?: 'google' | 'email';
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  return postFacebookEvent(
    {
      event_name: 'CompleteRegistration',
      event_time: Math.floor(Date.now() / 1000),
      event_id: userId,
      event_source_url: FB_EVENT_SOURCE_URL,
      user_data: buildFacebookUserData({
        email,
        userId,
        phone,
        firstName,
        lastName,
        ipAddress,
        userAgent,
        fbp,
        fbc,
      }),
      custom_data: {
        content_name: 'User Signup',
        ...(signupMethod && { signup_method: signupMethod }),
        status: true,
      },
      action_source: 'website',
    },
    'CompleteRegistration',
  );
};

// =============================================================================
// PINTEREST SIGNUP
// =============================================================================

// Pinterest counterpart for signup. Pinterest's "signup" is one of its
// standard event names; mapping CompleteRegistration → signup keeps the
// two platforms aligned.
export const sendPinterestSignupEvent = async ({
  email,
  userId,
  phone,
  firstName,
  lastName,
  ipAddress,
  userAgent,
}: {
  email: string;
  userId: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
} & ClientMatchData): Promise<{ success: boolean; error?: string }> => {
  const adAccountId = process.env.PINTEREST_AD_ACCOUNT_ID;
  const accessToken = process.env.PINTEREST_CAPI_ACCESS_TOKEN;

  if (!adAccountId || !accessToken) {
    console.log('[Pinterest CAPI] Missing credentials, skipping signup');
    return { success: false, error: 'Missing Pinterest CAPI credentials' };
  }

  const event = {
    event_name: 'signup' as const,
    action_source: 'web' as const,
    event_time: Math.floor(Date.now() / 1000),
    event_id: userId,
    event_source_url: FB_EVENT_SOURCE_URL,
    user_data: buildPinterestUserData({
      email,
      userId,
      phone,
      firstName,
      lastName,
      ipAddress,
      userAgent,
    }),
  };

  try {
    const response = await fetch(
      `https://api.pinterest.com/v5/ad_accounts/${adAccountId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: [event] }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[Pinterest CAPI] signup error:', data);
      return { success: false, error: data.message };
    }

    console.log('[Pinterest CAPI] signup event sent:', userId);
    return { success: true };
  } catch (error) {
    console.error('[Pinterest CAPI] signup request failed:', error);
    return { success: false, error: String(error) };
  }
};

// =============================================================================
// COMBINED HELPERS
// =============================================================================

export const sendPurchaseConversionEvents = async (
  params: {
    email: string;
    userId: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    value: number;
    currency: string;
    eventId: string;
    contentName: string;
  } & ClientMatchData,
): Promise<void> => {
  // Fire both in parallel - don't block webhook response
  await Promise.allSettled([
    sendFacebookConversionEvent(params),
    sendPinterestConversionEvent(params),
  ]);
};

// Subscribe-specific wrapper. Pinterest has no distinct Subscribe event
// (its "checkout" already covers the Purchase fire), so this only sends
// to Meta. Use alongside sendPurchaseConversionEvents for subscription
// checkouts — Purchase logs the revenue, Subscribe lets Meta optimize
// for the recurring-revenue conversion type specifically.
export const sendSubscribeConversionEvents = async (
  params: {
    email: string;
    userId: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    value: number;
    currency: string;
    eventId: string;
    planName: string;
    predictedLtvMultiplier?: number;
  } & ClientMatchData,
): Promise<void> => {
  await Promise.allSettled([sendFacebookSubscribeEvent(params)]);
};

// InitiateCheckout wrapper. Meta-only for the same reason as Subscribe
// — Pinterest's only checkout-stage event is Purchase. Fire from the
// server action that creates the Stripe Checkout session.
export const sendInitiateCheckoutConversionEvents = async (
  params: {
    email?: string;
    userId?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    value: number;
    currency: string;
    eventId: string;
    contentName: string;
  } & ClientMatchData,
): Promise<void> => {
  await Promise.allSettled([sendFacebookInitiateCheckoutEvent(params)]);
};

// Lead wrapper. Pinterest's "lead" maps cleanly to Facebook's "Lead"
// so we fire both in parallel. Use eventId = coloringImageId from
// createPendingColoringImage so it dedups against the matching browser
// trackLead fire.
export const sendLeadConversionEvents = async (
  params: {
    email?: string;
    userId?: string;
    eventId: string;
    contentName: string;
    contentCategory?: string;
  } & ClientMatchData,
): Promise<void> => {
  await Promise.allSettled([
    sendFacebookLeadEvent(params),
    sendPinterestLeadEvent({
      ...params,
      leadType: params.contentCategory || 'content_creation',
    }),
  ]);
};

// ViewContent wrapper. Meta-only — Pinterest's `pagevisit` is implicit
// in their tag and Pinterest doesn't accept ViewContent server-side.
export const sendViewContentConversionEvents = async (
  params: {
    email?: string;
    userId?: string;
    eventId: string;
    contentType: string;
    contentId?: string;
    contentName?: string;
    value?: number;
    currency?: string;
  } & ClientMatchData,
): Promise<void> => {
  await Promise.allSettled([sendFacebookViewContentEvent(params)]);
};

// Fires CompleteRegistration on Facebook + signup on Pinterest in
// parallel. Server-side counterpart to the browser PixelTracker — Meta
// deduplicates client + server via event_id (set to userId), Pinterest
// likewise. Use from the NextAuth signIn callback right after a new
// user row is created.
export const sendSignupConversionEvents = async (
  params: {
    email: string;
    userId: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    signupMethod?: 'google' | 'email';
  } & ClientMatchData,
): Promise<void> => {
  await Promise.allSettled([
    sendFacebookCompleteRegistrationEvent(params),
    sendPinterestSignupEvent(params),
  ]);
};

// =============================================================================
// REQUEST HELPERS — read fbp/fbc/IP/UA from incoming Next request
// =============================================================================

// Builds an _fbc value from a fbclid query param, in the format Meta
// expects: `fb.<subdomainIndex>.<creationTimestamp>.<fbclid>`.
// subdomainIndex=1 = .com (no subdomain), which matches our setup.
// Use this when the user lands with ?fbclid=... and the Pixel hasn't
// run yet (or is blocked) so no _fbc cookie has been set.
export const buildFbcFromFbclid = (fbclid: string | null | undefined) => {
  if (!fbclid) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
};

// Reads the Meta match-data hints from a Next.js Request-context. Pull
// IP + UA from headers, fbp/fbc from cookies. Both `headers()` and
// `cookies()` are dynamic — only call from a request scope (server
// action, route handler, NextAuth callback). Returns undefined fields
// where not available so callers can spread the result safely.
export const readClientMatchData = async (): Promise<ClientMatchData> => {
  try {
    const { headers } = await import('next/headers');
    const { cookies } = await import('next/headers');
    const h = await headers();
    const c = await cookies();
    return {
      ipAddress:
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        h.get('x-real-ip') ||
        undefined,
      userAgent: h.get('user-agent') || undefined,
      fbp: c.get('_fbp')?.value || undefined,
      fbc: c.get('_fbc')?.value || undefined,
    };
  } catch {
    return {};
  }
};
