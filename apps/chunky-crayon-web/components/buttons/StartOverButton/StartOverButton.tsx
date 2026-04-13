'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { faBroomWide } from '@fortawesome/pro-solid-svg-icons';
import { ActionButton } from '@one-colored-pixel/coloring-ui';
import cn from '@/utils/cn';

type StartOverButtonProps = {
  onStartOver: () => void;
  className?: string;
  disabled?: boolean;
};

const StartOverButton = ({
  onStartOver,
  className,
  disabled = false,
}: StartOverButtonProps) => {
  const t = useTranslations('startOverButton');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleClick = () => {
    if (showConfirm) {
      onStartOver();
      setShowConfirm(false);
    } else {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  if (showConfirm) {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <ActionButton
          size="tile"
          tone="destructive"
          icon={faBroomWide}
          label={t('confirm')}
          onClick={handleClick}
        />
        <ActionButton
          size="tile"
          tone="outline"
          icon={faBroomWide}
          label={t('cancel')}
          onClick={() => setShowConfirm(false)}
        />
      </div>
    );
  }

  return (
    <ActionButton
      size="tile"
      tone="secondary"
      icon={faBroomWide}
      label={t('idle')}
      onClick={handleClick}
      disabled={disabled}
      className={className}
    />
  );
};

export default StartOverButton;
