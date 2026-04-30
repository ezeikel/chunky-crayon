'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/pro-duotone-svg-icons';
import {
  CREDIT_PACKS_PUBLIC,
  TRACKING_EVENTS,
  type CreditPack,
} from '@/constants';
import { trackEvent } from '@/utils/analytics-client';
import { trackInitiateCheckout } from '@/utils/pixels';
import { createCheckoutSession } from '@/app/actions/stripe';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import FadeIn from '@/components/motion/FadeIn';
import StaggerChildren from '@/components/motion/StaggerChildren';
import StaggerItem from '@/components/motion/StaggerItem';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY as string);

type ColorAsYouGoClientProps = {
  isLoggedIn: boolean;
};

const ColorAsYouGoClient = ({ isLoggedIn }: ColorAsYouGoClientProps) => {
  const t = useTranslations('colorAsYouGo');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  useEffect(() => {
    trackEvent(TRACKING_EVENTS.COLOR_AS_YOU_GO_PAGE_VIEWED, {
      isLoggedIn,
    });
  }, [isLoggedIn]);

  const handlePurchase = async (pack: CreditPack) => {
    if (!isLoggedIn) {
      // Stripe one-time payment flow requires a userId in our checkout
      // action. Send guests through sign-in first; they land back here
      // ready to buy. Subscription flow supports guest checkout because
      // Stripe creates the customer record itself, but for credit packs
      // we need the User row to grant credits to.
      router.push(
        `/signin?callbackUrl=${encodeURIComponent('/color-as-you-go')}`,
      );
      return;
    }

    setLoadingPack(pack.key);

    trackEvent(TRACKING_EVENTS.COLOR_AS_YOU_GO_PACK_CLICKED, {
      packKey: pack.key,
      credits: pack.credits,
      price: pack.price,
    });

    const priceInPence = Math.round(
      parseFloat(pack.price.replace(/[^0-9.]/g, '')) * 100,
    );
    trackInitiateCheckout({
      value: priceInPence,
      currency: 'GBP',
      productType: 'credits',
      creditAmount: pack.credits,
    });

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const session = await createCheckoutSession(
        pack.stripePriceEnv,
        'payment',
        '/color-as-you-go',
      );

      if (!session || !session.id) {
        const errorMessage =
          session?.error || 'Failed to create checkout session';
        console.error('Checkout session error:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        console.error('Stripe redirect error:', error);
        toast.error(error.message || t('failedToCheckout'));
      }
    } catch (error) {
      console.error('Error purchasing pack:', error);
      toast.error(tErrors('unexpectedError'));
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4">
      <FadeIn direction="up" duration={0.6}>
        <header className="text-center mb-12">
          <h1 className="font-tondo font-bold text-text-primary text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.05] tracking-tight mb-4 max-w-3xl mx-auto">
            {t('heroTitle')}
          </h1>
          <p className="font-rooney-sans text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </header>
      </FadeIn>

      <StaggerChildren className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {CREDIT_PACKS_PUBLIC.map((pack) => {
          const isMostPopular = pack.key === 'PUBLIC_CREDITS_200';
          return (
            <StaggerItem key={pack.key}>
              <Card
                className={cn(
                  'flex flex-col h-full border-2 transition-shadow',
                  isMostPopular
                    ? 'border-crayon-orange shadow-lg shadow-crayon-orange/20'
                    : 'border-paper-cream-dark',
                )}
              >
                <CardHeader className="pt-8">
                  <CardTitle className="text-center">
                    <span className="font-tondo text-2xl">
                      {t(`packs.${pack.key}.name`)}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-4 text-center">
                    <span className="block">
                      <span className="text-3xl font-tondo font-bold text-text-primary">
                        {pack.price}
                      </span>
                    </span>
                    <span className="block mt-1 text-sm text-text-secondary">
                      {t('credits', { count: pack.credits })}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center text-center px-6">
                  <p className="font-rooney-sans text-text-secondary leading-relaxed">
                    {t(`packs.${pack.key}.tagline`)}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 pb-6">
                  <Button
                    onClick={() => handlePurchase(pack)}
                    disabled={loadingPack !== null}
                    className={cn(
                      'w-full font-tondo font-bold',
                      isMostPopular
                        ? 'bg-crayon-orange hover:bg-crayon-orange/90 text-white'
                        : 'bg-text-primary hover:bg-text-primary/90 text-white',
                    )}
                  >
                    {loadingPack === pack.key ? t('loading') : t('buyNow')}
                  </Button>
                </CardFooter>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerChildren>

      <FadeIn direction="up" delay={0.1} className="mt-16">
        <div className="text-center max-w-2xl mx-auto">
          <FontAwesomeIcon
            icon={faPalette}
            className="text-3xl mb-4"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                '--fa-secondary-opacity': '0.6',
              } as React.CSSProperties
            }
          />
          <h2 className="font-tondo text-2xl font-bold mb-3 text-text-primary">
            {t('subscribePitch.title')}
          </h2>
          <p className="text-base text-text-secondary mb-6 leading-relaxed">
            {t('subscribePitch.subtitle')}
          </p>
          <Button
            onClick={() => router.push('/pricing')}
            variant="outline"
            className="font-tondo font-bold border-2 border-crayon-orange text-crayon-orange hover:bg-crayon-orange hover:text-white"
          >
            {t('subscribePitch.cta')}
          </Button>
        </div>
      </FadeIn>
    </div>
  );
};

export default ColorAsYouGoClient;
