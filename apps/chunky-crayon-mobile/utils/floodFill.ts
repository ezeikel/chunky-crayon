import { SkImage, Skia } from "@shopify/react-native-skia";
import { hexToRgb } from "./floodFillCore";
import { floodFillOffThread } from "./floodFillRuntime";

export type FloodFillResult = {
  image: SkImage;
  filledPixelCount: number;
};

/**
 * Flood fill a Skia image at (startX, startY) with `fillColorHex`.
 *
 * Skia work (readPixels / MakeImage) stays on the JS thread because Skia
 * objects can't cross a worklet runtime boundary. The raw RGBA byte buffer is
 * handed to floodFillOffThread, which runs the scanline fill on a dedicated
 * background thread (via a Synchronizable) and returns the filled bytes.
 */
export const floodFill = async (
  image: SkImage,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance: number = 32,
): Promise<FloodFillResult | null> => {
  const width = image.width();
  const height = image.height();

  // Read the full RGBA_8888 (unpremul) buffer once on the JS thread.
  const pixelData = image.readPixels(0, 0, {
    width,
    height,
    colorType: 4, // RGBA_8888
    alphaType: 1, // Unpremul
  });

  if (!pixelData) {
    console.warn("Failed to read pixel data from image");
    return null;
  }

  // readPixels returns a Uint8Array VIEW whose backing ArrayBuffer can be
  // larger than the view (pooled / non-zero byteOffset). Copy an exact,
  // zero-offset width*height*4 buffer so its length is unambiguous.
  const expectedLen = width * height * 4;
  const bytes = pixelData as Uint8Array;
  const exact = new Uint8Array(expectedLen);
  exact.set(
    bytes.byteLength === expectedLen ? bytes : bytes.subarray(0, expectedLen),
  );
  const rgb = hexToRgb(fillColorHex);

  const { filled, pixels } = await floodFillOffThread(
    exact,
    width,
    height,
    startX,
    startY,
    rgb,
    tolerance,
  );

  if (filled === 0 || !pixels) {
    return null;
  }

  const data = Skia.Data.fromBytes(pixels);
  const newImage = Skia.Image.MakeImage(
    {
      width,
      height,
      colorType: 4, // RGBA_8888
      alphaType: 1, // Unpremul
    },
    data,
    width * 4,
  );

  if (!newImage) {
    console.warn("Failed to create image from filled pixels");
    return null;
  }

  return { image: newImage, filledPixelCount: filled };
};

/**
 * Creates a snapshot of the canvas as a Skia Image
 */
export const createCanvasSnapshot = async (
  canvasRef: React.RefObject<{ makeImageSnapshot: () => SkImage | null }>,
): Promise<SkImage | null> => {
  if (!canvasRef.current) return null;
  return canvasRef.current.makeImageSnapshot();
};
