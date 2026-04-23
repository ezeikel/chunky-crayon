'use client';

import { useEffect, useRef, useActionState, useState } from 'react';
import { toast } from 'sonner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelopeOpenText } from '@fortawesome/pro-duotone-svg-icons';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';
import SubmitButton from '@/components/buttons/SubmitButton/SubmitButton';
import cn from '@/utils/cn';
import { Input } from '@/components/ui/input';
import { joinColoringPageEmailList } from '@/app/actions/email';
import { trackEvent } from '@/utils/analytics-client';
import { trackSignUp } from '@/utils/pixels';
import { TRACKING_EVENTS } from '@/constants';

type JoinColoringPageEmailListFormProps = {
  className?: string;
  location?: 'hero' | 'footer' | 'modal' | 'other';
};

const JoinColoringPageEmailListForm = ({
  className,
  location = 'hero',
}: JoinColoringPageEmailListFormProps) => {
  const t = useTranslations('email');
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
      toast(t('signup.success'), {
        description: t('signup.successDescription'),
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

      // Fire Meta CompleteRegistration + Pinterest signup so ad platforms
      // can optimize for signup conversions, not just landing page views.
      trackSignUp({ method: 'email' });

      if (emailInputRef.current) {
        emailInputRef.current.value = '';
      }

      // Reset for next potential signup attempt
      setHasTrackedStart(false);
    } else if (state.error) {
      toast.error(t('signup.error'), {
        description: t('signup.errorDescription'),
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

  const isFooter = location === 'footer';

  return (
    <div
      className={cn(
        'max-w-md flex flex-col gap-y-4 border-2 relative overflow-hidden',
        isFooter
          ? 'bg-white/5 backdrop-blur-sm border-white/10 p-1.5 rounded-full'
          : 'bg-white border-paper-cream-dark shadow-card p-6 rounded-2xl',
        className,
      )}
    >
      {/* Decorative corner accents */}
      <div
        className={cn(
          'absolute -top-10 -right-10 w-20 h-20 rounded-full blur-2xl',
          isFooter ? 'bg-crayon-pink-light/10' : 'bg-crayon-pink-light/20',
        )}
      />
      <div
        className={cn(
          'absolute -bottom-6 -left-6 w-16 h-16 rounded-full blur-2xl',
          isFooter ? 'bg-crayon-yellow-light/10' : 'bg-crayon-yellow-light/20',
        )}
      />

      {/* Header — hero-only; footer has its own h3 outside the card */}
      {!isFooter && (
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
              {t('signup.title')}
            </h3>
          </div>
          <p className="font-tondo text-sm text-text-secondary">
            {t.rich('signup.subtitle', {
              free: (chunks) => (
                <span className="font-bold text-crayon-orange">{chunks}</span>
              ),
            })}
          </p>
        </div>
      )}

      {/* Form */}
      <form
        action={joinColoringPageEmailListAction}
        className={cn(
          'flex flex-col sm:flex-row relative z-10',
          isFooter ? 'gap-0 items-stretch' : 'gap-3',
        )}
      >
        <Input
          type="email"
          name="email"
          className={cn(
            'flex-1 font-tondo px-4',
            isFooter
              ? '!bg-transparent !border-0 !h-10 !py-0 rounded-full !text-white placeholder:!text-white/50 focus:ring-0 focus:border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none'
              : 'border-2 border-paper-cream-dark rounded-xl py-2.5 placeholder:text-text-muted focus:border-crayon-orange focus:ring-2 focus:ring-crayon-orange/20',
          )}
          placeholder={t('signup.placeholder')}
          ref={emailInputRef}
          onFocus={handleInputFocus}
          required
        />
        <SubmitButton
          text={t('signup.join')}
          className={cn(
            'font-tondo font-bold text-white bg-crayon-orange hover:bg-crayon-orange-dark px-6 transition-all duration-200',
            isFooter
              ? 'h-10 py-0 rounded-full shadow-md hover:shadow-lg'
              : 'py-2.5 rounded-xl shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-105 active:scale-95',
          )}
        />
      </form>
    </div>
  );
};

export default JoinColoringPageEmailListForm;
