import Balancer from 'react-wrap-balancer';
import { getTranslations } from 'next-intl/server';
import cn from '@/utils/cn';
import AppStoreButtons from '@/components/AppStoreButtons';

type IntroProps = {
  className?: string;
};

// Logged-out hero. Parents are the buyers, kids are the users — so this
// copy leads with the pain ("5pm Googling") rather than the kid-focused
// mascot/emoji treatment used post-login. The Colo mascot and floating
// crayon/sparkle/palette decorations deliberately do NOT render here;
// they return on the authenticated dashboard hero via DashboardHeader.
const Intro = async ({ className }: IntroProps) => {
  const t = await getTranslations('homepage');

  return (
    <div className={cn('relative', className)}>
      <p className="font-tondo text-sm sm:text-base font-bold uppercase tracking-wide text-crayon-orange mb-4">
        {t('heroEyebrow')}
      </p>
      <h2 className="font-tondo font-bold text-4xl sm:text-5xl md:text-6xl lg:text-[64px] leading-tight text-text-primary mb-6 md:mb-8 [word-break:break-word]">
        <Balancer>{t('heroTitle')}</Balancer>
      </h2>
      <p className="font-tondo text-lg sm:text-xl md:text-2xl text-text-secondary leading-relaxed mb-6 md:mb-8 max-w-xl">
        {t('heroSubtitle')}
      </p>

      <AppStoreButtons location="hero" className="mb-6 md:mb-8" />
    </div>
  );
};

export default Intro;
