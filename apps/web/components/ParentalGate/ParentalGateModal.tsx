'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  operator: '+' | '-' | '×';
  answer: number;
};

const generateMathProblem = (): MathProblem => {
  // Generate problems that are challenging enough for adults but not impossible
  // Kids typically can't quickly solve: multiplication, larger additions, or subtraction with larger numbers
  const operators: Array<'+' | '-' | '×'> = ['+', '-', '×'];
  const operator = operators[Math.floor(Math.random() * operators.length)];

  let num1: number;
  let num2: number;
  let answer: number;

  switch (operator) {
    case '×':
      // Multiplication: 3-9 × 3-9 (e.g., 7 × 8 = 56)
      num1 = Math.floor(Math.random() * 7) + 3;
      num2 = Math.floor(Math.random() * 7) + 3;
      answer = num1 * num2;
      break;
    case '-':
      // Subtraction: larger number minus smaller, result between 10-50
      num1 = Math.floor(Math.random() * 50) + 30; // 30-79
      num2 = Math.floor(Math.random() * 20) + 10; // 10-29
      answer = num1 - num2;
      break;
    case '+':
    default:
      // Addition: two numbers that sum to 30-80
      num1 = Math.floor(Math.random() * 30) + 20; // 20-49
      num2 = Math.floor(Math.random() * 30) + 15; // 15-44
      answer = num1 + num2;
      break;
  }

  return { num1, num2, operator, answer };
};

type ParentalGateModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPath: string;
};

// Default problem to avoid Math.random() during SSR
const DEFAULT_PROBLEM: MathProblem = {
  num1: 12,
  num2: 8,
  operator: '+',
  answer: 20,
};

const ParentalGateModal = ({
  open,
  onOpenChange,
  targetPath,
}: ParentalGateModalProps) => {
  const router = useRouter();
  const [problem, setProblem] = useState<MathProblem>(DEFAULT_PROBLEM);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  // Generate a new problem when modal opens (client-side only)
  useEffect(() => {
    if (open) {
      setProblem(generateMathProblem());
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
          setProblem(generateMathProblem());
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
          <DialogTitle className="text-2xl">Grown-ups only!</DialogTitle>
          <DialogDescription className="text-base">
            Solve this math problem to continue
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
              placeholder="Your answer"
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
                Not quite right! Try another one...
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
            Check Answer
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ParentalGateModal;
