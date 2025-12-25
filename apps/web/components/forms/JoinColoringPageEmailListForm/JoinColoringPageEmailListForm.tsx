'use client';

import { useEffect, useRef, useActionState, useState } from 'react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpenText } from '@fortawesome/pro-duotone-svg-icons';
import posthog from 'posthog-js';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import cn from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { joinColoringPageEmailList } from '@/app/actions/email';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

type JoinColoringPageEmailListFormProps = {
  className?: string;
  location?: 'hero' | 'footer' | 'modal' | 'other';
};

const JoinColoringPageEmailListForm = ({
  className,
  location = 'hero',
}: JoinColoringPageEmailListFormProps) => {
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [hasTrackedStart, setHasTrackedStart] = useState(false);
  const [state, joinColoringPageEmailListAction] = useActionState(
    joinColoringPageEmailList,
    {
      success: false,
    },
  );

  useEffect(() => {
    if (state.success) {
      toast('Success!', {
        description: 'You have successfully joined the email list!',
      });

      // Identify user in PostHog with their email for journey tracking
      // This links their anonymous session to the email, so when they
      // later create an account, PostHog connects the full journey
      if (state.email) {
        posthog.identify(state.email, {
          email: state.email,
          email_subscriber: true,
          email_signup_location: location,
          email_signup_date: new Date().toISOString(),
        });
      }

      trackEvent(TRACKING_EVENTS.EMAIL_SIGNUP_COMPLETED, {
        location,
      });

      if (emailInputRef.current) {
        emailInputRef.current.value = '';
      }

      // Reset for next potential signup attempt
      setHasTrackedStart(false);
    } else if (state.error) {
      toast.error('Something went wrong', {
        description: 'Failed to join the email list. Please try again.',
      });

      trackEvent(TRACKING_EVENTS.EMAIL_SIGNUP_FAILED, {
        location,
        errorMessage:
          typeof state.error === 'string'
            ? state.error
            : 'Unknown error occurred',
      });

      console.error({ error: state.error });
    }
  }, [state.success, state.error, state.email, location]);

  const handleInputFocus = () => {
    // Only track once per form session to avoid spam
    if (!hasTrackedStart) {
      trackEvent(TRACKING_EVENTS.EMAIL_SIGNUP_STARTED, {
        location,
      });
      setHasTrackedStart(true);
    }
  };

  return (
    <div
      className={cn(
        'max-w-md flex flex-col gap-y-4 p-6 bg-white rounded-2xl shadow-card border-2 border-paper-cream-dark relative overflow-hidden',
        className,
      )}
    >
      {/* Decorative corner accents */}
      <div className="absolute -top-10 -right-10 w-20 h-20 bg-crayon-pink-light/20 rounded-full blur-2xl" />
      <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-crayon-yellow-light/20 rounded-full blur-2xl" />

      {/* Header */}
      <div className="text-center relative z-10">
        <div className="inline-flex items-center gap-2 mb-2">
          <FontAwesomeIcon
            icon={faEnvelopeOpenText}
            className="text-xl"
            style={
              {
                '--fa-primary-color': 'hsl(var(--crayon-orange))',
                '--fa-secondary-color': 'hsl(var(--crayon-pink))',
                '--fa-secondary-opacity': '0.8',
              } as React.CSSProperties
            }
          />
          <h3 className="font-tondo font-bold text-lg text-gradient-orange">
            Free Daily Coloring!
          </h3>
        </div>
        <p className="font-tondo text-sm text-text-secondary">
          Get a <span className="font-bold text-crayon-orange">free</span>{' '}
          coloring page in your inbox every day.
        </p>
      </div>

      {/* Form */}
      <form
        action={joinColoringPageEmailListAction}
        className="flex flex-col sm:flex-row gap-3 relative z-10"
      >
        <Input
          type="email"
          name="email"
          className="flex-1 font-tondo border-2 border-paper-cream-dark rounded-xl px-4 py-2.5 focus:border-crayon-orange focus:ring-2 focus:ring-crayon-orange/20 placeholder:text-text-muted"
          placeholder="parent@example.com"
          ref={emailInputRef}
          onFocus={handleInputFocus}
          required
        />
        <SubmitButton
          text="Join"
          className="font-tondo font-bold text-white bg-crayon-orange hover:bg-crayon-orange-dark px-6 py-2.5 rounded-xl shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95 transition-all duration-200"
        />
      </form>
    </div>
  );
};

export default JoinColoringPageEmailListForm;
