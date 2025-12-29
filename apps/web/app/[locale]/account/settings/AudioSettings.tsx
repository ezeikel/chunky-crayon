'use client';

import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faVolumeHigh,
  faVolumeSlash,
} from '@fortawesome/pro-duotone-svg-icons';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useColoringContext } from '@/contexts/coloring';

const AudioSettings = () => {
  const t = useTranslations('settings');
  const { isSfxMuted, setIsSfxMuted, isAmbientMuted, setIsAmbientMuted } =
    useColoringContext();

  // Note: We invert the values since the UI shows "enabled" but we store "muted"
  const isSfxEnabled = !isSfxMuted;
  const isAmbientEnabled = !isAmbientMuted;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon
            icon={
              isSfxEnabled || isAmbientEnabled ? faVolumeHigh : faVolumeSlash
            }
            className="text-xl text-crayon-orange"
          />
          <span>{t('audio.title')}</span>
        </CardTitle>
        <CardDescription>{t('audio.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SFX Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label
              htmlFor="sfx-toggle"
              className="font-tondo font-bold text-base cursor-pointer"
            >
              {t('audio.sfx.label')}
            </label>
            <p className="text-sm text-muted-foreground">
              {t('audio.sfx.description')}
            </p>
          </div>
          <Switch
            id="sfx-toggle"
            checked={isSfxEnabled}
            onCheckedChange={(checked) => setIsSfxMuted(!checked)}
            aria-label={t('audio.sfx.label')}
          />
        </div>

        {/* Ambient Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label
              htmlFor="ambient-toggle"
              className="font-tondo font-bold text-base cursor-pointer"
            >
              {t('audio.ambient.label')}
            </label>
            <p className="text-sm text-muted-foreground">
              {t('audio.ambient.description')}
            </p>
          </div>
          <Switch
            id="ambient-toggle"
            checked={isAmbientEnabled}
            onCheckedChange={(checked) => setIsAmbientMuted(!checked)}
            aria-label={t('audio.ambient.label')}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioSettings;
