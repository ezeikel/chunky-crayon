/**
 * Daily scene + image metadata prompts (Chunky Crayon).
 *
 * Hoisted from apps/chunky-crayon-web/lib/ai/prompts.ts so the worker can
 * import them too — the web app re-exports for back-compat.
 */

const TARGET_AGE = "3-8 years old";

const COPYRIGHTED_CHARACTER_INSTRUCTIONS = `If the description includes a copyrighted name like Spiderman, then describe the character's physical appearance in detail instead. Describe their costume, logos, accessories, mask, eyes, muscles, etc. Specify that this must be in black and white only and simplify any complex details so that the image remains simple and avoids any complicated shapes or patterns. Update the original description replacing the copyrighted character name with this detailed description of the character. If the description does not include any copyrighted characters, then please ignore this step.`;

// =============================================================================
// Description cleanup (Claude Sonnet)
// =============================================================================

export const CLEAN_UP_DESCRIPTION_SYSTEM = `<role>Children's coloring page description editor</role>

<constraints>
- Output in English regardless of input language
- Suitable for cartoon-style line art: thick outlines, white interiors, simple shapes
- Target age: ${TARGET_AGE}
- Add a simple scene or background if not specified
- ${COPYRIGHTED_CHARACTER_INSTRUCTIONS}
</constraints>

<output_format>
Output a single English sentence of 10-40 words describing the scene. No commentary, no explanations, no preamble — just the cleaned description.
</output_format>

<examples>
<input>un dragón volando sobre un castillo</input>
<output>A friendly dragon flying over a castle with towers and a waving flag, fluffy clouds in the sky.</output>

<input>my kid wants spiderman</input>
<output>A superhero in a full-body suit with a web pattern, mask with large eyes, crouching on a rooftop above a city skyline.</output>

<input>猫</input>
<output>A cute cat sitting on a cushion next to a ball of yarn, with a window showing a sunny garden behind.</output>
</examples>`;

// =============================================================================
// Image metadata generation (vision)
// =============================================================================

/**
 * Creates a language-aware system prompt for image metadata generation.
 * When no language is specified, defaults to English.
 */
export const createImageMetadataSystemPrompt = (
  targetLanguage?: string,
  nativeName?: string,
): string => {
  const languageInstruction =
    targetLanguage && targetLanguage !== "English"
      ? `

IMPORTANT LANGUAGE REQUIREMENT:
- The "title" field MUST be in ${targetLanguage} (${nativeName}) - use natural, child-friendly expressions
- The "description", "alt", and "tags" fields MUST remain in English for consistency and filtering
- Only translate the title, nothing else`
      : "";

  return `You are an assistant that generates metadata for images to be used for SEO and accessibility. The metadata should include a title, a description, and an alt text for the image alt attribute. The information should be concise, relevant to the image, and suitable for children aged 3-8.${languageInstruction}`;
};

export const IMAGE_METADATA_SYSTEM = createImageMetadataSystemPrompt();

export const IMAGE_METADATA_PROMPT = `Generate metadata for the generated image based on the following image:`;

// =============================================================================
// Daily scene generation (Perplexity Sonar + Claude)
// =============================================================================

export const SCENE_DESCRIPTION_SYSTEM = `You are a creative director for Chunky Crayon, a children's coloring page platform (ages ${TARGET_AGE}).

Generate delightful, imaginative scene descriptions for daily coloring pages. Every scene must be child-friendly, safe, and joyful. Mix everyday activities with imaginative twists. Feature diverse characters and global perspectives. Avoid copyrighted characters.

FORBIDDEN: violence, weapons, scary elements (ghosts, skeletons, monsters), death, danger, negative emotions, romance, adult themes, politics, real-world tragedies.

OUTPUT: A vivid 1-2 sentence scene description that reads naturally as an image generation prompt. Example: "A cheerful elephant wearing rain boots, splashing in puddles while a family of frogs watches from lily pads in a rainy garden."`;

const SEED_CHARACTERS = [
  "dragon",
  "unicorn",
  "astronaut",
  "mermaid",
  "fairy",
  "robot",
  "penguin",
  "fox",
  "panda",
  "dolphin",
  "owl",
  "butterfly",
  "turtle",
  "dinosaur",
  "koala",
  "sloth",
  "capybara",
  "hedgehog",
  "seahorse",
  "ladybug",
  "phoenix",
  "pegasus",
  "octopus",
  "bee",
  "elephant",
  "giraffe",
  "monkey",
  "raccoon",
  "whale",
  "deer",
  "parrot",
  "ballerina",
  "caterpillar",
  "bear cub",
  "firefighter",
  "chef",
  "veterinarian",
];

const SEED_SETTINGS = [
  "magical forest",
  "sunny beach",
  "space station",
  "underwater reef",
  "enchanted garden",
  "treehouse",
  "cloud kingdom",
  "candy land",
  "toy workshop",
  "crystal cave",
  "dinosaur valley",
  "african savanna",
  "japanese garden",
  "rainforest canopy",
  "farm and barnyard",
  "moon base",
  "flower meadow",
  "bakery kitchen",
  "cozy library",
  "aquarium",
  "bamboo forest",
  "carnival fairground",
  "secret garden",
  "night sky observatory",
  "floating sky island",
  "coral island",
  "arctic tundra",
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const createDailyScenePrompt = (
  currentDate: string,
  upcomingEvents: Array<{
    name: string;
    themes: string[];
    childFriendlyDescription: string;
  }>,
  currentSeason: { northern: string; southern: string },
  recentPrompts: string[],
): string => {
  const seedCharacter = randomFrom(SEED_CHARACTERS);
  const seedSetting = randomFrom(SEED_SETTINGS);
  const eventsSection =
    upcomingEvents.length > 0
      ? `UPCOMING EVENTS (within the next 7 days):
${upcomingEvents.map((e) => `- ${e.name}: ${e.childFriendlyDescription} (themes: ${e.themes.join(", ")})`).join("\n")}

IMPORTANT: Pick AT MOST ONE event to theme the scene around. Do NOT mix multiple holidays or events together — a scene should feel cohesive, not like a mashup. You can also ignore all events and create a purely seasonal or everyday scene.`
      : "No major events in the next 7 days — create a fun, imaginative everyday scene.";

  const trimmedRecent = recentPrompts.slice(0, 15);
  const recentSection =
    trimmedRecent.length > 0
      ? `RECENT SCENES TO AVOID (do NOT repeat similar themes):
${trimmedRecent.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
      : "";

  return `Today is ${currentDate}.

CURRENT SEASON:
- Northern Hemisphere: ${currentSeason.northern}
- Southern Hemisphere: ${currentSeason.southern}

${eventsSection}

${recentSection}

THEME VOCABULARY (use as inspiration — mix and match, or go beyond):

Characters: dragon, unicorn, astronaut, mermaid, fairy, robot, penguin, fox, panda, dolphin, owl, butterfly, turtle, dinosaur, koala, sloth, capybara, hedgehog, seahorse, ladybug, phoenix, pegasus, octopus, bee, elephant, giraffe, monkey, raccoon, whale, deer, parrot, ballerina, caterpillar, bear cub, firefighter, chef, veterinarian, knight, pirate, lion, frog prince, genie, ninja, inventor, cat, dog, bunny, farmer, doctor

Settings: magical forest, sunny beach, space station, underwater reef, enchanted garden, treehouse, cloud kingdom, candy land, toy workshop, crystal cave, pirate ship, castle, rainbow bridge, circus big top, dinosaur valley, african savanna, japanese garden, rainforest canopy, farm and barnyard, moon base, flower meadow, bakery kitchen, cozy library, aquarium, bamboo forest, carnival fairground, secret garden, night sky observatory, floating sky island, coral island, arctic tundra

Activities: exploring, painting, building, flying, swimming, singing, gardening, cooking, camping, treasure hunting, ice skating, surfing, skateboarding, stargazing, baking, playing music, riding a bike, fossil hunting, catching fireflies, blowing bubbles, feeding animals, building a sandcastle, dancing, reading a book, picking flowers, flying a kite, decorating a cake, doing a science experiment, having a tea party, launching a rocket

CREATIVE SEED (starting point — adapt, combine, or go in a different direction):
- Character idea: ${seedCharacter}
- Setting idea: ${seedSetting}

DIVERSITY: Rotate character types (animals, children, fantasy, vehicles, nature), vary settings (indoor, outdoor, underwater, space, fantasy), include global perspectives. Avoid repeating similar scenes from the recent list above.

Search the web for any trending kids' topics, popular children's shows themes, or current events that could inspire a fun, child-friendly coloring page scene.

Generate a single, unique, delightful scene description for today's daily coloring page. Make it specific, visual, and perfect for a children's coloring book.`;
};
