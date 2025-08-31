'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/pro-regular-svg-icons';
import { trackEvent } from '@/utils/analytics';
import { ANALYTICS_EVENTS } from '@/constants';

const PrintButton = () => (
  <button
    className="bg-[#FF8A65] size-12 rounded-full flex items-center justify-center"
    type="button"
    aria-label="print"
    onClick={() => trackEvent(ANALYTICS_EVENTS.CLICKED_PRINT_COLORING_IMAGE)}
  >
    <FontAwesomeIcon icon={faPrint} className="text-3xl text-white" />
  </button>
);

export default PrintButton;
