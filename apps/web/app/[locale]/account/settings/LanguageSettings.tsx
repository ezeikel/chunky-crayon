'use client';

import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import LanguageSwitcher from '@/components/LanguageSwitcher/LanguageSwitcher';

const LanguageSettings = () => {
  const t = useTranslations('settings');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{t('languagePreference.title')}</span>
        </CardTitle>
        <CardDescription>
          {t('languagePreference.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LanguageSwitcher variant="full" />
      </CardContent>
    </Card>
  );
};

export default LanguageSettings;
