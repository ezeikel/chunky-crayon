'use client';

import useUser from '@/hooks/useUser';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';
import { useTranslations } from 'next-intl';

type TextInputProps = {
  className?: string;
};

const TextInput = ({ className }: TextInputProps) => {
  const {
    isSignedIn,
    canGenerate,
    blockedReason,
    hasActiveSubscription,
    handleAuthAction,
    isGuest,
    guestGenerationsRemaining,
    maxGuestGenerations,
  } = useUser();

  const { description, setDescription } = useInputMode();
  const t = useTranslations('createForm');

  // Sync description changes with form
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const getTextareaConfig = () => {
    // Can generate - show normal placeholder
    if (canGenerate) {
      return {
        disabled: false,
        placeholder: t('placeholder'),
      };
    }

    // Blocked - show appropriate message based on reason
    if (blockedReason === 'guest_limit_reached') {
      return {
        disabled: true,
        placeholder: t('placeholderGuestLimit', {
          maxTries: maxGuestGenerations,
        }),
      };
    }

    if (blockedReason === 'no_credits') {
      if (hasActiveSubscription) {
        return {
          disabled: true,
          placeholder: t('placeholderNoCreditsSubscribed'),
        };
      }
      return {
        disabled: true,
        placeholder: t('placeholderNoCreditsNoSubscription'),
      };
    }

    // Fallback (shouldn't reach here)
    return {
      disabled: true,
      placeholder: t('placeholderSignIn'),
    };
  };

  const getButtonConfig = () => {
    // Can generate - show submit button
    if (canGenerate) {
      // Show remaining generations for guests
      if (isGuest) {
        return {
          text: t('buttonCreateGuest', {
            remaining: guestGenerationsRemaining,
          }),
          isSubmit: true,
        };
      }
      return {
        text: t('buttonCreate'),
        isSubmit: true,
      };
    }

    // Blocked - show appropriate CTA
    if (blockedReason === 'guest_limit_reached') {
      return {
        text: t('buttonSignUp'),
        action: () => handleAuthAction('signin'),
        subtext: t('subtextGuestLimit'),
        isSubmit: false,
      };
    }

    if (blockedReason === 'no_credits') {
      // Both cases go to billing - with or without subscription
      // "View Plans" and "Buy Credits" both route to /account/billing
      return {
        text: hasActiveSubscription
          ? t('buttonBuyCredits')
          : t('buttonViewPlans'),
        action: () => handleAuthAction('billing'),
        subtext: hasActiveSubscription
          ? t('subtextNoCreditsSubscribed')
          : t('subtextNoCreditsNoSubscription'),
        isSubmit: false,
      };
    }

    // Fallback
    return {
      text: t('buttonGetStarted'),
      action: () => handleAuthAction('signin'),
      subtext: t('subtextFallback'),
      isSubmit: false,
    };
  };

  const textareaConfig = getTextareaConfig();
  const buttonConfig = getButtonConfig();

  return (
    <div
      className={cn('flex flex-col gap-y-4', className)}
      role="tabpanel"
      id="text-input-panel"
      aria-labelledby="text-mode-tab"
    >
      <Textarea
        name="description"
        value={description}
        onChange={handleChange}
        placeholder={textareaConfig.placeholder}
        className={cn(
          'font-tondo text-base border-2 h-36 md:h-40 rounded-xl resize-none',
          'placeholder:text-text-muted placeholder:text-sm md:placeholder:text-base',
          'focus:outline-none focus:ring-2 focus:ring-crayon-orange focus:ring-offset-2 focus:border-crayon-orange',
          'transition-all duration-200',
          textareaConfig.disabled
            ? 'border-paper-cream-dark bg-paper-cream cursor-not-allowed'
            : 'border-paper-cream-dark hover:border-crayon-orange/50',
        )}
        required
        disabled={textareaConfig.disabled}
      />
      {buttonConfig.isSubmit ? (
        <SubmitButton
          text={buttonConfig.text}
          className="font-tondo font-bold text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-xl py-3"
        />
      ) : (
        <Button
          onClick={buttonConfig.action}
          className="font-tondo font-bold text-white bg-btn-orange shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200 rounded-xl py-3 h-auto"
          type="button"
        >
          {buttonConfig.text}
        </Button>
      )}
      {buttonConfig.subtext && (
        <p className="font-tondo text-sm text-center text-text-muted">
          {buttonConfig.subtext}
        </p>
      )}
    </div>
  );
};

export default TextInput;
