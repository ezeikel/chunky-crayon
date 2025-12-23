import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

type LoadingProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Optional loading text to show below spinner */
  text?: string;
};

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-3xl',
  lg: 'text-5xl',
};

const Loading = ({ className, size = 'md', text }: LoadingProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-3 p-4',
      className,
    )}
  >
    <FontAwesomeIcon
      icon={faSpinnerThird}
      className={cn('animate-spin', sizeClasses[size])}
      style={
        {
          '--fa-primary-color': 'hsl(var(--crayon-orange))',
          '--fa-secondary-color': 'hsl(var(--crayon-teal))',
          '--fa-secondary-opacity': '0.6',
        } as React.CSSProperties
      }
    />
    {text && (
      <p className="font-tondo text-sm text-text-secondary animate-pulse">
        {text}
      </p>
    )}
  </div>
);

export default Loading;
