import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMicrophone,
  faWandMagicSparkles,
  faPalette,
} from '@fortawesome/pro-duotone-svg-icons';

type Step = {
  title: string;
  body: string;
};

type StartHowItWorksProps = {
  title: string;
  steps: {
    describe: Step;
    draw: Step;
    color: Step;
  };
};

// Three-step visual explainer. Icons intentionally match the form's
// input-mode iconography (mic / wand / palette) so when the user tries
// the product it feels familiar.
export default function StartHowItWorks({
  title,
  steps,
}: StartHowItWorksProps) {
  const items = [
    {
      ...steps.describe,
      icon: faMicrophone,
      accent: 'bg-crayon-pink-light/40',
    },
    {
      ...steps.draw,
      icon: faWandMagicSparkles,
      accent: 'bg-crayon-orange-light/40',
    },
    {
      ...steps.color,
      icon: faPalette,
      accent: 'bg-crayon-yellow-light/60',
    },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="px-4 md:px-6 lg:px-8">
        <h2 className="font-tondo font-bold text-text-primary text-center text-[clamp(1.75rem,4vw,2.75rem)] leading-tight tracking-tight mb-12 md:mb-16">
          {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          {items.map((step, idx) => (
            <div key={step.title} className="text-center">
              <div className="relative inline-flex items-center justify-center mb-5">
                <div
                  className={`absolute inset-0 ${step.accent} rounded-full blur-xl`}
                  aria-hidden
                />
                <div className="relative w-16 h-16 rounded-full bg-white border-2 border-paper-cream-dark shadow-sm flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={step.icon}
                    className="text-2xl text-crayon-orange"
                  />
                </div>
                <span
                  aria-hidden
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-crayon-orange text-white font-tondo font-bold text-sm flex items-center justify-center shadow-sm"
                >
                  {idx + 1}
                </span>
              </div>
              <h3 className="font-tondo font-bold text-text-primary text-xl mb-2">
                {step.title}
              </h3>
              <p className="font-rooney-sans text-base text-text-secondary leading-snug max-w-xs mx-auto">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
