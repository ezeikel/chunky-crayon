'use client';

import { useCallback, type ReactNode } from 'react';
import { useParentalGate } from './ParentalGateContext';

type ParentalGateLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
};

const ParentalGateLink = ({
  href,
  children,
  className,
}: ParentalGateLinkProps) => {
  const { openGate } = useParentalGate();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      openGate(href);
    },
    [openGate, href],
  );

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
};

export default ParentalGateLink;
