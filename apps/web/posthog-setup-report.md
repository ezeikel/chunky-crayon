# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into your Chunky Crayon
Next.js application. The integration includes:

- **Client-side initialization** via `instrumentation-client.ts` (Next.js
  16.1.0+ approach)
- **Server-side tracking** capability via `lib/posthog-server.ts`
- **Automatic user identification** when users authenticate via Google, Apple,
  or magic link
- **Error tracking** integrated with existing Sentry setup
- **12 custom events** tracking key user actions across the conversion funnel

## Environment Variables

PostHog has been configured with the following environment variables in
`.env.local`:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_fdXazMhVmQJ4hh0U9kVPp0sHQpBwbaQ8SpmS7TUGqGF
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Events Implemented

| Event Name                    | Description                                                            | File Path                                                                          |
| ----------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `coloring_page_created`       | User submits a description to create a new AI-generated coloring page  | `components/forms/CreateColoringPageForm/CreateColoringPageForm.tsx`               |
| `pdf_downloaded`              | User downloads a coloring page as PDF - key conversion event           | `components/buttons/DownloadPDFButton/DownloadPDFButton.tsx`                       |
| `print_button_clicked`        | User clicks the print button for a coloring page                       | `components/buttons/PrintButton/PrintButton.tsx`                                   |
| `email_list_signup`           | User signs up for the daily coloring page email list - lead generation | `components/forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm.tsx` |
| `pricing_plan_selected`       | User clicks Buy Now on a pricing plan - beginning of purchase funnel   | `app/pricing/page.tsx`                                                             |
| `subscription_plan_changed`   | User changes their subscription plan from billing page                 | `components/Billing/Billing.tsx`                                                   |
| `credits_purchased`           | User purchases additional credit packs                                 | `components/Billing/Billing.tsx`                                                   |
| `manage_subscription_clicked` | User clicks to manage subscription in Stripe portal                    | `components/Billing/Billing.tsx`                                                   |
| `checkout_completed`          | User completes checkout and purchase - key revenue event               | `utils/trackPurchase.ts`                                                           |
| `user_signed_in`              | User successfully signs in via Google, Apple, or magic link            | `components/buttons/SignInOptions/SignInOptions.tsx`                               |
| `color_selected`              | User selects a color in the coloring interface - engagement metric     | `components/ColorPalette/ColorPalette.tsx`                                         |

## Files Created/Modified

### New Files

- `instrumentation-client.ts` - Client-side PostHog initialization
- `lib/posthog-server.ts` - Server-side PostHog client
- `components/PostHogIdentify/PostHogIdentify.tsx` - User identification
  component

### Modified Files

- `.env.local` - Added PostHog environment variables
- `app/providers.tsx` - Added PostHogIdentify component
- `app/global-error.tsx` - Added PostHog error tracking
- `app/pricing/page.tsx` - Added pricing_plan_selected event
- `components/forms/CreateColoringPageForm/CreateColoringPageForm.tsx` - Added
  coloring_page_created event
- `components/buttons/DownloadPDFButton/DownloadPDFButton.tsx` - Added
  pdf_downloaded event
- `components/buttons/PrintButton/PrintButton.tsx` - Added print_button_clicked
  event
- `components/buttons/SignInOptions/SignInOptions.tsx` - Added user_signed_in
  event
- `components/forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm.tsx` -
  Added email_list_signup event
- `components/Billing/Billing.tsx` - Added subscription and credits events
- `components/ColorPalette/ColorPalette.tsx` - Added color_selected event
- `utils/trackPurchase.ts` - Added checkout_completed event

## Next steps

We've built some insights and a dashboard for you to keep an eye on user
behavior, based on the events we just instrumented:

### Dashboard

- [Analytics basics](https://eu.posthog.com/project/110135/dashboard/466328) -
  Core analytics dashboard tracking user engagement, conversions, and key
  business metrics

### Insights

- [Coloring Pages Created Over Time](https://eu.posthog.com/project/110135/insights/vwryPK3z) -
  Tracks the number of coloring pages created by users over time
- [Conversion Funnel: Creation to Download](https://eu.posthog.com/project/110135/insights/eXTAqfAk) -
  Tracks user conversion from creating a coloring page to downloading it as PDF
- [Purchase Funnel: Pricing to Checkout](https://eu.posthog.com/project/110135/insights/Yrd1r1nO) -
  Tracks user conversion from selecting a pricing plan to completing checkout
- [Email List Signups](https://eu.posthog.com/project/110135/insights/lBA74xaI) -
  Tracks daily email list signups for the coloring page newsletter
- [User Engagement: PDF Downloads vs Prints](https://eu.posthog.com/project/110135/insights/iLXfmSGM) -
  Compares PDF downloads to print button clicks to understand user output
  preferences

## Additional Recommendations

1. **Add to Vercel Environment Variables**: Make sure to add
   `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to your Vercel
   project settings for production deployment.

2. **Session Replay**: PostHog session replay is enabled by default with
   `capture_exceptions: true`. You can view user sessions in the PostHog
   dashboard.

3. **Feature Flags**: You can now use PostHog feature flags in your application
   by importing `posthog` from `posthog-js` and calling
   `posthog.isFeatureEnabled('flag-name')`.
