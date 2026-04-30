'use client';

import { useState, useEffect } from 'react';
import { usePostHog } from 'posthog-js/react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBug,
  faLightbulb,
  faCircleQuestion,
  faCommentDots,
  faSpinnerThird,
  faArrowLeft,
  faCheckCircle,
} from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { TRACKING_EVENTS } from '@/constants';

type FeedbackType = 'bug' | 'idea' | 'help' | 'other';

const feedbackTypeConfig: Record<
  FeedbackType,
  {
    icon: IconDefinition;
    color: string;
    bgColor: string;
    iconStyle: React.CSSProperties;
  }
> = {
  bug: {
    icon: faBug,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    iconStyle: {
      '--fa-primary-color': 'hsl(350, 80%, 55%)',
      '--fa-secondary-color': 'hsl(350, 70%, 70%)',
      '--fa-secondary-opacity': '0.6',
    } as React.CSSProperties,
  },
  idea: {
    icon: faLightbulb,
    color: 'text-crayon-orange',
    bgColor: 'bg-crayon-orange/10',
    iconStyle: {
      '--fa-primary-color': 'hsl(var(--crayon-orange))',
      '--fa-secondary-color': 'hsl(var(--crayon-orange-light))',
      '--fa-secondary-opacity': '0.7',
    } as React.CSSProperties,
  },
  help: {
    icon: faCircleQuestion,
    color: 'text-crayon-sky',
    bgColor: 'bg-crayon-sky/20',
    iconStyle: {
      '--fa-primary-color': 'hsl(var(--crayon-sky))',
      '--fa-secondary-color': 'hsl(var(--crayon-teal))',
      '--fa-secondary-opacity': '0.7',
    } as React.CSSProperties,
  },
  other: {
    icon: faCommentDots,
    color: 'text-crayon-purple',
    bgColor: 'bg-crayon-purple/10',
    iconStyle: {
      '--fa-primary-color': 'hsl(var(--crayon-purple))',
      '--fa-secondary-color': 'hsl(var(--crayon-pink))',
      '--fa-secondary-opacity': '0.7',
    } as React.CSSProperties,
  },
};

type FeedbackDialogProps = {
  userEmail?: string;
  userName?: string;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultType?: FeedbackType;
};

const FeedbackDialog = ({
  userEmail,
  userName,
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  defaultType,
}: FeedbackDialogProps) => {
  const posthog = usePostHog();
  const t = useTranslations('feedback');
  const [internalOpen, setInternalOpen] = useState(false);
  const [view, setView] = useState<'type' | 'form' | 'success'>('type');
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(
    defaultType || null,
  );
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setView(defaultType ? 'form' : 'type');
        setSelectedType(defaultType || null);
        setMessage('');
        if (!userEmail) setEmail('');
      }, 200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, defaultType, userEmail]);

  useEffect(() => {
    if (defaultType) {
      setSelectedType(defaultType);
      setView('form');
    }
  }, [defaultType]);

  const handleTypeSelect = (type: FeedbackType) => {
    setSelectedType(type);
    setView('form');
  };

  const handleBack = () => {
    if (defaultType) {
      setOpen(false);
    } else {
      setView('type');
      setSelectedType(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !message.trim()) return;

    setIsSubmitting(true);

    try {
      posthog?.capture(TRACKING_EVENTS.FEEDBACK_SUBMITTED, {
        feedback_type: selectedType,
        feedback_message: message,
        user_email: email || undefined,
        user_name: userName || undefined,
        page_url:
          typeof window !== 'undefined' ? window.location.href : undefined,
        $set: email ? { email } : undefined,
      });

      setView('success');
      setTimeout(() => {
        setOpen(false);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentType = selectedType ? feedbackTypeConfig[selectedType] : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden rounded-3xl border-2 border-paper-cream-dark">
        <AnimatePresence mode="wait">
          {view === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              <DialogHeader className="pb-4">
                <DialogTitle className="font-tondo text-xl font-bold text-center text-text-primary">
                  {t('title')}
                </DialogTitle>
                <p className="text-sm text-text-secondary text-center mt-1 font-tondo">
                  {t('subtitle')}
                </p>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 mt-2">
                {(Object.keys(feedbackTypeConfig) as FeedbackType[]).map(
                  (type) => {
                    const config = feedbackTypeConfig[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeSelect(type)}
                        className="flex flex-col items-center gap-3 rounded-2xl border-2 border-paper-cream-dark p-5 text-center transition-all hover:border-crayon-orange hover:bg-crayon-orange/5 focus:outline-none focus:ring-2 focus:ring-crayon-orange/20 active:scale-95"
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-full ${config.bgColor}`}
                        >
                          <FontAwesomeIcon
                            icon={config.icon}
                            className={`text-lg ${config.color}`}
                            style={config.iconStyle}
                          />
                        </div>
                        <span className="text-sm font-tondo font-bold text-text-primary">
                          {t(`types.${type}.label`)}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </motion.div>
          )}

          {view === 'form' && currentType && selectedType && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-6 pb-0">
                <DialogHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-paper-cream"
                    >
                      <FontAwesomeIcon
                        icon={faArrowLeft}
                        className="text-text-secondary"
                        style={
                          {
                            '--fa-primary-color': 'hsl(var(--text-secondary))',
                            '--fa-secondary-color':
                              'hsl(var(--text-secondary))',
                            '--fa-secondary-opacity': '0.5',
                          } as React.CSSProperties
                        }
                      />
                    </button>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${currentType.bgColor}`}
                    >
                      <FontAwesomeIcon
                        icon={currentType.icon}
                        className={currentType.color}
                        style={currentType.iconStyle}
                      />
                    </div>
                    <DialogTitle className="font-tondo text-lg font-bold text-text-primary">
                      {t(`types.${selectedType}.label`)}
                    </DialogTitle>
                  </div>
                </DialogHeader>
              </div>

              <form onSubmit={handleSubmit} className="p-6 pt-2">
                <div className="space-y-4">
                  <div>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t(`types.${selectedType}.placeholder`)}
                      className="min-h-[140px] resize-none rounded-xl border-paper-cream-dark focus:border-crayon-orange focus:ring-crayon-orange/20 font-tondo"
                      required
                      autoFocus
                    />
                  </div>

                  {!userEmail && (
                    <div>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        className="h-11 rounded-xl border-paper-cream-dark focus:border-crayon-orange focus:ring-crayon-orange/20 font-tondo"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !message.trim()}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-crayon-orange to-crayon-orange-dark text-white font-tondo font-bold shadow-btn-primary hover:shadow-btn-primary-hover hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isSubmitting ? (
                      <>
                        <FontAwesomeIcon
                          icon={faSpinnerThird}
                          className="mr-2 animate-spin"
                          style={
                            {
                              '--fa-primary-color': 'white',
                              '--fa-secondary-color': 'white',
                              '--fa-secondary-opacity': '0.5',
                            } as React.CSSProperties
                          }
                        />
                        {t('sending')}
                      </>
                    ) : (
                      t('sendButton')
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-8"
            >
              <div className="flex flex-col items-center justify-center text-center py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-crayon-green/20 mb-4">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="text-3xl text-crayon-green"
                    style={
                      {
                        '--fa-primary-color': 'hsl(var(--crayon-green))',
                        '--fa-secondary-color': 'hsl(var(--crayon-green-dark))',
                        '--fa-secondary-opacity': '0.7',
                      } as React.CSSProperties
                    }
                  />
                </div>
                <h3 className="font-tondo text-xl font-bold text-text-primary">
                  {t('successTitle')}
                </h3>
                <p className="text-text-secondary font-tondo mt-2">
                  {t('successMessage')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
