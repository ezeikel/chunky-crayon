type Feature = {
  title: string;
  body: string;
};

type StartFeaturesProps = {
  title: string;
  items: {
    unlimited: Feature;
    print: Feature;
    daily: Feature;
  };
};

// Three cards of product features. Kept deliberately short — landing
// pages drop people fast if they're reading bullet-point lists. Parents
// who want more go to /pricing.
export default function StartFeatures({ title, items }: StartFeaturesProps) {
  const features = [items.unlimited, items.print, items.daily];

  return (
    <section className="bg-paper-cream py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="font-tondo font-bold text-text-primary text-center text-[clamp(1.75rem,4vw,2.75rem)] leading-tight tracking-tight mb-12 md:mb-16">
          {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl border border-paper-cream-dark p-6 md:p-7 shadow-sm"
            >
              <h3 className="font-tondo font-bold text-text-primary text-xl mb-2">
                {feature.title}
              </h3>
              <p className="font-rooney-sans text-base text-text-secondary leading-snug">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
