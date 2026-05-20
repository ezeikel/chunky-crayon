#!/usr/bin/env tsx
/**
 * Meta Marketing API → funnel breakdown per ad set.
 *
 * Pulls /act_{ad-account-id}/insights for the last N days, breaks down
 * each ad set by Pixel funnel events (link click → landing page view →
 * ViewContent → Lead → InitiateCheckout → Purchase) and prints a table
 * showing volume + drop-off rates between adjacent steps.
 *
 * Why: Ads Reporting in the Meta UI is finicky to set up. This script
 * gives a one-shot, scriptable view of campaign funnel health. Run
 * weekly (or wire into a cron) to see whether new optimization events
 * are working before committing more spend.
 *
 * Required env (load from `.env.local` or pass at the CLI):
 *   META_ADS_READ_TOKEN — System User token with `ads_read`
 *   META_AD_ACCOUNT_ID  — numeric ad account id (no `act_` prefix)
 *
 * Usage:
 *   pnpm tsx scripts/meta-funnel-report.ts             # last 30 days
 *   pnpm tsx scripts/meta-funnel-report.ts --days 7    # custom window
 *   pnpm tsx scripts/meta-funnel-report.ts --campaign  # group by campaign instead of adset
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

// ----------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------

const FB_API_VERSION = 'v21.0';
const FB_API = `https://graph.facebook.com/${FB_API_VERSION}`;

// The Pixel events we want to track as funnel steps, in funnel order.
// Each entry: [Meta action_type, display label]. Meta's insights API uses
// canonical action_type names that don't always match Events Manager
// labels — `landing_page_view` is "after the page actually loaded",
// distinct from `link_click` ("ad was clicked"). Drop-off between those
// two often surfaces tracking-prevention or slow page issues.
const FUNNEL_STEPS: Array<{ key: string; label: string }> = [
  { key: 'link_click', label: 'Link clicks' },
  { key: 'landing_page_view', label: 'Landing page views' },
  { key: 'view_content', label: 'ViewContent' },
  { key: 'lead', label: 'Lead' },
  { key: 'initiate_checkout', label: 'InitiateCheckout' },
  { key: 'complete_registration', label: 'Signup' },
  { key: 'purchase', label: 'Purchase' },
];

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type ActionEntry = { action_type: string; value: string };

type InsightsRow = {
  campaign_name?: string;
  adset_name?: string;
  reach?: string;
  impressions?: string;
  spend?: string;
  actions?: ActionEntry[];
};

type InsightsResponse = {
  data: InsightsRow[];
  paging?: { next?: string };
  error?: { message: string; code: number };
};

// ----------------------------------------------------------------------------
// CLI args
// ----------------------------------------------------------------------------

const args = process.argv.slice(2);
const daysFlag = args.indexOf('--days');
const days = daysFlag >= 0 ? Number(args[daysFlag + 1]) || 30 : 30;
const groupByCampaign = args.includes('--campaign');

// ----------------------------------------------------------------------------
// Fetch
// ----------------------------------------------------------------------------

const fetchInsights = async (
  token: string,
  adAccountId: string,
): Promise<InsightsRow[]> => {
  const params = new URLSearchParams({
    access_token: token,
    fields: 'campaign_name,adset_name,reach,impressions,spend,actions',
    level: groupByCampaign ? 'campaign' : 'adset',
    date_preset:
      days <= 7
        ? 'last_7d'
        : days <= 14
          ? 'last_14d'
          : days <= 30
            ? 'last_30d'
            : 'last_90d',
    limit: '500',
  });

  const url = `${FB_API}/act_${adAccountId}/insights?${params.toString()}`;

  const allRows: InsightsRow[] = [];
  let nextUrl: string | undefined = url;

  while (nextUrl) {
    const resp = await fetch(nextUrl);
    const json = (await resp.json()) as InsightsResponse;
    if (!resp.ok || json.error) {
      throw new Error(
        `Meta API error: ${json.error?.message ?? resp.statusText}`,
      );
    }
    allRows.push(...json.data);
    nextUrl = json.paging?.next;
  }

  return allRows;
};

// ----------------------------------------------------------------------------
// Render
// ----------------------------------------------------------------------------

const getActionValue = (
  actions: ActionEntry[] | undefined,
  key: string,
): number => {
  if (!actions) return 0;
  const entry = actions.find((a) => a.action_type === key);
  return entry ? Number(entry.value) || 0 : 0;
};

const pad = (s: string, width: number) =>
  s.length >= width ? s : s + ' '.repeat(width - s.length);

const renderRow = (row: InsightsRow): string => {
  const name =
    (groupByCampaign ? row.campaign_name : row.adset_name) ?? '(unknown)';
  const spend = Number(row.spend ?? 0).toFixed(2);
  const reach = Number(row.reach ?? 0).toLocaleString();

  const counts = FUNNEL_STEPS.map(({ key }) =>
    getActionValue(row.actions, key),
  );

  const lines: string[] = [];
  lines.push(`\n${name}`);
  lines.push(`  Spend: £${spend}   Reach: ${reach}`);

  let prev = 0;
  for (let i = 0; i < FUNNEL_STEPS.length; i += 1) {
    const { label } = FUNNEL_STEPS[i];
    const count = counts[i];
    const dropOff =
      i > 0 && prev > 0
        ? `  (${((count / prev) * 100).toFixed(1)}% of previous)`
        : '';
    lines.push(`    ${pad(label, 22)} ${pad(String(count), 6)}${dropOff}`);
    if (count > 0) prev = count;
  }

  // Cost per Lead / Cost per Purchase — the two numbers that matter for
  // judging optimization-event health and ROAS respectively.
  const leads = getActionValue(row.actions, 'lead');
  const purchases = getActionValue(row.actions, 'purchase');
  if (leads > 0) {
    lines.push(`    CPL: £${(Number(spend) / leads).toFixed(2)}`);
  }
  if (purchases > 0) {
    lines.push(`    CPA: £${(Number(spend) / purchases).toFixed(2)}`);
  }

  return lines.join('\n');
};

const renderTotals = (rows: InsightsRow[]): string => {
  const totals: Record<string, number> = {};
  let totalSpend = 0;
  let totalReach = 0;

  for (const row of rows) {
    totalSpend += Number(row.spend ?? 0);
    totalReach += Number(row.reach ?? 0);
    for (const { key } of FUNNEL_STEPS) {
      totals[key] = (totals[key] ?? 0) + getActionValue(row.actions, key);
    }
  }

  const lines: string[] = [];
  lines.push('\n=== TOTALS ===');
  lines.push(
    `  Spend: £${totalSpend.toFixed(2)}   Reach: ${totalReach.toLocaleString()}`,
  );

  let prev = 0;
  for (const { key, label } of FUNNEL_STEPS) {
    const count = totals[key] ?? 0;
    const dropOff =
      prev > 0 ? `  (${((count / prev) * 100).toFixed(1)}% of previous)` : '';
    lines.push(`    ${pad(label, 22)} ${pad(String(count), 6)}${dropOff}`);
    if (count > 0) prev = count;
  }

  if (totals.lead > 0) {
    lines.push(`    CPL: £${(totalSpend / totals.lead).toFixed(2)}`);
  }
  if (totals.purchase > 0) {
    lines.push(`    CPA: £${(totalSpend / totals.purchase).toFixed(2)}`);
  }

  return lines.join('\n');
};

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

const main = async () => {
  const token = process.env.META_ADS_READ_TOKEN;
  const adAccountId = process.env.META_AD_ACCOUNT_ID;

  if (!token) {
    console.error(
      'Missing META_ADS_READ_TOKEN. Generate a System User token in Business Settings with ads_read scope and add it to .env.local.',
    );
    process.exit(1);
  }
  if (!adAccountId) {
    console.error(
      'Missing META_AD_ACCOUNT_ID. Find your numeric ad account id in any Ads Manager URL (act_XXXXXX) and add to .env.local without the act_ prefix.',
    );
    process.exit(1);
  }

  console.log(
    `Meta funnel report — last ${days} days, grouped by ${groupByCampaign ? 'campaign' : 'ad set'}\n`,
  );

  const rows = await fetchInsights(token, adAccountId);

  if (rows.length === 0) {
    console.log('No active campaigns / ad sets in this window.');
    return;
  }

  // Sort by spend descending so highest-burn rows render first.
  rows.sort((a, b) => Number(b.spend ?? 0) - Number(a.spend ?? 0));

  for (const row of rows) {
    console.log(renderRow(row));
  }

  console.log(renderTotals(rows));
  console.log('');
};

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
