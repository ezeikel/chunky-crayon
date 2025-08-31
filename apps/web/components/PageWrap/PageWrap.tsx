import cn from '@/utils/cn';

type PageWrapProps = {
  children: React.ReactNode;
  className?: string;
};

const PageWrap = ({ children, className }: PageWrapProps) => (
  <div
    className={cn('max-w-[100vw] min-h-screen flex flex-col p-4 pt-16', {
      [className as string]: !!className,
    })}
  >
    {children}
  </div>
);

export default PageWrap;
