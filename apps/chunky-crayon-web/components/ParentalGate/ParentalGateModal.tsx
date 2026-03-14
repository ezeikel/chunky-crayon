'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCalculator } from '@fortawesome/pro-duotone-svg-icons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import cn from '@/utils/cn';

type MathProblem = {
  num1: number;
  num2: number;
  operator: '×';
  answer: number;
};

// UK Year 4 level multiplication - easy for adults, challenging for ages 3-8
const SIMPLE_PROBLEMS: MathProblem[] = [
  { num1: 7, num2: 8, operator: '×', answer: 56 },
  { num1: 9, num2: 6, operator: '×', answer: 54 },
  { num1: 8, num2: 7, operator: '×', answer: 56 },
  { num1: 6, num2: 9, operator: '×', answer: 54 },
  { num1: 8, num2: 6, operator: '×', answer: 48 },
  { num1: 7, num2: 9, operator: '×', answer: 63 },
  { num1: 9, num2: 8, operator: '×', answer: 72 },
  { num1: 6, num2: 7, operator: '×', answer: 42 },
  { num1: 8, num2: 9, operator: '×', answer: 72 },
  { num1: 7, num2: 6, operator: '×', answer: 42 },
];

const getRandomProblem = (): MathProblem => {
  return SIMPLE_PROBLEMS[Math.floor(Math.random() * SIMPLE_PROBLEMS.length)];
};

type ParentalGateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPath: string;
};

// Default problem to avoid Math.random() during SSR
const DEFAULT_PROBLEM: MathProblem = SIMPLE_PROBLEMS[0];

const ParentalGateModal = ({
  open,
  onOpenChange,
  targetPath,
}: ParentalGateModalProps) => {
  const t = useTranslations('parentalGate');
  const router = useRouter();
  const [problem, setProblem] = useState<MathProblem>(DEFAULT_PROBLEM);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  // Generate a new problem when modal opens (client-side only)
  useEffect(() => {
    if (open) {
      setProblem(getRandomProblem());
      setUserAnswer('');
      setError(false);
    }
  }, [open]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const numericAnswer = parseInt(userAnswer, 10);

      if (numericAnswer === problem.answer) {
        // Correct! Navigate to target
        onOpenChange(false);

        // Handle external links (mailto:, http://, https://)
        if (
          targetPath.startsWith('mailto:') ||
          targetPath.startsWith('http://') ||
          targetPath.startsWith('https://')
        ) {
          window.open(targetPath, '_blank', 'noopener,noreferrer');
        } else {
          router.push(targetPath);
        }
      } else {
        // Wrong answer - shake and show error
        setError(true);
        setShake(true);
        setUserAnswer('');

        // Remove shake after animation
        setTimeout(() => setShake(false), 500);

        // Generate a new problem after a short delay
        setTimeout(() => {
          setProblem(getRandomProblem());
          setError(false);
        }, 1500);
      }
    },
    [userAnswer, problem.answer, targetPath, router, onOpenChange],
  );

  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-teal))',
    '--fa-secondary-opacity': '0.8',
  } as React.CSSProperties;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(shake && 'animate-shake')}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-crayon-orange/10 flex items-center justify-center">
              <FontAwesomeIcon
                icon={faLock}
                className="text-3xl"
                style={iconStyle}
              />
            </div>
          </div>
          <DialogTitle className="text-2xl">{t('title')}</DialogTitle>
          <DialogDescription className="text-base">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Math Problem Display */}
          <div className="flex items-center justify-center gap-4 py-6 px-4 bg-paper-cream rounded-2xl">
            <FontAwesomeIcon
              icon={faCalculator}
              className="text-2xl text-crayon-teal"
              style={iconStyle}
            />
            <span className="font-tondo text-4xl font-bold text-text-primary">
              {problem.num1} {problem.operator} {problem.num2} = ?
            </span>
          </div>

          {/* Answer Input */}
          <div className="space-y-2">
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder={t('placeholder')}
              className={cn(
                'w-full px-6 py-4 text-center text-2xl font-tondo font-bold',
                'rounded-2xl border-3 transition-all duration-200',
                'focus:outline-none focus:ring-4',
                error
                  ? 'border-red-400 bg-red-50 focus:ring-red-200'
                  : 'border-paper-cream-dark bg-white focus:border-crayon-teal focus:ring-crayon-teal/20',
              )}
              autoFocus
            />
            {error && (
              <p className="text-center text-red-500 font-tondo font-medium animate-in fade-in">
                {t('error')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!userAnswer}
            className={cn(
              'w-full py-4 px-6 rounded-full font-tondo font-bold text-lg text-white',
              'transition-all duration-200 hover:scale-105 active:scale-95',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              'bg-crayon-orange shadow-btn-primary hover:shadow-btn-primary-hover',
            )}
          >
            {t('submit')}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ParentalGateModal;
