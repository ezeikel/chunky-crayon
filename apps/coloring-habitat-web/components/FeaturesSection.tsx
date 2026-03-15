import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWandMagicSparkles,
  faPaintbrush,
  faDownload,
  faSeedling,
} from "@fortawesome/free-solid-svg-icons";

const steps = [
  {
    icon: faWandMagicSparkles,
    title: "Describe your vision",
    description:
      "Type a prompt, speak aloud, or upload a photo. We turn your imagination into a unique, intricate design.",
  },
  {
    icon: faPaintbrush,
    title: "Color digitally or print",
    description:
      "Use our calming online canvas, or download high-res PDFs for your favorite real pencils.",
  },
  {
    icon: faDownload,
    title: "Save and share",
    description:
      "Keep a personal gallery of your finished work, or share your creations with the community.",
  },
  {
    icon: faSeedling,
    title: "Build a daily habit",
    description:
      "A free coloring page every morning. Five minutes of calm to start your day right.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="border-t border-border bg-secondary py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: image */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <Image
                src="/images/hero-coloring.jpg"
                alt="Close-up of hands coloring an intricate mandala with colored pencils"
                width={640}
                height={480}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -right-2 rounded-xl border border-border bg-background px-5 py-3 shadow-lg sm:right-6">
              <p className="text-2xl font-extrabold text-foreground">68%</p>
              <p className="text-xs text-muted-foreground">
                stress reduction reported
              </p>
            </div>
          </div>

          {/* Right: heading */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl">
              Your creative wellness toolkit
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Research shows coloring activates the same calming neural pathways
              as meditation. We make it effortless to build a daily creative
              practice.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                <FontAwesomeIcon icon={step.icon} size="sm" />
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {"Step " + (i + 1)}
              </p>
              <h3 className="mt-2 text-base font-bold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
