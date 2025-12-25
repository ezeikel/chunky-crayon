'use client';

import { format } from 'date-fns';

type TodaysDateProps = {
  formatString?: string;
  className?: string;
};

const TodaysDate = ({
  formatString = 'MMMM d, yyyy',
  className,
}: TodaysDateProps) => {
  return <span className={className}>{format(new Date(), formatString)}</span>;
};

export default TodaysDate;
