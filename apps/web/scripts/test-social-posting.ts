#!/usr/bin/env tsx

import { config } from 'dotenv';
import { GenerationType } from '@chunky-crayon/db';
import { db } from '@chunky-crayon/db';

// Load environment variables from .env.local
config({ path: '.env.local' });

const testSocialPosting = async () => {
  try {
    console.log('🧪 Testing Social Media Posting for Coloring Pages...\n');

    // Get a recent coloring image to test with
    const coloringImage = await db.coloringImage.findFirst({
      where: {
        generationType: GenerationType.DAILY,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!coloringImage) {
      console.error('❌ No coloring images found to test with');
      console.log('💡 Try running: pnpm run api:generate first');
      return;
    }

    console.log(`🎨 Testing with coloring image: "${coloringImage.title}"`);
    console.log(`📝 Description: ${coloringImage.description}`);
    console.log(`🏷️  Tags: ${coloringImage.tags?.join(', ')}\n`);

    // Test social media posting by calling the endpoint directly
    console.log('🚀 Calling /api/social/post...');

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/social/post`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP ${response.status}: ${errorText}`);
      return;
    }

    const result = await response.json();

    console.log('\n📊 Results:');
    console.log('Success:', result.success);

    if (result.results) {
      if (result.results.instagram) {
        console.log('\n📱 Instagram:');
        console.log('  Result:', result.results.instagram);
      }

      if (result.results.facebook) {
        console.log('\n📘 Facebook:');
        console.log('  Result:', result.results.facebook);
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.forEach((error: string) => {
          console.log(`  • ${error}`);
        });
      }
    }

    if (result.message) {
      console.log('\n💬 Message:', result.message);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testSocialPosting()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
