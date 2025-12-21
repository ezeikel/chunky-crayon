import { cacheLife, cacheTag } from 'next/cache';

const CachedLastUpdateDate = async () => {
  'use cache';

  cacheLife('max');
  cacheTag('last-update-date');

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return <>{date}</>;
};

export default CachedLastUpdateDate;
