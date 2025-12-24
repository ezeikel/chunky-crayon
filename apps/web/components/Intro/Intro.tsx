import Image from 'next/image';
import Balancer from 'react-wrap-balancer';
import cn from '@/utils/cn';
import { UNLEASH_STRINGS } from '@/constants';
import JoinColoringPageEmailListForm from '../forms/JoinColoringPageEmailListForm/JoinColoringPageEmailListForm';
import TypedText from '../TypedText/TypedText';
import AppStoreButtons from '@/components/AppStoreButtons';

type IntroProps = {
  className?: string;
};

const Intro = ({ className }: IntroProps) => (
  <div className={cn('relative', className)}>
    {/* Colo mascot - friendly greeting for visitors */}
    <div
      className="absolute -top-4 -right-8 md:-right-16 lg:-right-24 animate-float z-0 pointer-events-none hidden sm:block"
      style={{ animationDelay: '0.2s' }}
    >
      <Image
        src="/images/colo.svg"
        alt="Colo the friendly crayon mascot"
        width={120}
        height={120}
        className="drop-shadow-lg opacity-90 md:w-[140px] md:h-[140px] lg:w-[160px] lg:h-[160px]"
      />
      {/* Sparkle near Colo */}
      <span className="absolute -top-2 -right-2 text-xl animate-pulse">✨</span>
    </div>

    {/* Decorative floating elements - z-0 keeps them behind header (z-50) and form (z-10) */}
    <div
      className="absolute -top-8 -left-4 text-4xl animate-float opacity-80 z-0 pointer-events-none"
      style={{ animationDelay: '0s' }}
    >
      🖍️
    </div>
    <div
      className="absolute top-20 -right-2 text-3xl animate-float opacity-70 z-0 pointer-events-none sm:hidden"
      style={{ animationDelay: '0.5s' }}
    >
      ✨
    </div>
    <div
      className="absolute -bottom-4 left-12 text-3xl animate-float opacity-60 z-0 pointer-events-none"
      style={{ animationDelay: '1s' }}
    >
      🎨
    </div>

    <h2 className="font-tondo font-bold text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-tight text-text-primary mb-6 md:mb-8 [white-space:pre-wrap] [word-break:break-word]">
      <Balancer>
        Unleash your child&apos;s
        <br />
        <TypedText
          className="text-gradient-orange"
          strings={UNLEASH_STRINGS}
        />{' '}
        <br />
        today
      </Balancer>
    </h2>
    <p className="font-tondo text-lg sm:text-xl md:text-2xl text-text-secondary leading-relaxed mb-6 md:mb-8 max-w-xl">
      From vibrant colouring pages to imaginative adventures, Chunky Crayon
      transforms creativity into pure joy.
    </p>

    {/* Tagline badge */}
    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-crayon-yellow-light/40 border-2 border-crayon-yellow mb-6 md:mb-8">
      <span className="text-xl">🌈</span>
      <span className="font-tondo font-bold text-text-primary">
        Dream. Create. Colour.
      </span>
    </div>

    <AppStoreButtons location="hero" className="mb-6 md:mb-8" />

    <JoinColoringPageEmailListForm className="max-w-[429px]" location="hero" />
  </div>
);

export default Intro;
