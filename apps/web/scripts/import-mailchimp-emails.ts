/**
 * Import Mailchimp emails to Upstash Redis
 *
 * Usage:
 * 1. Export your Mailchimp audience as CSV
 * 2. Place the CSV file in the scripts directory
 * 3. Run: pnpm tsx scripts/import-mailchimp-emails.ts ./path-to-your-csv.csv
 *
 * Expected CSV format (Mailchimp default export):
 * - Must have "Email Address" column
 * - Optional: "MEMBER_RATING", "OPTIN_TIME", "First Name", "Last Name"
 */

import { Redis } from '@upstash/redis';
import * as fs from 'node:fs';
import * as readline from 'node:readline';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const REDIS_KEYS = {
  EMAILS_SET: 'coloringlist:emails',
  EMAIL_META: (email: string) => `coloringlist:meta:${email}`,
} as const;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function importFromCSV(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let emailIndex = -1;
  let optinTimeIndex = -1;
  let imported = 0;
  let skipped = 0;
  let lineNumber = 0;

  console.log('📧 Starting Mailchimp import...\n');

  for await (const line of rl) {
    lineNumber++;

    // Parse header row
    if (lineNumber === 1) {
      headers = parseCSVLine(line);
      emailIndex = headers.findIndex(
        (h) =>
          h.toLowerCase() === 'email address' || h.toLowerCase() === 'email',
      );
      optinTimeIndex = headers.findIndex(
        (h) =>
          h.toLowerCase() === 'optin_time' || h.toLowerCase() === 'opt-in time',
      );

      if (emailIndex === -1) {
        console.error('❌ CSV must have an "Email Address" or "email" column');
        process.exit(1);
      }

      console.log(`📋 Found columns: ${headers.join(', ')}`);
      console.log(`📍 Email column index: ${emailIndex}\n`);
      continue;
    }

    const columns = parseCSVLine(line);
    const rawEmail = columns[emailIndex];

    if (!rawEmail || !rawEmail.includes('@')) {
      skipped++;
      continue;
    }

    const email = normalizeEmail(rawEmail);

    // Add to Redis set
    await redis.sadd(REDIS_KEYS.EMAILS_SET, email);

    // Add metadata
    const metadata: Record<string, string | number> = {
      source: 'mailchimp_import',
      tsImported: Date.now(),
    };

    // Add optin time if available
    if (optinTimeIndex !== -1 && columns[optinTimeIndex]) {
      const optinDate = new Date(columns[optinTimeIndex]);
      if (!isNaN(optinDate.getTime())) {
        metadata.tsJoined = optinDate.getTime();
      }
    }

    await redis.hset(REDIS_KEYS.EMAIL_META(email), metadata);

    imported++;

    if (imported % 50 === 0) {
      console.log(`📧 Imported ${imported} emails...`);
    }
  }

  console.log('\n✅ Import complete!');
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped: ${skipped}`);

  // Verify total count
  const totalInRedis = await redis.scard(REDIS_KEYS.EMAILS_SET);
  console.log(`   Total in Redis: ${totalInRedis}`);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      // Escaped quote
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Main execution
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(
    'Usage: pnpm tsx scripts/import-mailchimp-emails.ts <csv-file-path>',
  );
  console.log(
    'Example: pnpm tsx scripts/import-mailchimp-emails.ts ./mailchimp-export.csv',
  );
  process.exit(1);
}

importFromCSV(args[0]);
