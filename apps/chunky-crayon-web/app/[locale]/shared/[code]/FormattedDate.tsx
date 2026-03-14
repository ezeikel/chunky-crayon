'use client';

import { format } from 'date-fns';

type FormattedDateProps = {
  date: Date | string;
  formatPattern?: string;
};

const FormattedDate = ({
  date,
  formatPattern = 'MMMM d, yyyy',
}: FormattedDateProps) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return <>{format(dateObj, formatPattern)}</>;
};

export default FormattedDate;
