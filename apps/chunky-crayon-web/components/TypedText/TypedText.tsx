'use client';

import { ReactTyped } from 'react-typed';
import cn from '@/utils/cn';

type TypedTextProps = {
  strings: string[];
  className?: string;
};

const TypedText = ({ strings, className }: TypedTextProps) => (
  <ReactTyped
    className={cn({
      [className as string]: !!className,
    })}
    strings={strings}
    typeSpeed={40}
    loop
    showCursor={false}
    backDelay={1500}
  />
);

export default TypedText;
