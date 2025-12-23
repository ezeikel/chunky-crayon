'use client';

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
