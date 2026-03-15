/**
 * Prompt templates for audio generation
 */

/**
 * Create an ambient sound prompt based on the coloring image
 *
 * Transforms the image title/tags into a calming ambient soundscape
 * suitable for children to listen to while coloring.
 */
export function createAmbientPrompt(title: string, tags: string[]): string {
  // Base ambient qualities for a calming coloring experience
  const baseQualities =
    'gentle, calming, peaceful, soft, child-friendly background ambience';

  // Extract key themes from title and tags for context
  const themes = [title.toLowerCase(), ...tags.slice(0, 3)].join(', ');

  // Nature and environment sounds work best for ambient loops
  return `${baseQualities}. Ambient soundscape inspired by: ${themes}. Seamless loop, no harsh sounds, no music, just soothing environmental atmosphere.`;
}
