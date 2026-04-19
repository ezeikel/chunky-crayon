'use server';

import {
  transcribeAudioLogic,
  describeImageLogic,
} from '@one-colored-pixel/coloring-core';
import {
  AUDIO_TRANSCRIPTION_SYSTEM,
  AUDIO_TRANSCRIPTION_PROMPT,
  IMAGE_DESCRIPTION_SYSTEM,
  IMAGE_DESCRIPTION_PROMPT,
  getTracedModels,
} from '@/lib/ai';
import { ACTIONS } from '@/constants';
import { getUserId } from '@/app/actions/user';

export type {
  TranscribeAudioResult,
  DescribeImageResult,
} from '@one-colored-pixel/coloring-core';

const config = {
  audioTranscriptionSystem: AUDIO_TRANSCRIPTION_SYSTEM,
  audioTranscriptionPrompt: AUDIO_TRANSCRIPTION_PROMPT,
  imageDescriptionSystem: IMAGE_DESCRIPTION_SYSTEM,
  imageDescriptionPrompt: IMAGE_DESCRIPTION_PROMPT,
};

export async function transcribeAudio(formData: FormData) {
  const userId = await getUserId(ACTIONS.TRANSCRIBE_AUDIO);
  const { analytics } = getTracedModels({
    userId: userId ?? undefined,
    properties: { action: 'audio-transcription', inputType: 'voice' },
  });
  return transcribeAudioLogic(formData, config, analytics);
}

export async function describeImage(formData: FormData) {
  const userId = await getUserId(ACTIONS.DESCRIBE_IMAGE);
  const { analytics } = getTracedModels({
    userId: userId ?? undefined,
    properties: { action: 'image-description', inputType: 'image' },
  });
  return describeImageLogic(formData, config, analytics);
}
