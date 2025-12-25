'use client';

import { useState, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faCheck, faTimes } from '@fortawesome/pro-solid-svg-icons';
import cn from '@/utils/cn';

type AdultGateProps = {
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
};

// Generate a simple math problem that adults can solve easily
const generateMathProblem = () => {
  const num1 = Math.floor(Math.random() * 10) + 5; // 5-14
  const num2 = Math.floor(Math.random() * 10) + 5; // 5-14
  return {
    question: `${num1} + ${num2}`,
    answer: num1 + num2,
  };
};

const AdultGate = ({ onSuccess, onCancel, className }: AdultGateProps) => {
  const problem = useMemo(() => generateMathProblem(), []);
  const [userAnswer, setUserAnswer] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const numAnswer = parseInt(userAnswer, 10);

      if (numAnswer === problem.answer) {
        onSuccess();
      } else {
        setError(true);
        setAttempts((prev) => prev + 1);
        setUserAnswer('');
        // Clear error after 2 seconds
        setTimeout(() => setError(false), 2000);
      }
    },
    [userAnswer, problem.answer, onSuccess],
  );

  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-full bg-crayon-purple flex items-center justify-center">
          <FontAwesomeIcon icon={faLock} className="text-white text-lg" />
        </div>
        <h3 className="text-xl font-bold text-text-primary">Grown-Up Check</h3>
      </div>

      {/* Explanation */}
      <p className="text-center text-text-secondary text-sm mb-6">
        Please ask a grown-up to solve this to continue.
      </p>

      {/* Math Problem */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center">
          <p className="text-lg text-text-secondary mb-2">What is:</p>
          <p className="text-4xl font-bold text-crayon-purple mb-4">
            {problem.question} = ?
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Type the answer"
            className={cn(
              'w-full px-4 py-3 text-xl text-center font-bold rounded-xl border-2 outline-none transition-colors',
              error
                ? 'border-crayon-pink bg-red-50 animate-shake'
                : 'border-paper-cream-dark focus:border-crayon-purple',
            )}
            autoFocus
          />
          {error && (
            <p className="text-crayon-pink text-sm text-center mt-2">
              Oops! Try again{attempts > 1 ? ` (${attempts} attempts)` : ''}.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full font-bold text-text-secondary bg-paper-cream border-2 border-paper-cream-dark hover:bg-paper-cream-dark transition-colors"
          >
            <FontAwesomeIcon icon={faTimes} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={!userAnswer}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full font-bold text-white transition-all',
              userAnswer
                ? 'bg-crayon-green hover:bg-crayon-green-dark active:scale-95'
                : 'bg-gray-300 cursor-not-allowed',
            )}
          >
            <FontAwesomeIcon icon={faCheck} />
            Check
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdultGate;
