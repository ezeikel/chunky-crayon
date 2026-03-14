import { Skia } from "@shopify/react-native-skia";
import type { SkPaint, SkShader } from "@shopify/react-native-skia";

/**
 * Brush Texture Types
 * These provide more realistic, tactile brush effects
 */
export type TextureType = "rough" | "soft" | "grainy" | "paper";

/**
 * Crayon texture shader source (SKSL)
 * Creates a rough, waxy texture with irregular edges
 */
const crayonShaderSource = `
uniform float2 iResolution;
uniform float uSeed;
uniform float4 uColor;

// Simple noise function
float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);

  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));

  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / 8.0; // Scale the noise

  // Multiple octaves for rough texture
  float n = 0.0;
  n += noise(uv * 4.0 + uSeed) * 0.5;
  n += noise(uv * 8.0 + uSeed * 2.0) * 0.25;
  n += noise(uv * 16.0 + uSeed * 3.0) * 0.125;

  // Create rough, irregular edges (crayon-like)
  float intensity = 0.6 + n * 0.4;

  return half4(uColor.rgb * intensity, uColor.a * intensity);
}
`;

/**
 * Watercolor texture shader source (SKSL)
 * Creates a soft, bleeding effect with wet edges
 */
const watercolorShaderSource = `
uniform float2 iResolution;
uniform float uSeed;
uniform float4 uColor;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);

  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));

  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / 12.0;

  // Softer, flowing noise for watercolor
  float n = 0.0;
  n += noise(uv * 2.0 + uSeed) * 0.6;
  n += noise(uv * 4.0 + uSeed * 1.5) * 0.3;
  n += noise(uv * 6.0 + uSeed * 2.0) * 0.1;

  // Watercolor has soft, wet variations
  float intensity = 0.5 + n * 0.5;
  float alpha = uColor.a * (0.4 + n * 0.4);

  return half4(uColor.rgb * intensity, alpha);
}
`;

/**
 * Paper grain texture shader source (SKSL)
 * Creates subtle paper grain for pencil/charcoal effects
 */
const paperGrainShaderSource = `
uniform float2 iResolution;
uniform float uSeed;
uniform float4 uColor;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);

  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));

  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

half4 main(float2 fragCoord) {
  float2 uv = fragCoord / 4.0;

  // Fine grain noise for paper texture
  float n = noise(uv * 20.0 + uSeed) * 0.15;

  float intensity = 0.85 + n;

  return half4(uColor.rgb, uColor.a * intensity);
}
`;

/**
 * Cache for compiled shaders
 */
const shaderCache = new Map<
  string,
  ReturnType<typeof Skia.RuntimeEffect.Make>
>();

/**
 * Get or create a compiled shader
 */
const getShader = (
  source: string,
): ReturnType<typeof Skia.RuntimeEffect.Make> => {
  if (shaderCache.has(source)) {
    return shaderCache.get(source)!;
  }

  const shader = Skia.RuntimeEffect.Make(source);
  if (shader) {
    shaderCache.set(source, shader);
  }
  return shader;
};

/**
 * Creates a crayon texture shader
 * Gives rough, waxy appearance like real crayons
 */
export const createCrayonTextureShader = (
  color: string,
  seed: number = 0,
): SkShader | null => {
  const shader = getShader(crayonShaderSource);
  if (!shader) return null;

  const skColor = Skia.Color(color);

  return shader.makeShader([
    100,
    100, // iResolution (doesn't matter much for tiled pattern)
    seed, // uSeed for variation
    skColor[0],
    skColor[1],
    skColor[2],
    skColor[3], // uColor
  ]);
};

/**
 * Creates a watercolor texture shader
 * Gives soft, bleeding appearance like real watercolors
 */
export const createWatercolorTextureShader = (
  color: string,
  seed: number = 0,
): SkShader | null => {
  const shader = getShader(watercolorShaderSource);
  if (!shader) return null;

  const skColor = Skia.Color(color);

  return shader.makeShader([
    100,
    100,
    seed,
    skColor[0],
    skColor[1],
    skColor[2],
    skColor[3],
  ]);
};

/**
 * Creates a paper grain texture shader
 * Adds subtle texture for pencil/charcoal effects
 */
export const createPaperGrainShader = (
  color: string,
  seed: number = 0,
): SkShader | null => {
  const shader = getShader(paperGrainShaderSource);
  if (!shader) return null;

  const skColor = Skia.Color(color);

  return shader.makeShader([
    100,
    100,
    seed,
    skColor[0],
    skColor[1],
    skColor[2],
    skColor[3],
  ]);
};

/**
 * Apply texture to an existing paint object
 */
export const applyTextureToStroke = (
  paint: SkPaint,
  textureType: TextureType,
  color: string,
  seed: number = Math.random() * 100,
): SkPaint => {
  let shader: SkShader | null = null;

  switch (textureType) {
    case "rough":
      shader = createCrayonTextureShader(color, seed);
      break;
    case "soft":
      shader = createWatercolorTextureShader(color, seed);
      break;
    case "grainy":
    case "paper":
      shader = createPaperGrainShader(color, seed);
      break;
  }

  if (shader) {
    paint.setShader(shader);
  }

  return paint;
};

/**
 * Texture configuration for each brush type
 */
export const BRUSH_TEXTURE_CONFIG: Record<
  string,
  { texture: TextureType | null; intensity: number }
> = {
  crayon: { texture: "rough", intensity: 0.7 },
  marker: { texture: null, intensity: 0 }, // Markers are smooth
  pencil: { texture: "paper", intensity: 0.3 },
  rainbow: { texture: null, intensity: 0 }, // Rainbow is smooth
  glow: { texture: "soft", intensity: 0.4 },
  neon: { texture: null, intensity: 0 }, // Neon is clean
  glitter: { texture: null, intensity: 0 }, // Glitter has particles instead
};

/**
 * Check if a brush type should use textures
 */
export const brushUsesTexture = (brushType: string): boolean => {
  return BRUSH_TEXTURE_CONFIG[brushType]?.texture !== null;
};
