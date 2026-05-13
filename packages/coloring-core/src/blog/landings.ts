/**
 * Landing-page slugs available for internal links in generated blog posts.
 *
 * Mirror of `apps/chunky-crayon-web/lib/seo/landing-pages.ts` (slug+title
 * only) so the worker can include them in the blog-generation prompt
 * without depending on the web app. Update both files together — drift is
 * low-risk (just stale link options in the prompt) but the lists should
 * stay aligned so newly-added landings get used by the cron.
 *
 * Format: { slug, title } pairs. The blog prompt picks 1-2 thematically
 * relevant slugs and emits markdown links like
 * `[anchor text](/coloring-pages/{slug})` inside the body.
 */

export type BlogLandingPage = {
  slug: string;
  title: string;
};

export const BLOG_LANDING_PAGES: BlogLandingPage[] = [
  {
    slug: "bold-and-easy-animal-coloring-pages",
    title: "Bold and Easy Animal Coloring Pages for Kids (Ages 3-8)",
  },
  {
    slug: "easy-halloween-coloring-pages-for-kids",
    title: "Easy Halloween Coloring Pages for Kids",
  },
  {
    slug: "simple-princess-coloring-pages-for-toddlers",
    title: "Simple Princess Coloring Pages for Toddlers",
  },
  {
    slug: "unicorn-coloring-pages-for-kids",
    title: "Free Unicorn Coloring Pages for Kids",
  },
  {
    slug: "cute-dinosaur-coloring-pages-for-kids",
    title: "Cute Dinosaur Coloring Pages for Kids",
  },
  {
    slug: "christmas-coloring-pages-for-preschool",
    title: "Christmas Coloring Pages for Preschool",
  },
  {
    slug: "bold-and-easy-vehicle-coloring-pages",
    title: "Bold and Easy Vehicle Coloring Pages for Kids",
  },
  {
    slug: "free-easter-coloring-pages-for-kids",
    title: "Free Easter Coloring Pages for Kids",
  },
  {
    slug: "easy-valentines-coloring-pages-for-kids",
    title: "Easy Valentine's Day Coloring Pages for Kids",
  },
  {
    slug: "simple-thanksgiving-coloring-pages-for-kids",
    title: "Simple Thanksgiving Coloring Pages for Kids",
  },
  {
    slug: "easy-back-to-school-coloring-pages-for-kids",
    title: "Easy Back to School Coloring Pages for Kids",
  },
  {
    slug: "simple-st-patricks-day-coloring-pages-for-kids",
    title: "Simple St. Patrick's Day Coloring Pages for Kids",
  },
  {
    slug: "cute-4th-of-july-coloring-pages-for-kids",
    title: "Cute 4th of July Coloring Pages for Kids",
  },
  {
    slug: "free-hanukkah-coloring-pages-for-kids",
    title: "Free Hanukkah Coloring Pages for Kids",
  },
  {
    slug: "cute-new-years-coloring-pages-for-kids",
    title: "Cute New Year's Coloring Pages for Kids",
  },
  {
    slug: "bold-and-easy-superhero-coloring-pages-for-kids",
    title: "Bold and Easy Superhero Coloring Pages for Kids",
  },
  {
    slug: "free-monster-truck-coloring-pages-for-kids",
    title: "Free Monster Truck Coloring Pages for Kids",
  },
  {
    slug: "easy-space-coloring-pages-for-kids",
    title: "Easy Space Coloring Pages for Kids",
  },
  {
    slug: "easy-construction-coloring-pages-for-kids",
    title: "Easy Construction Coloring Pages for Kids",
  },
  {
    slug: "bold-and-easy-pirate-coloring-pages-for-kids",
    title: "Bold and Easy Pirate Coloring Pages for Kids",
  },
  {
    slug: "free-dragon-coloring-pages-for-kids",
    title: "Free Dragon Coloring Pages for Kids",
  },
  {
    slug: "simple-fairy-coloring-pages-for-toddlers",
    title: "Simple Fairy Coloring Pages for Toddlers",
  },
  {
    slug: "cute-robot-coloring-pages-for-kids",
    title: "Cute Robot Coloring Pages for Kids",
  },
  {
    slug: "cute-ninja-coloring-pages-for-kids",
    title: "Cute Ninja Coloring Pages for Kids",
  },
  {
    slug: "cute-dog-coloring-pages-for-kids",
    title: "Cute Dog Coloring Pages for Kids",
  },
  {
    slug: "bold-and-easy-cat-coloring-pages-for-kids",
    title: "Bold and Easy Cat Coloring Pages for Kids",
  },
  {
    slug: "easy-horse-coloring-pages-for-kids",
    title: "Easy Horse Coloring Pages for Kids",
  },
  {
    slug: "free-fish-coloring-pages-for-kids",
    title: "Free Fish Coloring Pages for Kids",
  },
  {
    slug: "cute-butterfly-coloring-pages-for-kids",
    title: "Cute Butterfly Coloring Pages for Kids",
  },
  {
    slug: "easy-farm-animal-coloring-pages-for-kids",
    title: "Easy Farm Animal Coloring Pages for Kids",
  },
  {
    slug: "cute-elephant-coloring-pages-for-kids",
    title: "Cute Elephant Coloring Pages for Kids",
  },
  {
    slug: "free-bird-coloring-pages-for-kids",
    title: "Free Bird Coloring Pages for Kids",
  },
  {
    slug: "bold-and-easy-tiger-coloring-pages",
    title: "Bold and Easy Tiger Coloring Pages",
  },
  {
    slug: "simple-lion-coloring-pages-for-toddlers",
    title: "Simple Lion Coloring Pages for Toddlers",
  },
  {
    slug: "simple-bug-coloring-pages-for-kids",
    title: "Simple Bug Coloring Pages for Kids",
  },
  {
    slug: "free-coloring-pages-for-4-year-olds",
    title: "Free Coloring Pages for 4 Year Olds",
  },
  {
    slug: "cute-coloring-pages-for-preschoolers",
    title: "Cute Coloring Pages for Preschoolers",
  },
  {
    slug: "easy-coloring-pages-for-kindergarten",
    title: "Easy Coloring Pages for Kindergarten",
  },
  {
    slug: "bold-and-easy-coloring-pages-for-3-year-olds",
    title: "Bold and Easy Coloring Pages for 3 Year Olds",
  },
  {
    slug: "simple-animal-coloring-pages-for-2-year-olds",
    title: "Simple Animal Coloring Pages for 2 Year Olds",
  },

  // Problem-solver landings (mirror of `angle: 'problem'` entries in
  // apps/chunky-crayon-web/lib/seo/landing-pages.ts). The blog prompt
  // surfaces these so generated posts can link to them when topic-relevant.
  {
    slug: "calming-coloring-pages-for-kids-with-adhd",
    title: "Calming Coloring Pages for Kids with ADHD",
  },
  {
    slug: "focus-coloring-activities-for-adhd-children",
    title: "Focus Coloring Activities for ADHD Children",
  },
  {
    slug: "after-school-calming-coloring-for-adhd",
    title: "After-School Calming Coloring for Kids with ADHD",
  },
  {
    slug: "bedtime-coloring-routine-for-adhd-kids",
    title: "Bedtime Coloring Routine for ADHD Kids",
  },
  {
    slug: "coloring-pages-for-autistic-children",
    title: "Coloring Pages for Autistic Children",
  },
  {
    slug: "sensory-friendly-coloring-for-autism",
    title: "Sensory-Friendly Coloring for Autistic Kids",
  },
  {
    slug: "transition-coloring-activities-autism",
    title: "Transition Coloring Activities for Autistic Kids",
  },
  {
    slug: "sensory-processing-coloring-activities",
    title: "Coloring Activities for Sensory Processing",
  },
  {
    slug: "low-stimulation-coloring-for-neurodivergent",
    title: "Low-Stimulation Coloring for Neurodivergent Kids",
  },
  {
    slug: "special-interest-coloring-autistic-kids",
    title: "Special-Interest Coloring Pages for Autistic Kids",
  },
  {
    slug: "summer-holiday-coloring-activities-kids",
    title: "Summer Holiday Coloring Activities for Kids",
  },
  {
    slug: "half-term-coloring-ideas-for-kids",
    title: "Half-Term Coloring Ideas for Kids",
  },
  {
    slug: "may-half-term-activities-for-kids",
    title: "May Half-Term Activities for Children",
  },
  {
    slug: "october-half-term-coloring-pack",
    title: "October Half-Term Coloring Pack",
  },
  {
    slug: "bank-holiday-monday-kids-activities",
    title: "Bank Holiday Monday Activities for Kids",
  },
  {
    slug: "rainy-day-coloring-activities-for-kids",
    title: "Rainy Day Coloring Activities for Kids",
  },
  {
    slug: "snow-day-coloring-fun-for-children",
    title: "Snow Day Coloring Pages for Kids",
  },
  {
    slug: "back-to-school-anxiety-coloring",
    title: "Back-to-School Anxiety Coloring Pages",
  },
  {
    slug: "anxiety-coloring-pages-for-kids",
    title: "Coloring Pages for Anxious Children",
  },
  {
    slug: "anger-management-coloring-kids",
    title: "Calm-Down Coloring for Angry Kids",
  },
  {
    slug: "big-feelings-coloring-activities",
    title: "Big-Feelings Coloring Activities for Kids",
  },
  {
    slug: "new-sibling-coloring-distraction",
    title: "Coloring Activities for Kids with a New Baby Sibling",
  },
  {
    slug: "divorce-transition-coloring-kids",
    title: "Coloring Activities for Kids During Big Family Changes",
  },
  {
    slug: "quiet-classroom-coloring-activities",
    title: "Quiet Classroom Coloring Activities",
  },
  {
    slug: "quiet-time-coloring-preschool",
    title: "Quiet-Time Coloring for Preschool",
  },
  {
    slug: "occupational-therapy-coloring-sheets",
    title: "Occupational Therapy Coloring Sheets",
  },
  {
    slug: "sensory-break-coloring-classroom",
    title: "Sensory-Break Coloring for the Classroom",
  },
  {
    slug: "sensory-friendly-classroom-coloring",
    title: "Sensory-Friendly Classroom Coloring",
  },
  {
    slug: "sick-day-coloring-activities-for-kids",
    title: "Sick-Day Coloring Activities for Kids",
  },
  {
    slug: "low-energy-day-coloring-for-kids",
    title: "Low-Energy Day Coloring for Kids",
  },
  {
    slug: "hospital-waiting-room-coloring-kids",
    title: "Hospital Waiting-Room Coloring for Kids",
  },
  {
    slug: "post-illness-quiet-coloring-activities",
    title: "Post-Illness Quiet Coloring Activities",
  },
  {
    slug: "quiet-hour-coloring-after-lunch",
    title: "Quiet-Hour Coloring After Lunch",
  },
  {
    slug: "screen-free-activities-for-6-year-olds",
    title: "Screen-Free Activities for 6 Year Olds",
  },
  {
    slug: "ipad-alternatives-coloring-activities",
    title: "iPad Alternatives: Coloring Activities for Kids",
  },
  {
    slug: "no-screen-travel-coloring-pack",
    title: "No-Screen Travel Coloring Pack",
  },
  {
    slug: "digital-detox-coloring-kids",
    title: "Digital Detox Coloring Activities for Kids",
  },
  {
    slug: "evening-screen-free-coloring-routine",
    title: "Evening Screen-Free Coloring Routine",
  },
];
