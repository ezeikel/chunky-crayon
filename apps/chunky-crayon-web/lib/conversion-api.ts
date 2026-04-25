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
// FACEBOOK CONVERSION API
// =============================================================================

interface FacebookPurchaseEvent {
  event_name: 'Purchase';
  event_time: number;
  event_id: string;
  event_source_url?: string;
  user_data: {
    em?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    external_id?: string;
  };
  custom_data: {
    currency: string;
    value: number;
    content_name?: string;
    content_type?: string;
    content_ids?: string[];
  };
  action_source: 'website';
}

export const sendFacebookConversionEvent = async ({
  email,
  userId,
  value,
  currency,
  eventId,
  contentName,
  ipAddress,
  userAgent,
}: {
  email: string;
  userId: string;
  value: number;
  currency: string;
  eventId: string;
  contentName: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> => {
  const pixelId = process.env.FACEBOOK_PIXEL_ID;
  const accessToken = process.env.FACEBOOK_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.log('[FB CAPI] Missing credentials, skipping');
    return { success: false, error: 'Missing Facebook CAPI credentials' };
  }

  const event: FacebookPurchaseEvent = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    event_source_url: 'https://chunkycrayon.com',
    user_data: {
      em: hashSha256(email),
      external_id: hashSha256(userId),
      ...(ipAddress && { client_ip_address: ipAddress }),
      ...(userAgent && { client_user_agent: userAgent }),
    },
    custom_data: {
      currency: currency.toUpperCase(),
      value: value / 100,
      content_name: contentName,
      content_type: 'product',
    },
    action_source: 'website',
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
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
      console.error('[FB CAPI] Error:', data);
      return { success: false, error: data.error?.message };
    }

    console.log('[FB CAPI] Purchase event sent:', eventId);
    return { success: true };
  } catch (error) {
    console.error('[FB CAPI] Request failed:', error);
    return { success: false, error: String(error) };
  }
};

// =============================================================================
// PINTEREST CONVERSION API
// =============================================================================

interface PinterestConversionEvent {
  event_name: 'checkout';
  action_source: 'web';
  event_time: number;
  event_id: string;
  event_source_url?: string;
  user_data: {
    em?: string[];
    external_id?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
  };
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
  value,
  currency,
  eventId,
  contentName,
  ipAddress,
  userAgent,
}: {
  email: string;
  userId: string;
  value: number;
  currency: string;
  eventId: string;
  contentName: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> => {
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
    event_source_url: 'https://chunkycrayon.com',
    user_data: {
      em: [hashSha256(email)],
      external_id: [hashSha256(userId)],
      ...(ipAddress && { client_ip_address: ipAddress }),
      ...(userAgent && { client_user_agent: userAgent }),
    },
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
// FACEBOOK COMPLETE REGISTRATION (signup)
// =============================================================================

// Server-side counterpart to PixelTracker's browser-side CompleteRegistration.
// Fires from the NextAuth signIn callback the moment a new user row is
// created. eventId matches the user.id so when the browser also fires
// CompleteRegistration via fbq, Meta deduplicates against this server send.
export const sendFacebookCompleteRegistrationEvent = async ({
  email,
  userId,
  ipAddress,
  userAgent,
  signupMethod,
}: {
  email: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  signupMethod?: 'google' | 'email';
}): Promise<{ success: boolean; error?: string }> => {
  const pixelId = process.env.FACEBOOK_PIXEL_ID;
  const accessToken = process.env.FACEBOOK_CAPI_ACCESS_TOKEN;

  if (!pixelId || !accessToken) {
    console.log('[FB CAPI] Missing credentials, skipping CompleteRegistration');
    return { success: false, error: 'Missing Facebook CAPI credentials' };
  }

  const event = {
    event_name: 'CompleteRegistration' as const,
    event_time: Math.floor(Date.now() / 1000),
    event_id: userId,
    event_source_url: 'https://chunkycrayon.com',
    user_data: {
      em: hashSha256(email),
      external_id: hashSha256(userId),
      ...(ipAddress && { client_ip_address: ipAddress }),
      ...(userAgent && { client_user_agent: userAgent }),
    },
    custom_data: {
      content_name: 'User Signup',
      ...(signupMethod && { signup_method: signupMethod }),
      status: true,
    },
    action_source: 'website' as const,
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
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
      console.error('[FB CAPI] CompleteRegistration error:', data);
      return { success: false, error: data.error?.message };
    }

    console.log('[FB CAPI] CompleteRegistration event sent:', userId);
    return { success: true };
  } catch (error) {
    console.error('[FB CAPI] CompleteRegistration request failed:', error);
    return { success: false, error: String(error) };
  }
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
  ipAddress,
  userAgent,
}: {
  email: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ success: boolean; error?: string }> => {
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
    event_source_url: 'https://chunkycrayon.com',
    user_data: {
      em: [hashSha256(email)],
      external_id: [hashSha256(userId)],
      ...(ipAddress && { client_ip_address: ipAddress }),
      ...(userAgent && { client_user_agent: userAgent }),
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

export const sendPurchaseConversionEvents = async (params: {
  email: string;
  userId: string;
  value: number;
  currency: string;
  eventId: string;
  contentName: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> => {
  // Fire both in parallel - don't block webhook response
  await Promise.allSettled([
    sendFacebookConversionEvent(params),
    sendPinterestConversionEvent(params),
  ]);
};

// Fires CompleteRegistration on Facebook + signup on Pinterest in
// parallel. Server-side counterpart to the browser PixelTracker — Meta
// deduplicates client + server via event_id (set to userId), Pinterest
// likewise. Use from the NextAuth signIn callback right after a new
// user row is created.
export const sendSignupConversionEvents = async (params: {
  email: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  signupMethod?: 'google' | 'email';
}): Promise<void> => {
  await Promise.allSettled([
    sendFacebookCompleteRegistrationEvent(params),
    sendPinterestSignupEvent(params),
  ]);
};
