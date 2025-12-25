'use client';

type DailyImageHeadingProps = {
  createdAt: Date | null;
};

const DailyImageHeading = ({ createdAt }: DailyImageHeadingProps) => {
  // Check if it's today's image or a fallback
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const imageDate = createdAt ? new Date(createdAt) : null;
  const isToday = imageDate && imageDate >= today;

  return (
    <h3 className="font-tondo font-bold text-lg text-text-primary">
      {isToday ? "Today's Daily Page" : 'Latest Daily Page'}
    </h3>
  );
};

export default DailyImageHeading;
