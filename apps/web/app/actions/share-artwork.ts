'use server';

import { put } from '@/lib/storage';
import { randomUUID } from 'crypto';

type ShareArtworkResult =
  | { success: true; imageUrl: string }
  | { success: false; error: string };

/**
 * Upload artwork for sharing on social media
 * Creates a temporary public URL for the colored artwork
 * @param imageDataUrl - The base64 data URL of the colored canvas
 */
export async function uploadArtworkForSharing(
  imageDataUrl: string,
): Promise<ShareArtworkResult> {
  try {
    // Validate data URL
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
      return { success: false, error: 'Invalid image data' };
    }

    // Convert data URL to buffer
    const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename for temporary sharing
    const shareId = randomUUID();
    const fileName = `uploads/shared-artwork/${shareId}.png`;

    // Upload to Vercel Blob
    const { url: imageUrl } = await put(fileName, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });

    return {
      success: true,
      imageUrl,
    };
  } catch (error) {
    console.error('Error uploading artwork for sharing:', error);
    return {
      success: false,
      error: 'Failed to prepare artwork for sharing',
    };
  }
}
