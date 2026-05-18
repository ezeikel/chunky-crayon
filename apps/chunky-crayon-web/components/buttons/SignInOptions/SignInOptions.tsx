'use client';

import { useEffect, useRef, useState } from 'react';
import posthog from 'posthog-js';
import { signIn } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/pro-regular-svg-icons';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import {
  faGoogle,
  faApple,
  faFacebook,
} from '@fortawesome/free-brands-svg-icons';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const SquiggleSeparator = ({ label }: { label: string }) => {
  const leftRef = useRef<SVGGElement | null>(null);
  const rightRef = useRef<SVGGElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const drawLine = async (group: SVGGElement | null, seed: number) => {
      if (!group) return;

      const { default: rough } = await import('roughjs/bin/rough');
      if (cancelled || !group.ownerSVGElement) return;

      while (group.firstChild) group.removeChild(group.firstChild);

      const roughSvg = rough.svg(group.ownerSVGElement);
      const node = roughSvg.line(2, 12, 154, 10, {
        bowing: 3,
        roughness: 2.4,
        seed,
        stroke: 'hsl(var(--crayon-orange))',
        strokeWidth: 3,
      });

      group.appendChild(node);
    };

    (async () => {
      await Promise.all([
        drawLine(leftRef.current, 31),
        drawLine(rightRef.current, 37),
      ]);
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center gap-3 py-1">
      <svg
        aria-hidden
        viewBox="0 0 156 24"
        preserveAspectRatio="none"
        className="h-6 flex-1"
        style={{
          opacity: ready ? 0.7 : 0,
          transition: 'opacity 180ms ease-out',
        }}
      >
        <g ref={leftRef} />
      </svg>
      <span className="rounded-full bg-paper-cream px-3 py-1 font-tondo text-xs font-bold uppercase text-text-muted">
        {label}
      </span>
      <svg
        aria-hidden
        viewBox="0 0 156 24"
        preserveAspectRatio="none"
        className="h-6 flex-1"
        style={{
          opacity: ready ? 0.7 : 0,
          transition: 'opacity 180ms ease-out',
        }}
      >
        <g ref={rightRef} />
      </svg>
    </div>
  );
};

const SignInOptions = () => {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = () => {
    posthog.capture('user_signed_in', {
      provider: 'google',
    });
    signIn('google', { callbackUrl: '/' });
  };

  const handleAppleSignIn = () => {
    posthog.capture('user_signed_in', {
      provider: 'apple',
    });
    signIn('apple', { callbackUrl: '/' });
  };

  const handleFacebookSignIn = () => {
    posthog.capture('user_signed_in', {
      provider: 'facebook',
    });
    signIn('facebook', { callbackUrl: '/' });
  };

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // PostHog event tracking with email identification
    posthog.capture('user_signed_in', {
      provider: 'magic_link',
      email: email,
    });

    try {
      await signIn('resend', { email, callbackUrl: '/' });
    } catch (error) {
      console.error('Error signing in with magic link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg rounded-3xl border-2 border-paper-cream-dark bg-white shadow-card">
      <CardHeader className="space-y-2 px-8 pb-5 pt-8 md:px-10">
        <CardTitle className="font-tondo text-3xl font-bold text-text-primary">
          {t('signIn')}
        </CardTitle>
        <CardDescription>{t('chooseMethod')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 px-8 md:px-10">
        <Button
          variant="outline-muted"
          onClick={handleGoogleSignIn}
          className="h-12 w-full shadow-none [--bottom:transparent] [--lift:0px] [--lift-active:0px]"
        >
          <FontAwesomeIcon icon={faGoogle} className="mr-2 h-4 w-4" />
          {t('continueWithGoogle')}
        </Button>
        <Button
          variant="outline-muted"
          onClick={handleAppleSignIn}
          className="h-12 w-full shadow-none [--bottom:transparent] [--lift:0px] [--lift-active:0px]"
        >
          <FontAwesomeIcon icon={faApple} className="mr-2 h-4 w-4" />
          {t('continueWithApple')}
        </Button>
        <Button
          variant="outline-muted"
          onClick={handleFacebookSignIn}
          className="h-12 w-full border-[#1877F2] bg-[#1877F2] text-white shadow-none hover:bg-[#1877F2]/90 hover:text-white [--bottom:transparent] [--lift:0px] [--lift-active:0px]"
        >
          <FontAwesomeIcon icon={faFacebook} className="mr-2 h-4 w-4" />
          {t('continueWithFacebook')}
        </Button>
        <SquiggleSeparator label={t('orContinueWith')} />
        <form onSubmit={handleMagicLinkSignIn} className="grid gap-2">
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 py-0"
            required
          />
          <Button type="submit" disabled={isLoading} className="h-12 w-full">
            {isLoading ? (
              <>
                <FontAwesomeIcon
                  icon={faSpinnerThird}
                  className="mr-2 h-4 w-4 animate-spin"
                  style={
                    {
                      '--fa-primary-color': 'hsl(var(--crayon-orange))',
                      '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                      '--fa-secondary-opacity': '0.6',
                    } as React.CSSProperties
                  }
                />
                {t('sendingLink')}
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faEnvelope} className="mr-2 h-4 w-4" />
                {t('signInWithEmail')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center px-8 pb-8 text-sm leading-relaxed text-muted-foreground md:px-10">
        <p>
          {t.rich('termsAgreement', {
            terms: (chunks) => (
              <Link
                href="/terms"
                className="font-bold text-text-primary underline decoration-crayon-orange/40 underline-offset-4 transition-colors hover:text-crayon-orange"
              >
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link
                href="/privacy"
                className="font-bold text-text-primary underline decoration-crayon-orange/40 underline-offset-4 transition-colors hover:text-crayon-orange"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </CardFooter>
    </Card>
  );
};

export default SignInOptions;
