import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faPaw,
  faDog,
  faCat,
  faHorse,
  faFish,
  faBugs,
  faDragon,
  faDove,
  faSparkles as faButterfly,
  faElephant,
  faGhost,
  faSnowman,
  faStarOfDavid,
  faChampagneGlasses,
  faPumpkin,
  faEgg,
  faHeart,
  faLeaf,
  faTurkey,
  faClover,
  faFlagUsa,
  faTreeChristmas,
  faCrown,
  faHatWizard,
  faMaskSnorkel,
  faMask,
  faMugSaucer,
  faRocket,
  faTruckPickup,
  faTruckMonster,
  faCarSide,
  faRobot,
  faUserNinja,
  faMaskFace,
  faWandMagicSparkles as faFairy,
  faChild,
  faChildReaching,
  faBaby,
  faTrain,
  faBrain,
  faBrainCircuit,
  faSnowflake,
  faCloudRain,
  faSun,
  faMoonStars,
  faStars,
  faSpa,
  faHandHoldingHeart,
  faHandsHoldingChild,
  faHospital,
  faBed,
  faTabletScreenButton,
  faMobileScreenButton,
  faSchool,
  faSchoolFlag,
  faBookOpen,
  faPencil,
  faChalkboardUser,
  faPersonChalkboard,
  faFaceSmile,
  faFaceWorried,
  faFaceAngry,
  faHouseChimneyUser,
  faPeopleRoof,
  faBabyCarriage,
  faPlaneDeparture,
  faMountainSun,
  faIceCream,
  faKite,
  faUmbrellaBeach,
  faTooth,
  faClock,
  faBolt,
  faCalendarDays,
  faStar,
  faShapes,
} from '@fortawesome/pro-duotone-svg-icons';

/**
 * Per-landing icon + brand-aligned color, picked from FontAwesome
 * duotone (per the audience-aware UI memory — duotone over emojis).
 *
 * Keyed by slug. The mapping is data, not code — keeping it in a
 * separate file means landing-pages.ts stays focused on copy and this
 * file stays focused on visual presentation.
 *
 * Colors vary per landing/cluster so the index page reads as a varied
 * palette, not a wall of crayon-orange.
 */
type LandingIcon = {
  icon: IconDefinition;
  /** Hex color for the icon. Pick from CC brand palette + complements. */
  color: string;
};

// Brand palette references (mirrored from tailwind config):
//   crayon-orange    #DA7353 — primary
//   crayon-purple    #7B5AA6
//   crayon-yellow    #F4C95D
//   crayon-green     #6BAE7B
//   crayon-blue      #5B9BD5
//   crayon-pink      #E8829E
//   crayon-brown     #8B6F47
//   crayon-coral     #EDAF8B

const PALETTE = {
  orange: '#DA7353',
  purple: '#7B5AA6',
  yellow: '#F4C95D',
  green: '#6BAE7B',
  blue: '#5B9BD5',
  pink: '#E8829E',
  brown: '#8B6F47',
  coral: '#EDAF8B',
} as const;

/**
 * Slug → icon + color. Add new landings here when adding to landing-pages.ts.
 * Unknown slugs fall back to a generic icon.
 */
const ICON_MAP: Record<string, LandingIcon> = {
  // Theme: animals
  'bold-and-easy-animal-coloring-pages': { icon: faPaw, color: PALETTE.orange },
  'cute-dinosaur-coloring-pages-for-kids': {
    icon: faDragon,
    color: PALETTE.green,
  },
  'unicorn-coloring-pages-for-kids': { icon: faHorse, color: PALETTE.pink },
  'cute-dog-coloring-pages-for-kids': { icon: faDog, color: PALETTE.brown },
  'bold-and-easy-cat-coloring-pages-for-kids': {
    icon: faCat,
    color: PALETTE.purple,
  },
  'easy-horse-coloring-pages-for-kids': { icon: faHorse, color: PALETTE.brown },
  'free-fish-coloring-pages-for-kids': { icon: faFish, color: PALETTE.blue },
  'cute-butterfly-coloring-pages-for-kids': {
    icon: faButterfly,
    color: PALETTE.pink,
  },
  'easy-farm-animal-coloring-pages-for-kids': {
    icon: faPaw,
    color: PALETTE.green,
  },
  'cute-elephant-coloring-pages-for-kids': {
    icon: faElephant,
    color: PALETTE.blue,
  },
  'free-bird-coloring-pages-for-kids': { icon: faDove, color: PALETTE.coral },
  'bold-and-easy-tiger-coloring-pages': { icon: faPaw, color: PALETTE.orange },
  'simple-lion-coloring-pages-for-toddlers': {
    icon: faPaw,
    color: PALETTE.yellow,
  },
  'simple-bug-coloring-pages-for-kids': { icon: faBugs, color: PALETTE.green },
  'free-dragon-coloring-pages-for-kids': {
    icon: faDragon,
    color: PALETTE.purple,
  },

  // Theme: holidays / seasonal
  'easy-halloween-coloring-pages-for-kids': {
    icon: faGhost,
    color: PALETTE.purple,
  },
  'christmas-coloring-pages-for-preschool': {
    icon: faTreeChristmas,
    color: PALETTE.green,
  },
  'free-easter-coloring-pages-for-kids': { icon: faEgg, color: PALETTE.pink },
  'easy-valentines-coloring-pages-for-kids': {
    icon: faHeart,
    color: PALETTE.pink,
  },
  'simple-thanksgiving-coloring-pages-for-kids': {
    icon: faTurkey,
    color: PALETTE.brown,
  },
  'easy-back-to-school-coloring-pages-for-kids': {
    icon: faSchool,
    color: PALETTE.orange,
  },
  'simple-st-patricks-day-coloring-pages-for-kids': {
    icon: faClover,
    color: PALETTE.green,
  },
  'cute-4th-of-july-coloring-pages-for-kids': {
    icon: faFlagUsa,
    color: PALETTE.blue,
  },
  'free-hanukkah-coloring-pages-for-kids': {
    icon: faStarOfDavid,
    color: PALETTE.blue,
  },
  'cute-new-years-coloring-pages-for-kids': {
    icon: faChampagneGlasses,
    color: PALETTE.yellow,
  },

  // Theme: characters / fun
  'simple-princess-coloring-pages-for-toddlers': {
    icon: faCrown,
    color: PALETTE.pink,
  },
  'bold-and-easy-superhero-coloring-pages-for-kids': {
    icon: faMask,
    color: PALETTE.blue,
  },
  'free-monster-truck-coloring-pages-for-kids': {
    icon: faTruckMonster,
    color: PALETTE.orange,
  },
  'easy-space-coloring-pages-for-kids': {
    icon: faRocket,
    color: PALETTE.purple,
  },
  'easy-construction-coloring-pages-for-kids': {
    icon: faTruckPickup,
    color: PALETTE.yellow,
  },
  'bold-and-easy-pirate-coloring-pages-for-kids': {
    icon: faMaskSnorkel,
    color: PALETTE.brown,
  },
  'simple-fairy-coloring-pages-for-toddlers': {
    icon: faFairy,
    color: PALETTE.pink,
  },
  'cute-robot-coloring-pages-for-kids': { icon: faRobot, color: PALETTE.blue },
  'cute-ninja-coloring-pages-for-kids': {
    icon: faUserNinja,
    color: PALETTE.purple,
  },
  'bold-and-easy-vehicle-coloring-pages': {
    icon: faCarSide,
    color: PALETTE.orange,
  },

  // Theme: age-specific
  'free-coloring-pages-for-4-year-olds': {
    icon: faChild,
    color: PALETTE.coral,
  },
  'cute-coloring-pages-for-preschoolers': {
    icon: faChildReaching,
    color: PALETTE.pink,
  },
  'easy-coloring-pages-for-kindergarten': {
    icon: faPencil,
    color: PALETTE.yellow,
  },
  'bold-and-easy-coloring-pages-for-3-year-olds': {
    icon: faChild,
    color: PALETTE.orange,
  },
  'simple-animal-coloring-pages-for-2-year-olds': {
    icon: faBaby,
    color: PALETTE.coral,
  },

  // Problem: neurodivergent (ADHD / autism / sensory)
  'calming-coloring-pages-for-kids-with-adhd': {
    icon: faSpa,
    color: PALETTE.green,
  },
  'focus-coloring-activities-for-adhd-children': {
    icon: faBrainCircuit,
    color: PALETTE.purple,
  },
  'after-school-calming-coloring-for-adhd': {
    icon: faClock,
    color: PALETTE.orange,
  },
  'bedtime-coloring-routine-for-adhd-kids': {
    icon: faMoonStars,
    color: PALETTE.purple,
  },
  'coloring-pages-for-autistic-children': {
    icon: faShapes,
    color: PALETTE.blue,
  },
  'sensory-friendly-coloring-for-autism': {
    icon: faHandHoldingHeart,
    color: PALETTE.coral,
  },
  'transition-coloring-activities-autism': {
    icon: faClock,
    color: PALETTE.blue,
  },
  'sensory-processing-coloring-activities': {
    icon: faHandsHoldingChild,
    color: PALETTE.green,
  },
  'low-stimulation-coloring-for-neurodivergent': {
    icon: faBrain,
    color: PALETTE.coral,
  },
  'special-interest-coloring-autistic-kids': {
    icon: faTrain,
    color: PALETTE.purple,
  },

  // Problem: school holiday / boredom
  'summer-holiday-coloring-activities-kids': {
    icon: faUmbrellaBeach,
    color: PALETTE.yellow,
  },
  'half-term-coloring-ideas-for-kids': {
    icon: faCalendarDays,
    color: PALETTE.orange,
  },
  'may-half-term-activities-for-kids': { icon: faKite, color: PALETTE.pink },
  'october-half-term-coloring-pack': { icon: faPumpkin, color: PALETTE.orange },
  'bank-holiday-monday-kids-activities': { icon: faSun, color: PALETTE.yellow },
  'rainy-day-coloring-activities-for-kids': {
    icon: faCloudRain,
    color: PALETTE.blue,
  },
  'snow-day-coloring-fun-for-children': {
    icon: faSnowflake,
    color: PALETTE.blue,
  },

  // Problem: emotional regulation
  'back-to-school-anxiety-coloring': {
    icon: faSchoolFlag,
    color: PALETTE.coral,
  },
  'anxiety-coloring-pages-for-kids': {
    icon: faFaceWorried,
    color: PALETTE.blue,
  },
  'anger-management-coloring-kids': {
    icon: faFaceAngry,
    color: PALETTE.orange,
  },
  'big-feelings-coloring-activities': {
    icon: faFaceSmile,
    color: PALETTE.yellow,
  },
  'new-sibling-coloring-distraction': {
    icon: faBabyCarriage,
    color: PALETTE.pink,
  },
  'divorce-transition-coloring-kids': {
    icon: faPeopleRoof,
    color: PALETTE.coral,
  },

  // Problem: sensory / classroom
  'quiet-classroom-coloring-activities': {
    icon: faChalkboardUser,
    color: PALETTE.green,
  },
  'quiet-time-coloring-preschool': { icon: faBookOpen, color: PALETTE.coral },
  'occupational-therapy-coloring-sheets': {
    icon: faPersonChalkboard,
    color: PALETTE.purple,
  },
  'sensory-break-coloring-classroom': { icon: faBolt, color: PALETTE.yellow },
  'sensory-friendly-classroom-coloring': {
    icon: faShapes,
    color: PALETTE.blue,
  },

  // Problem: sick day / quiet day
  'sick-day-coloring-activities-for-kids': {
    icon: faBed,
    color: PALETTE.coral,
  },
  'low-energy-day-coloring-for-kids': {
    icon: faMugSaucer,
    color: PALETTE.brown,
  },
  'hospital-waiting-room-coloring-kids': {
    icon: faHospital,
    color: PALETTE.blue,
  },
  'post-illness-quiet-coloring-activities': {
    icon: faTooth,
    color: PALETTE.coral,
  },
  'quiet-hour-coloring-after-lunch': {
    icon: faMugSaucer,
    color: PALETTE.yellow,
  },

  // Problem: screen replacement
  'screen-free-activities-for-6-year-olds': {
    icon: faTabletScreenButton,
    color: PALETTE.green,
  },
  'ipad-alternatives-coloring-activities': {
    icon: faTabletScreenButton,
    color: PALETTE.purple,
  },
  'no-screen-travel-coloring-pack': {
    icon: faPlaneDeparture,
    color: PALETTE.blue,
  },
  'digital-detox-coloring-kids': {
    icon: faMobileScreenButton,
    color: PALETTE.green,
  },
  'evening-screen-free-coloring-routine': {
    icon: faStars,
    color: PALETTE.purple,
  },
};

const FALLBACK: LandingIcon = { icon: faStar, color: PALETTE.orange };

/**
 * Returns the icon + color for a landing slug. Falls back to a generic
 * orange star for slugs that haven't been mapped yet — safe to ship a
 * new landing without touching this file, the index page just renders
 * the fallback until you add the mapping.
 */
export const getLandingIcon = (slug: string): LandingIcon =>
  ICON_MAP[slug] ?? FALLBACK;
