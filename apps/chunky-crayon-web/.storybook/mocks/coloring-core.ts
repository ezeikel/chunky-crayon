export type ImageQuality = 'low' | 'medium' | 'high';

export const IMAGE_QUALITY_TIERS = {
  low: {
    value: 'low',
    label: 'Fast',
    shortLabel: 'Fast',
    description: 'Quick draft quality',
    approxWait: 'About a minute',
  },
  medium: {
    value: 'medium',
    label: 'Better',
    shortLabel: 'Better',
    description: 'Balanced quality',
    approxWait: 'A little longer',
  },
  high: {
    value: 'high',
    label: 'Best',
    shortLabel: 'Best',
    description: 'Highest quality',
    approxWait: 'Longest wait',
  },
};

export const DEFAULT_QUALITY_FOR_GUEST = 'low';
export const DEFAULT_QUALITY_FOR_FREE = 'low';
export const DEFAULT_QUALITY_FOR_SUBSCRIBER = 'medium';
export const ALLOWED_QUALITY_FOR_GUEST = ['low'];
export const ALLOWED_QUALITY_FOR_FREE = ['low'];
export const ALLOWED_QUALITY_FOR_SUBSCRIBER = ['low', 'medium', 'high'];
export const resolveDefaultQuality = () => 'low';
export const clampQuality = (quality: ImageQuality) => quality;

export const MODEL_IDS = {};
export const IMAGE_DEFAULTS = {};
export const models = {};
export const getImageModel = () => 'storybook-image-model';
export const getImageQualityModel = () => 'storybook-image-model';
export const withAITracing = <T>(model: T) => model;
export const getTracedModels = () => ({});
export const NO_EM_DASHES_RULE = 'Avoid em dashes.';
export const REFERENCE_IMAGES = {};
export const getReferenceImages = () => [];
export const analyzeImageForAnalytics = async () => ({
  dominantStyle: 'storybook',
  difficulty: 'BEGINNER',
});
export const generateAnimationPromptFromImage = async () =>
  'A gentle storybook animation prompt.';
export const createImageGenerationPipeline = () => ({
  generate: async () => ({ ok: true, imageUrl: '/images/colo.svg' }),
});
export const generateAnimationFromImage = async () => ({ ok: true });
export const pollForVideoCompletion = async () => ({ ok: true });
export const downloadVideoFromUri = async () => new ArrayBuffer(0);
export const fetchImageAsBase64 = async () => '';
export const isVideoGenerationAvailable = () => false;
