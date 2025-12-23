'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint } from '@fortawesome/pro-regular-svg-icons';
import { trackEvent } from '@/utils/analytics-client';
import { TRACKING_EVENTS } from '@/constants';

const PrintButton = () => (
  <button
    className="bg-crayon-orange size-12 rounded-full flex items-center justify-center"
    type="button"
    aria-label="print"
    onClick={() => {
      trackEvent(TRACKING_EVENTS.PRINT_CLICKED, {});
    }}
  >
    <FontAwesomeIcon icon={faPrint} className="text-3xl text-white" />
  </button>
);

export default PrintButton;
