'use client';

import { useState } from 'react';
import posthog from 'posthog-js';
import { signIn } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/pro-regular-svg-icons';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import { faGoogle, faApple } from '@fortawesome/free-brands-svg-icons';
import { useTranslations } from 'next-intl';
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
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>{t('signIn')}</CardTitle>
        <CardDescription>{t('chooseMethod')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          className="w-full"
        >
          <FontAwesomeIcon icon={faGoogle} className="mr-2 h-4 w-4" />
          {t('continueWithGoogle')}
        </Button>
        <Button
          variant="outline"
          onClick={handleAppleSignIn}
          className="w-full"
        >
          <FontAwesomeIcon icon={faApple} className="mr-2 h-4 w-4" />
          {t('continueWithApple')}
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t('orContinueWith')}
            </span>
          </div>
        </div>
        <form onSubmit={handleMagicLinkSignIn} className="grid gap-2">
          <Input
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={isLoading}>
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
      <CardFooter className="flex flex-col items-center text-sm text-muted-foreground">
        <p>{t('termsAgreement')}</p>
      </CardFooter>
    </Card>
  );
};

export default SignInOptions;
