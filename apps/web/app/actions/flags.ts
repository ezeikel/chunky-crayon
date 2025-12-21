'use server';

import { updateTag } from 'next/cache';

export const onFlagChanged = async () => {
  // optionally: verify webhook / admin auth here
  updateTag('feature:showAuthButtons');
};
