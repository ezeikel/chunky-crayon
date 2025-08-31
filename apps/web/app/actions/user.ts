'use server';

import { auth } from '@/auth';
import { ACTIONS } from '@/constants';
import { db, Prisma } from '@/lib/prisma';

export const getUserId = async (action?: string) => {
  const session = await auth();

  const userId = session?.user.id;

  // if the action is to get the current user, return the user id without checking if the user is logged in
  if (
    action === ACTIONS.GET_CURRENT_USER ||
    action === ACTIONS.GET_ALL_COLORING_IMAGES
  ) {
    return userId;
  }

  if (!userId) {
    console.error(
      `You need to be logged in to ${action || 'perform this action'}.`,
    );
    return null;
  }

  return userId;
};

export const getCurrentUser = async (): Promise<Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    name: true;
    image: true;
    stripeCustomerId: true;
    credits: true;
    subscriptions: {
      select: {
        id: true;
        stripeSubscriptionId: true;
        planName: true;
        billingPeriod: true;
        status: true;
        currentPeriodEnd: true;
      };
    };
  };
}> | null> => {
  const userId = await getUserId(ACTIONS.GET_CURRENT_USER);

  if (!userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      stripeCustomerId: true,
      credits: true,
      subscriptions: {
        select: {
          id: true,
          stripeSubscriptionId: true,
          planName: true,
          billingPeriod: true,
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  return user;
};
