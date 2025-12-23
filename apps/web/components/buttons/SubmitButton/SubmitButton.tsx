import { forwardRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';

type SubmitButtonProps = {
  text?: string;
  className?: string;
  /** Additional disabled state (combines with form pending state) */
  disabled?: boolean;
};

const SubmitButton = forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ text, className, disabled }, ref) => {
    const { pending } = useFormStatus();

    return (
      <Button
        ref={ref}
        type="submit"
        disabled={pending || disabled}
        className={cn('flex gap-x-2', {
          [className as string]: !!className,
        })}
      >
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
