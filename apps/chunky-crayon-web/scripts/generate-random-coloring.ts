#!/usr/bin/env tsx

import { GenerationType } from '@one-colored-pixel/db';
import { createColoringImage } from '@/app/actions/coloring-image';
import { sendColoringImageEmail } from '@/app/actions/email';
import { getRandomDescriptionSmart as getRandomDescription } from '@/utils/random';

type ColoringImageResult = {
  error?: string;
  credits?: number;
  id?: string;
  title?: string;
  description?: string;
  url?: string | null;
  svgUrl?: string | null;
  qrCodeUrl?: string | null;
};

const isColoringImage = (
  result: ColoringImageResult,
): result is Required<Omit<ColoringImageResult, 'error' | 'credits'>> =>
  !result.error && !!result.id;

const generateRandomColoringImageNoEmail = async (
  generationType: GenerationType,
): Promise<Required<Omit<ColoringImageResult, 'error' | 'credits'>>> => {
  const description = getRandomDescription();

  const formData = new FormData();
  formData.append('description', description);
  formData.append('generationType', generationType);

  const coloringImage = await createColoringImage(formData);

  if (!isColoringImage(coloringImage)) {
    throw new Error(
      ('error' in coloringImage && coloringImage.error) ||
        `Error generating ${generationType.toLowerCase()} coloring image`,
    );
  }

  return coloringImage;
};

const main = async () => {
  try {
    console.log('🎨 Generating random coloring image...');

    // Parse command line arguments
    const args = process.argv.slice(2);
    const generationType = (args[0] as GenerationType) || GenerationType.USER;
    const shouldEmail = args.includes('--email');

    // Validate generation type
    if (!Object.values(GenerationType).includes(generationType)) {
      console.error(`❌ Invalid generation type: ${generationType}`);
      console.error(`Valid types: ${Object.values(GenerationType).join(', ')}`);
      console.error(
        'Usage: pnpm run generate-random-coloring [TYPE] [--email]',
      );
      process.exit(1);
    }

    const coloringImage =
      await generateRandomColoringImageNoEmail(generationType);

    console.log('✅ Random coloring image generated successfully!');
    console.log(`📄 Title: ${coloringImage.title}`);
    console.log(`📝 Description: ${coloringImage.description}`);
    console.log(`🔗 Image URL: ${coloringImage.url}`);
    console.log(`🎯 SVG URL: ${coloringImage.svgUrl}`);
    console.log(`📱 QR Code URL: ${coloringImage.qrCodeUrl}`);
    console.log(`🆔 ID: ${coloringImage.id}`);

    if (shouldEmail) {
      console.log('📧 Sending email to mailing list...');

      await sendColoringImageEmail(coloringImage, generationType);

      console.log('✅ Emails sent to mailing list!');
    } else {
      console.log('💡 Use --email flag to send to mailing list');
    }
  } catch (error) {
    console.error('❌ Error generating random coloring image:', error);
    process.exit(1);
  }
};

main();
