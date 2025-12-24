'use client';

import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSparkles } from '@fortawesome/pro-duotone-svg-icons';

const DashboardHeader = () => {
  const iconStyle = {
    '--fa-primary-color': 'hsl(var(--crayon-orange))',
    '--fa-secondary-color': 'hsl(var(--crayon-yellow))',
    '--fa-secondary-opacity': '1',
  } as React.CSSProperties;

  return (
    <div className="text-center mb-6 md:mb-8">
      {/* Colo mascot greeting */}
      <div className="flex justify-center mb-4">
        <div className="relative animate-float">
          <Image
            src="/images/colo.svg"
            alt="Colo the friendly crayon mascot"
            width={80}
            height={80}
            className="drop-shadow-md md:w-[100px] md:h-[100px]"
          />
          {/* Sparkle */}
          <span className="absolute -top-1 -right-1 text-lg animate-pulse">
            ✨
          </span>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 mb-3">
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-2xl md:text-3xl"
          style={iconStyle}
        />
        <h1 className="font-tondo font-bold text-2xl md:text-3xl lg:text-4xl text-text-primary">
          What do you want to color today?
        </h1>
        <FontAwesomeIcon
          icon={faSparkles}
          className="text-2xl md:text-3xl"
          style={iconStyle}
        />
      </div>
    </div>
  );
};

export default DashboardHeader;
