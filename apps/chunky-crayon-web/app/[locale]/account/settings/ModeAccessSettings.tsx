'use client';

/**
 * Per-profile "ways to create" controls.
 *
 * The privacy-first picture builder (Scene Builder) is always on and not
 * shown here. Typing / talking / photo are locked per child profile until
 * a parent turns them on. Turning one ON requires passing the parent gate
 * (then a scoped HMAC token authorises the write server-side); turning one
 * OFF is unprivileged — taking a privilege away shouldn't need a sum.
 *
 * Mirrors the InputModeSelector unlock flow so settings and the create
 * form stay in lockstep. Scoped to the ACTIVE profile (same as difficulty
 * / Colo) — the description tells the parent which child this affects.
 */

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { faLock, faLockOpen } from '@fortawesome/pro-duotone-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useParentalGate } from '@/components/ParentalGate';
import { issueParentGateToken } from '@/app/actions/parent-gate';
import {
  setModeUnlocked,
  GATEABLE_MODES,
  type GateableMode,
} from '@/app/actions/scene';

type ModeAccessSettingsProps = {
  /** Modes the active profile has already unlocked (server-resolved). */
  initialUnlockedModes: GateableMode[];
};

const ModeAccessSettings = ({
  initialUnlockedModes,
}: ModeAccessSettingsProps) => {
  const t = useTranslations('settings.modeAccess');
  const { openGate } = useParentalGate();
  const [unlocked, setUnlocked] = useState<Set<GateableMode>>(
    new Set(initialUnlockedModes),
  );
  const [pendingMode, setPendingMode] = useState<GateableMode | null>(null);
  const [, startTransition] = useTransition();

  const applyUnlock = (mode: GateableMode, next: boolean, token?: string) => {
    setPendingMode(mode);
    startTransition(async () => {
      const res = await setModeUnlocked({
        mode,
        unlocked: next,
        parentGateToken: token,
      });
      setPendingMode(null);
      if (!res.ok) {
        toast.error(t('enableFailed'));
        return;
      }
      setUnlocked(new Set(res.unlockedModes));
      toast.success(next ? t('enabledToast') : t('disabledToast'));
    });
  };

  const handleToggle = (mode: GateableMode, next: boolean) => {
    if (!next) {
      // Locking is unprivileged — no gate.
      applyUnlock(mode, false);
      return;
    }
    // Unlocking — parent gate first, then mint the scoped token.
    openGate({
      reason: 'unlock-input-mode',
      onSuccess: async () => {
        const issued = await issueParentGateToken('modes:unlock');
        if (!issued.ok) {
          toast.error(t('enableFailed'));
          return;
        }
        applyUnlock(mode, true, issued.token);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{t('title')}</span>
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {GATEABLE_MODES.map((mode) => {
          const isOn = unlocked.has(mode);
          return (
            <div key={mode} className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <label
                  htmlFor={`mode-${mode}`}
                  className="flex items-center gap-2 text-sm font-medium leading-none"
                >
                  <FontAwesomeIcon
                    icon={isOn ? faLockOpen : faLock}
                    className={
                      isOn ? 'text-crayon-green' : 'text-muted-foreground'
                    }
                  />
                  {t(`${mode}.label`)}
                  <span className="text-xs font-normal text-muted-foreground">
                    {isOn ? t('unlocked') : t('locked')}
                  </span>
                </label>
                <p className="text-sm text-muted-foreground">
                  {t(`${mode}.description`)}
                </p>
              </div>
              <Switch
                id={`mode-${mode}`}
                checked={isOn}
                onCheckedChange={(next) => handleToggle(mode, next)}
                disabled={pendingMode !== null}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ModeAccessSettings;
