'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeCircleCheck } from '@fortawesome/pro-duotone-svg-icons';
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

const VerifyRequestCard = () => {
  const t = useTranslations('auth');

  return (
    <Card className="w-[400px]">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--crayon-orange))]/10">
          <FontAwesomeIcon
            icon={faEnvelopeCircleCheck}
            className="h-8 w-8"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-teal))',
                '--fa-secondary-opacity': '0.6',
              } as React.CSSProperties
            }
          />
        </div>
        <CardTitle className="text-2xl">{t('verifyRequest.title')}</CardTitle>
        <CardDescription className="text-base">
          {t('verifyRequest.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-sm text-muted-foreground">
        <p>{t('verifyRequest.checkSpam')}</p>
        <p className="mt-2">{t('verifyRequest.linkExpiry')}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button asChild variant="outline" className="w-full">
          <Link href="/signin">{t('verifyRequest.tryDifferentEmail')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VerifyRequestCard;
