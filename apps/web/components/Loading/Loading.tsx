import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinnerThird } from '@fortawesome/pro-regular-svg-icons';
import cn from '@/utils/cn';

type LoadingProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

const Loading = ({ className, size = 'md' }: LoadingProps) => (
  <div className={cn('flex items-center justify-center p-4', className)}>
    <FontAwesomeIcon
      icon={faSpinnerThird}
      className={cn('animate-spin text-gray-500', sizeClasses[size])}
    />
  </div>
);

export default Loading;
