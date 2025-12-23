import cn from '@/utils/cn';

type PageWrapProps = {
  children: React.ReactNode;
  className?: string;
};

const PageWrap = ({ children, className }: PageWrapProps) => (
  <div
    className={cn(
      'max-w-[100vw] min-h-screen flex flex-col p-4 md:p-6 lg:p-8 pt-8 md:pt-12',
      className,
    )}
  >
    {children}
  </div>
);

export default PageWrap;
