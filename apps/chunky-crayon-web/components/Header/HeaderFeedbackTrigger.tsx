'use client';

import FeedbackDialog from '@/components/FeedbackDialog/FeedbackDialog';

type HeaderFeedbackTriggerProps = {
  label: string;
  className: string;
  userEmail?: string;
  userName?: string;
};

const HeaderFeedbackTrigger = ({
  label,
  className,
  userEmail,
  userName,
}: HeaderFeedbackTriggerProps) => (
  <FeedbackDialog
    userEmail={userEmail}
    userName={userName}
    trigger={
      <button type="button" className={className}>
        {label}
      </button>
    }
  />
);

export default HeaderFeedbackTrigger;
