import { forwardRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

type SubmitButtonProps = {
  text?: string;
  className?: string;
  /** Additional disabled state (combines with form pending state) */
  disabled?: boolean;
  /** Optional leading icon shown before the label (hidden while pending). */
  icon?: IconDefinition;
  'data-testid'?: string;
};

const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ text, className, disabled, icon, 'data-testid': dataTestId }, ref) => {
    const { pending } = useFormStatus();

    return (
      <Button
        ref={ref}
        type="submit"
        disabled={pending || disabled}
        data-testid={dataTestId}
        className={cn('flex gap-x-2', {
          [className as string]: !!className,
        })}
      >
        {icon && !pending ? (
          <FontAwesomeIcon
            icon={icon}
            className="text-lg"
            style={
              {
                '--fa-primary-color': 'white',
                '--fa-secondary-color': 'rgba(255, 255, 255, 0.85)',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
        ) : null}
        {text || 'Submit'}
        {pending ? (
          <FontAwesomeIcon
            icon={faSpinnerThird}
            className="text-lg animate-spin"
            style={
              {
                '--fa-primary-color': 'white',
                '--fa-secondary-color': 'rgba(255, 255, 255, 0.6)',
                '--fa-secondary-opacity': '1',
              } as React.CSSProperties
            }
          />
        ) : null}
      </Button>
    );
  },
);

SubmitButton.displayName = 'SubmitButton';

export default SubmitButton;
