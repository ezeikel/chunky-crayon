import { put } from '@vercel/blob';
import { chromium } from 'playwright';
import chromiumPkg from '@sparticuz/chromium';
import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import sharp from 'sharp';
import potrace from 'oslllo-potrace';
import * as Sentry from '@sentry/nextjs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type CheckSvgImageResult = {
  isValid: boolean;
};

type RetraceImageResult = {
  svgUrl: string;
};

export const traceImage = async (imageBuffer: ArrayBuffer): Promise<string> => {
  const buffer = Buffer.from(imageBuffer);

  return new Promise((resolve, reject) => {
    sharp(buffer)
      .flatten({ background: '#ffffff' })
      .resize({ width: 1024 })
      .grayscale()
      .normalize()
      .linear(1.3, -40)
      .threshold(210)
      .toFormat('png')
      .toBuffer(async (err, pngBuffer) => {
        if (err) {
          reject(err);
        } else {
          const traced = await potrace(Buffer.from(pngBuffer), {
            threshold: 200,
            optimizeImage: true,
            turnPolicy: 'majority',
          }).trace();
          resolve(traced);
        }
      });
  });
};

export const checkSvgImage = async (
  svgUrl: string,
): Promise<CheckSvgImageResult> => {
  // launch browser and take screenshot
  const browser = await chromium.launch({
    executablePath: await chromiumPkg.executablePath(),
    headless: true,
    args: [...chromiumPkg.args, '--no-sandbox'],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(svgUrl);
  const screenshot = await page.screenshot();
  await browser.close();

  // convert screenshot to base64 for OpenAI API
  const base64Screenshot = screenshot.toString('base64');
  const dataUrl = `data:image/png;base64,${base64Screenshot}`;

  // check if traced image is blank
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: zodResponseFormat(
      z.object({
        hasBlackLeftWhiteRight: z.boolean(),
      }),
      'hasBlackLeftWhiteRight',
    ),
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that analyzes images. You check if an image shows a solid black area on the left side and a white strip on the right side.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Does this image show a solid black area on the left and a white strip on the right? Return true if yes, false otherwise.',
          },
          {
            type: 'image_url',
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ],
  });

  const { hasBlackLeftWhiteRight } = JSON.parse(
    response.choices[0].message.content as string,
  );

  const isValid = !hasBlackLeftWhiteRight;

  if (!isValid) {
    Sentry.captureMessage('Invalid SVG image', {
      level: 'error',
      extra: {
        svgUrl,
        dataUrl,
      },
    });
  }

  return {
    isValid,
  };
};

export const retraceImage = async (
  id: string,
  imageUrl: string,
): Promise<RetraceImageResult> => {
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const newSvg = await traceImage(imageBuffer);

  const newSvgBuffer = Buffer.from(newSvg);

  // overwrite the old svg with the new svg in blob storage
  const newSvgFileName = `uploads/coloring-images/${id}/image.svg`;
  await put(newSvgFileName, newSvgBuffer, {
    access: 'public',
    allowOverwrite: true,
  });

  return {
    svgUrl: newSvgFileName,
  };
};

export default traceImage;
