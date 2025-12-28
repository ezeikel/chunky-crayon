'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { updateShowCommunityImages } from '@/app/actions/settings';

type SettingsFormProps = {
  initialSettings: {
    showCommunityImages: boolean;
  } | null;
};

const SettingsForm = ({ initialSettings }: SettingsFormProps) => {
  const t = useTranslations('settings');
  const [showCommunityImages, setShowCommunityImages] = useState(
    initialSettings?.showCommunityImages ?? false,
  );
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setShowCommunityImages(checked);

    startTransition(async () => {
      const result = await updateShowCommunityImages(checked);

      if (result.error) {
        toast.error(result.error);
        // Revert on error
        setShowCommunityImages(!checked);
      } else {
        toast.success(
          checked
            ? t('communityImages.enabled')
            : t('communityImages.disabled'),
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{t('parentalControls.title')}</span>
          </CardTitle>
          <CardDescription>
            {t('parentalControls.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label
                htmlFor="show-community"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('communityImages.label')}
              </label>
              <p className="text-sm text-muted-foreground">
                {t('communityImages.description')}
              </p>
            </div>
            <Switch
              id="show-community"
              checked={showCommunityImages}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsForm;
