import Balancer from 'react-wrap-balancer';

type StartProblemProps = {
  title: string;
  body: string;
};

// Names the pain. Sits between the pain-led hero and the
// solution-focused "How it works" so a parent reading top-to-bottom
// goes: I feel seen → I understand the fix → I can picture using it.
export default function StartProblem({ title, body }: StartProblemProps) {
  return (
    <section className="bg-paper-cream py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-tondo font-bold text-text-primary text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05] tracking-tight mb-6">
          <Balancer>{title}</Balancer>
        </h2>
        <p className="font-rooney-sans text-lg sm:text-xl text-text-secondary leading-relaxed">
          <Balancer>{body}</Balancer>
        </p>
      </div>
    </section>
  );
}
