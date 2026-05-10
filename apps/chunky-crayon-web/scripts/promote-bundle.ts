/**
 * Promote a bundle from dev → prod.
 *
 * `launch-bundle.ts` runs against whichever env vars `.env.local` points
 * at — typically dev R2, dev Neon branch, Stripe test mode. Once a
 * bundle has been verified in dev, this script copies it to prod:
 *
 *   1. Copies every R2 object under `bundles/{slug}/` from dev bucket
 *      to prod bucket (listings, hero-refs, brand-character, all 10
 *      pages' webp + svg).
 *   2. Copies per-image assets that live OUTSIDE the bundle prefix
 *      (regionMap, qrCode, coloredReference) — looked up via the dev
 *      Bundle row's pages, copied by their URLs to the same paths on
 *      prod R2. Skipped silently if absent (region maps are normally
 *      generated post-launch).
 *   3. Upserts the Bundle row in prod DB with prod-bucket URLs (the
 *      hostname is rewritten so listingHeroUrl etc. point at the prod
 *      R2_PUBLIC_URL host, not dev's).
 *   4. Upserts each ColoringImage row in prod DB.
 *   5. Creates / updates the Stripe product in LIVE mode using
 *      `STRIPE_SECRET_KEY` from the prod env file. Writes the live
 *      product/price IDs back to the prod Bundle row.
 *
 * Idempotent: re-running picks up where it left off. Each R2 copy
 * checks the destination first; each DB upsert is a true upsert.
 *
 * Bundle stays `published: false` on prod — flip to true via SQL once
 * verified live (same gate as the dev launch).
 *
 * Usage:
 *   1. Pull a prod env file:
 *      cd apps/chunky-crayon-web
 *      vercel env pull .env.production.local --environment=production
 *
 *   2. Run the promotion (dry-run first):
 *      pnpm tsx -r dotenv/config scripts/promote-bundle.ts \
 *        --slug=bakery-buddy-bakers \
 *        --prod-env-file=.env.production.local \
 *        --dry \
 *        dotenv_config_path=.env.local
 *
 *   3. When dry looks right, drop --dry.
 *
 * Cost: $0 for R2 copies (within Cloudflare). Stripe API call is free.
 *
 * Wall-clock: ~30s for a typical bundle (15-20 R2 objects, all small).
 */

import { config as dotenvConfig } from 'dotenv';
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaClient } from '@one-colored-pixel/db';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import Stripe from 'stripe';

neonConfig.webSocketConstructor = ws;

type EnvScope = {
  databaseUrl: string;
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  r2PublicUrl: string;
  stripeSecretKey: string;
};

function readEnvScope(envFilePath: string | null, label: string): EnvScope {
  // null → use process.env (already populated by tsx + dotenv/config).
  // path → parse the file and treat its values as the source of truth.
  let source: NodeJS.ProcessEnv;
  if (envFilePath) {
    const parsed = dotenvConfig({ path: envFilePath, override: false });
    if (parsed.error) {
      throw new Error(
        `[${label}] could not read ${envFilePath}: ${parsed.error.message}`,
      );
    }
    source = parsed.parsed as NodeJS.ProcessEnv;
  } else {
    source = process.env;
  }

  const required = [
    'DATABASE_URL',
    'R2_ENDPOINT',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_URL',
    'STRIPE_SECRET_KEY',
  ];
  for (const key of required) {
    if (!source[key]) {
      throw new Error(`[${label}] missing required env var: ${key}`);
    }
  }

  return {
    databaseUrl: source.DATABASE_URL!,
    r2Endpoint: source.R2_ENDPOINT!,
    r2AccessKeyId: source.R2_ACCESS_KEY_ID!,
    r2SecretAccessKey: source.R2_SECRET_ACCESS_KEY!,
    r2Bucket: source.R2_BUCKET!,
    r2PublicUrl: source.R2_PUBLIC_URL!.replace(/\/$/, ''),
    stripeSecretKey: source.STRIPE_SECRET_KEY!,
  };
}

function makeR2Client(env: EnvScope): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  });
}

function makePrismaClient(databaseUrl: string): PrismaClient {
  const adapter = new PrismaNeon({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

/**
 * Rewrite a URL whose host is one R2_PUBLIC_URL to use a different one.
 * Used to convert dev URLs into the prod equivalents — same R2 path,
 * different public host.
 */
function rewriteHost(
  url: string | null | undefined,
  fromHost: string,
  toHost: string,
): string | null {
  if (!url) return null;
  if (!url.startsWith(fromHost)) {
    // Foreign URL (CDN, vercel blob, etc.) — leave it alone.
    return url;
  }
  return toHost + url.slice(fromHost.length);
}

/**
 * Extract the R2 key from a public URL. Both dev and prod store
 * objects at identical keys, so we only need the path component.
 */
function urlToKey(url: string, publicUrl: string): string | null {
  if (!url.startsWith(publicUrl)) return null;
  const tail = url.slice(publicUrl.length);
  return tail.startsWith('/') ? tail.slice(1) : tail;
}

async function copyR2Object(
  fromClient: S3Client,
  fromBucket: string,
  toClient: S3Client,
  toBucket: string,
  key: string,
  dryRun: boolean,
): Promise<{ skipped: boolean; copied: boolean; bytes: number }> {
  // Skip if already on prod.
  try {
    const head = await toClient.send(
      new HeadObjectCommand({ Bucket: toBucket, Key: key }),
    );
    return { skipped: true, copied: false, bytes: head.ContentLength ?? 0 };
  } catch (err: unknown) {
    // 404 expected. Anything else is a real failure.
    if ((err as { name?: string })?.name !== 'NotFound') {
      throw err;
    }
  }

  if (dryRun) {
    console.log(`  [dry] would copy ${key}`);
    return { skipped: false, copied: false, bytes: 0 };
  }

  // Download from dev.
  const get = await fromClient.send(
    new GetObjectCommand({ Bucket: fromBucket, Key: key }),
  );
  if (!get.Body) {
    throw new Error(`[copy] dev returned empty body for ${key}`);
  }
  const buffer = Buffer.from(
    await new Response(get.Body as ReadableStream).arrayBuffer(),
  );

  // Upload to prod with the same content-type.
  await toClient.send(
    new PutObjectCommand({
      Bucket: toBucket,
      Key: key,
      Body: buffer,
      ContentType: get.ContentType,
    }),
  );

  return { skipped: false, copied: true, bytes: buffer.length };
}

async function listR2Prefix(
  client: S3Client,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

async function promote(opts: {
  slug: string;
  prodEnvFile: string;
  dryRun: boolean;
  skipStripe: boolean;
}): Promise<void> {
  console.log(`\n=== Promoting bundle: ${opts.slug} (dev → prod) ===\n`);

  const dev = readEnvScope(null, 'dev');
  const prod = readEnvScope(opts.prodEnvFile, 'prod');

  if (dev.r2Bucket === prod.r2Bucket) {
    throw new Error(
      `[guard] dev and prod R2 buckets are identical (${dev.r2Bucket}). Refusing to promote — this would be a no-op or worse.`,
    );
  }
  if (dev.databaseUrl === prod.databaseUrl) {
    throw new Error(
      `[guard] dev and prod DATABASE_URL are identical. Refusing to promote.`,
    );
  }

  const devR2 = makeR2Client(dev);
  const prodR2 = makeR2Client(prod);
  const devDb = makePrismaClient(dev.databaseUrl);
  const prodDb = makePrismaClient(prod.databaseUrl);

  try {
    // -------------------------------------------------------------------
    // Step 1: Read dev Bundle row + its pages.
    // -------------------------------------------------------------------
    console.log(`[1/5] reading dev Bundle row...`);
    const devBundle = await devDb.bundle.findUnique({
      where: { slug: opts.slug },
      include: {
        pages: {
          orderBy: { bundleOrder: 'asc' },
        },
      },
    });
    if (!devBundle) {
      throw new Error(`[1/5] no Bundle row in dev DB for slug ${opts.slug}`);
    }
    console.log(
      `[1/5] dev bundle: ${devBundle.name}, ${devBundle.pages.length} pages, published=${devBundle.published}`,
    );

    // -------------------------------------------------------------------
    // Step 2: Copy the entire bundles/{slug}/ R2 prefix.
    // -------------------------------------------------------------------
    const prefix = `bundles/${opts.slug}/`;
    console.log(`\n[2/5] enumerating dev R2 prefix ${prefix}...`);
    const keys = await listR2Prefix(devR2, dev.r2Bucket, prefix);
    console.log(`[2/5] found ${keys.length} objects to consider`);

    let copied = 0;
    let skipped = 0;
    let totalBytes = 0;
    for (const key of keys) {
      const r = await copyR2Object(
        devR2,
        dev.r2Bucket,
        prodR2,
        prod.r2Bucket,
        key,
        opts.dryRun,
      );
      if (r.skipped) {
        skipped += 1;
      } else if (r.copied) {
        copied += 1;
        totalBytes += r.bytes;
        console.log(`  [copy] ${key} (${(r.bytes / 1024).toFixed(0)}KB)`);
      }
    }
    console.log(
      `[2/5] R2 prefix done: ${copied} copied, ${skipped} already-on-prod, ${(totalBytes / 1024 / 1024).toFixed(2)}MB total`,
    );

    // -------------------------------------------------------------------
    // Step 2b: Copy per-image assets that live OUTSIDE the bundle prefix.
    // -------------------------------------------------------------------
    console.log(
      `\n[2b/5] copying per-image assets (regionMap, qrCode, coloredReference)...`,
    );
    let perImageCopied = 0;
    let perImageSkipped = 0;
    let perImageMissing = 0;
    for (const page of devBundle.pages) {
      const candidateUrls = [
        page.regionMapUrl,
        page.qrCodeUrl,
        page.coloredReferenceUrl,
        page.svgTopologyUrl,
      ];
      for (const url of candidateUrls) {
        if (!url) {
          perImageMissing += 1;
          continue;
        }
        const key = urlToKey(url, dev.r2PublicUrl);
        if (!key) {
          // Foreign URL (already on prod, or external CDN). Skip.
          continue;
        }
        const r = await copyR2Object(
          devR2,
          dev.r2Bucket,
          prodR2,
          prod.r2Bucket,
          key,
          opts.dryRun,
        );
        if (r.skipped) perImageSkipped += 1;
        else if (r.copied) perImageCopied += 1;
      }
    }
    console.log(
      `[2b/5] per-image assets done: ${perImageCopied} copied, ${perImageSkipped} already-on-prod, ${perImageMissing} URL slots empty`,
    );

    // -------------------------------------------------------------------
    // Step 3: Upsert prod Bundle row.
    // -------------------------------------------------------------------
    console.log(`\n[3/5] upserting prod Bundle row...`);
    const prodBundleData = {
      slug: devBundle.slug,
      name: devBundle.name,
      tagline: devBundle.tagline,
      pageCount: devBundle.pageCount,
      pricePence: devBundle.pricePence,
      currency: devBundle.currency,
      brand: devBundle.brand,
      // Always start prod as draft. Operator flips published=true once
      // verified live.
      published: false,
      // Rewrite all dev URLs to prod hostnames.
      listingHeroUrl: rewriteHost(
        devBundle.listingHeroUrl,
        dev.r2PublicUrl,
        prod.r2PublicUrl,
      ),
      listingPageGrid1Url: rewriteHost(
        devBundle.listingPageGrid1Url,
        dev.r2PublicUrl,
        prod.r2PublicUrl,
      ),
      listingPageGrid2Url: rewriteHost(
        devBundle.listingPageGrid2Url,
        dev.r2PublicUrl,
        prod.r2PublicUrl,
      ),
      listingPageGrid3Url: rewriteHost(
        devBundle.listingPageGrid3Url,
        dev.r2PublicUrl,
        prod.r2PublicUrl,
      ),
      listingBrandCardUrl: rewriteHost(
        devBundle.listingBrandCardUrl,
        dev.r2PublicUrl,
        prod.r2PublicUrl,
      ),
      brandCharacterUrl: rewriteHost(
        devBundle.brandCharacterUrl,
        dev.r2PublicUrl,
        prod.r2PublicUrl,
      ),
    };

    if (opts.dryRun) {
      console.log(`[3/5] [dry] would upsert prod Bundle row:`, {
        slug: prodBundleData.slug,
        name: prodBundleData.name,
        listingHeroUrl: prodBundleData.listingHeroUrl,
      });
    } else {
      await prodDb.bundle.upsert({
        where: { slug: opts.slug },
        create: prodBundleData,
        update: prodBundleData,
      });
      console.log(`[3/5] prod Bundle row upserted (published=false)`);
    }

    const prodBundleRow = opts.dryRun
      ? null
      : await prodDb.bundle.findUnique({ where: { slug: opts.slug } });

    // -------------------------------------------------------------------
    // Step 4: Upsert ColoringImage rows.
    // -------------------------------------------------------------------
    console.log(
      `\n[4/5] upserting ${devBundle.pages.length} ColoringImage rows...`,
    );
    if (opts.dryRun) {
      console.log(
        `[4/5] [dry] would upsert ${devBundle.pages.length} pages with rewritten URLs`,
      );
    } else if (prodBundleRow) {
      let pageCopied = 0;
      let pageUpdated = 0;
      for (const page of devBundle.pages) {
        const existing = await prodDb.coloringImage.findUnique({
          where: { id: page.id },
        });
        const data = {
          title: page.title,
          description: page.description,
          alt: page.alt,
          tags: page.tags,
          difficulty: page.difficulty,
          generationType: page.generationType,
          status: page.status,
          purposeKey: page.purposeKey,
          bundleId: prodBundleRow.id,
          bundleOrder: page.bundleOrder,
          showInCommunity: page.showInCommunity,
          brand: page.brand,
          sourcePrompt: page.sourcePrompt,
          url: rewriteHost(page.url, dev.r2PublicUrl, prod.r2PublicUrl),
          svgUrl: rewriteHost(page.svgUrl, dev.r2PublicUrl, prod.r2PublicUrl),
          qrCodeUrl: rewriteHost(
            page.qrCodeUrl,
            dev.r2PublicUrl,
            prod.r2PublicUrl,
          ),
          regionMapUrl: rewriteHost(
            page.regionMapUrl,
            dev.r2PublicUrl,
            prod.r2PublicUrl,
          ),
          regionMapWidth: page.regionMapWidth,
          regionMapHeight: page.regionMapHeight,
          regionsJson: page.regionsJson,
          regionsGeneratedAt: page.regionsGeneratedAt,
          coloredReferenceUrl: rewriteHost(
            page.coloredReferenceUrl,
            dev.r2PublicUrl,
            prod.r2PublicUrl,
          ),
          svgTopologyUrl: rewriteHost(
            page.svgTopologyUrl,
            dev.r2PublicUrl,
            prod.r2PublicUrl,
          ),
        };
        if (existing) {
          await prodDb.coloringImage.update({ where: { id: page.id }, data });
          pageUpdated += 1;
        } else {
          await prodDb.coloringImage.create({ data: { id: page.id, ...data } });
          pageCopied += 1;
        }
      }
      console.log(`[4/5] pages: ${pageCopied} created, ${pageUpdated} updated`);
    }

    // -------------------------------------------------------------------
    // Step 5: Stripe live product.
    // -------------------------------------------------------------------
    if (opts.skipStripe) {
      console.log(`\n[5/5] Stripe SKIPPED (--skip-stripe)`);
    } else if (opts.dryRun) {
      console.log(
        `\n[5/5] [dry] would create/update Stripe product in LIVE mode (key starts with ${prod.stripeSecretKey.slice(0, 8)}...)`,
      );
    } else if (prodBundleRow) {
      if (!prod.stripeSecretKey.startsWith('sk_live_')) {
        console.warn(
          `[5/5] WARN: prod env file's STRIPE_SECRET_KEY does not start with sk_live_ — using ${prod.stripeSecretKey.slice(0, 8)}... Continuing but this will create a TEST product.`,
        );
      }
      const stripe = new Stripe(prod.stripeSecretKey);
      const lookupKey = `bundle-${opts.slug}`;

      // Look for an existing product via metadata.bundleSlug.
      const existingList = await stripe.products.search({
        query: `metadata['bundleSlug']:'${opts.slug}'`,
      });
      const existingProduct = existingList.data[0] ?? null;

      const productData = {
        name: prodBundleRow.name,
        description: `${prodBundleRow.tagline}. ${prodBundleRow.pageCount} pages, instant PDF download + online coloring.`,
        images: [
          prodBundleRow.listingHeroUrl,
          prodBundleRow.listingPageGrid1Url,
          prodBundleRow.listingPageGrid2Url,
          prodBundleRow.listingPageGrid3Url,
          prodBundleRow.listingBrandCardUrl,
        ].filter((u): u is string => !!u),
        metadata: {
          bundleSlug: prodBundleRow.slug,
          bundleId: prodBundleRow.id,
          pageCount: String(prodBundleRow.pageCount),
          brand: prodBundleRow.brand,
        },
        tax_code: 'txcd_10000000',
      };

      let product: Stripe.Product;
      if (existingProduct) {
        product = await stripe.products.update(existingProduct.id, productData);
        console.log(`[5/5] updated existing Stripe product ${product.id}`);
      } else {
        product = await stripe.products.create(productData);
        console.log(`[5/5] created Stripe product ${product.id}`);
      }

      // Reuse existing matching price; create otherwise.
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
      });
      let price = prices.data.find(
        (p) =>
          p.unit_amount === prodBundleRow.pricePence &&
          p.currency === prodBundleRow.currency,
      );
      if (!price) {
        for (const old of prices.data) {
          await stripe.prices.update(old.id, { active: false });
        }
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: prodBundleRow.pricePence,
          currency: prodBundleRow.currency,
          lookup_key: lookupKey,
          metadata: { bundleSlug: prodBundleRow.slug },
        });
        console.log(`[5/5] created Stripe price ${price.id}`);
      } else {
        console.log(`[5/5] reusing Stripe price ${price.id}`);
      }

      await prodDb.bundle.update({
        where: { id: prodBundleRow.id },
        data: {
          stripeProductId: product.id,
          stripePriceId: price.id,
        },
      });
      console.log(`[5/5] prod Bundle row updated with Stripe IDs`);
    }

    console.log(
      `\n=== Promotion complete. Bundle ${opts.slug} is on prod (DRAFT). ===`,
    );
    console.log(`\nVerify, then flip published=true on prod:`);
    console.log(
      `  UPDATE bundles SET published = true WHERE slug = '${opts.slug}';`,
    );
  } finally {
    await Promise.all([devDb.$disconnect(), prodDb.$disconnect()]);
  }
}

const args = process.argv.slice(2);
const get = (flag: string) =>
  args
    .find((a) => a.startsWith(`${flag}=`))
    ?.split('=')
    .slice(1)
    .join('=');

const slug = get('--slug');
const prodEnvFile = get('--prod-env-file');
if (!slug || !prodEnvFile) {
  throw new Error('--slug and --prod-env-file are required');
}

const dryRun = args.includes('--dry');
const skipStripe = args.includes('--skip-stripe');

promote({ slug, prodEnvFile, dryRun, skipStripe }).catch((err) => {
  console.error(err);
  process.exit(1);
});
