'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/pro-duotone-svg-icons';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Props = {
  error?: string;
};

const getErrorMessage = (
  error: string | undefined,
  t: ReturnType<typeof useTranslations<'auth'>>,
): string => {
  switch (error) {
    case 'Configuration':
      return t('errors.configuration');
    case 'AccessDenied':
      return t('errors.accessDenied');
    case 'Verification':
      return t('errors.verification');
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
    case 'OAuthAccountNotLinked':
      return t('errors.oauth');
    case 'EmailCreateAccount':
    case 'EmailSignin':
      return t('errors.email');
    case 'CredentialsSignin':
      return t('errors.credentials');
    case 'SessionRequired':
      return t('errors.sessionRequired');
    default:
      return t('errors.default');
  }
};

const AuthErrorCard = ({ error }: Props) => {
  const t = useTranslations('auth');
  const errorMessage = getErrorMessage(error, t);

  return (
    <Card className="w-[400px]">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <FontAwesomeIcon
            icon={faTriangleExclamation}
            className="h-8 w-8"
            style={
              {
                '--fa-primary-color': 'hsl(var(--destructive))',
                '--fa-secondary-color': 'hsl(var(--destructive))',
                '--fa-secondary-opacity': '0.4',
              } as React.CSSProperties
            }
          />
        </div>
        <CardTitle className="text-2xl">{t('error.title')}</CardTitle>
        <CardDescription className="text-base">{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>{t('error.tryAgain')}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button asChild className="w-full">
          <Link href="/signin">{t('error.backToSignIn')}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href="/">{t('error.goHome')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthErrorCard;
