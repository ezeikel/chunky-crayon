'use client';

import useUser from '@/hooks/useUser';
import { Textarea } from '@/components/ui/textarea';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';
import { useTranslations } from 'next-intl';

type TextInputProps = {
  className?: string;
};

const TextInput = ({ className }: TextInputProps) => {
  const {
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    maxGuestGenerations,
  } = useUser();
  const { description, setDescription } = useInputMode();
  const t = useTranslations('createForm');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const getPlaceholder = () => {
    if (canGenerate) return t('placeholder');
    if (blockedReason === 'guest_limit_reached') {
      return t('placeholderGuestLimit', { maxTries: maxGuestGenerations });
    }
    if (blockedReason === 'no_credits') {
      return hasActiveSubscription
        ? t('placeholderNoCreditsSubscribed')
        : t('placeholderNoCreditsNoSubscription');
    }
    return t('placeholderSignIn');
  };

  return (
    <div
      className={cn('flex flex-col', className)}
      role="tabpanel"
      id="text-input-panel"
      aria-labelledby="text-mode-tab"
    >
      <Textarea
        name="description"
        value={description}
        onChange={handleChange}
        placeholder={getPlaceholder()}
        className={cn(
          'font-tondo text-base md:text-lg border-2 h-36 md:h-40 rounded-coloring-card resize-none p-4 md:p-5',
          'placeholder:text-text-muted placeholder:text-base md:placeholder:text-lg',
          'focus:outline-none focus:ring-2 focus:ring-crayon-orange focus:ring-offset-2 focus:border-crayon-orange',
          'transition-all duration-200',
          !canGenerate
            ? 'border-paper-cream-dark bg-paper-cream cursor-not-allowed'
            : 'border-paper-cream-dark bg-paper-cream/40 hover:border-crayon-orange/50 hover:bg-white',
        )}
        required
        disabled={!canGenerate}
      />
    </div>
  );
};

export default TextInput;
