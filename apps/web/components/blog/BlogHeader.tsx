import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenNib } from '@fortawesome/pro-duotone-svg-icons';
import cn from '@/utils/cn';

type BlogHeaderProps = {
  title?: string;
  description?: string;
  className?: string;
};

const BlogHeader = ({
  title = 'The Chunky Crayon Blog',
  description = 'Tips, ideas, and inspiration for creative coloring activities',
  className,
}: BlogHeaderProps) => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <header className={cn('text-center mb-10 md:mb-12', className)}>
      <div className="inline-flex items-center gap-3 mb-4">
        <FontAwesomeIcon
          icon={faPenNib}
          className="text-3xl md:text-4xl"
          style={iconStyle}
        />
        <h1 className="font-tondo font-bold text-2xl md:text-3xl lg:text-4xl text-text-primary">
          {title}
        </h1>
      </div>
      <p className="text-text-secondary max-w-2xl mx-auto">{description}</p>
    </header>
  );
};

export default BlogHeader;
