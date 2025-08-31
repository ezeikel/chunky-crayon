import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import cn from '@/utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';

type SubmitButtonProps = {
  text?: string;
  className?: string;
};

const SubmitButton = ({ text, className }: SubmitButtonProps) => {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn('flex gap-x-2', {
        [className as string]: !!className,
      })}
    >
      {text || 'Submit'}
      {pending ? (
        <FontAwesomeIcon
          icon={faSpinnerThird}
          className="text-white text-lg animate-spin"
        />
      ) : null}
    </Button>
  );
};

export default SubmitButton;
