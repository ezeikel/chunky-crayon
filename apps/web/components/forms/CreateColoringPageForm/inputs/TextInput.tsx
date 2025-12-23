'use client';

import useUser from '@/hooks/useUser';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import cn from '@/utils/cn';
import { useInputMode } from './InputModeContext';

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

  // Sync description changes with form
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const getTextareaConfig = () => {
    // Can generate - show normal placeholder
    if (canGenerate) {
      return {
        disabled: false,
        placeholder: 'e.g. a pirate ship sailing through space 🚀',
      };
    }

    // Blocked - show appropriate message based on reason
    if (blockedReason === 'guest_limit_reached') {
      return {
        disabled: true,
        placeholder: `You've used your ${maxGuestGenerations} free tries! Sign up for 15 more credits.`,
      };
    }

    if (blockedReason === 'no_credits') {
      if (hasActiveSubscription) {
        return {
          disabled: true,
          placeholder: "You're out of credits — top up or upgrade your plan!",
        };
      }
      return {
        disabled: true,
        placeholder:
          "You've used your free credits — choose a plan to continue creating!",
      };
    }

    // Fallback (shouldn't reach here)
    return {
      disabled: true,
      placeholder: 'Sign in to start creating magical colouring pages!',
    };
  };

  const getButtonConfig = () => {
    // Can generate - show submit button
    if (canGenerate) {
      // Show remaining generations for guests
      if (isGuest) {
        return {
          text: `Generate (${guestGenerationsRemaining} free ${guestGenerationsRemaining === 1 ? 'try' : 'tries'} left)`,
          isSubmit: true,
        };
      }
      return {
        text: 'Generate colouring page',
        isSubmit: true,
      };
    }

    // Blocked - show appropriate CTA
    if (blockedReason === 'guest_limit_reached') {
      return {
        text: 'Sign up for 15 free credits',
        action: () => handleAuthAction('signin'),
        subtext: "You've seen the magic! Sign up to keep creating.",
        isSubmit: false,
      };
    }

    if (blockedReason === 'no_credits') {
      if (hasActiveSubscription) {
        return {
          text: 'Buy more credits',
          action: () => handleAuthAction('billing'),
          subtext:
            'Need more magic? Top up or upgrade to keep the creativity going!',
          isSubmit: false,
        };
      }
      return {
        text: 'View plans',
        action: () => handleAuthAction('billing'),
        subtext: 'Choose a subscription to unlock more creations',
        isSubmit: false,
      };
    }

    // Fallback
    return {
      text: 'Get started for free',
      action: () => handleAuthAction('signin'),
      subtext: "You'll get 15 free credits — enough to generate 3 pages!",
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
