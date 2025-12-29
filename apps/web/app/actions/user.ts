'use server';

import { auth } from '@/auth';
import { ACTIONS } from '@/constants';
import { db, Prisma } from '@chunky-crayon/db';

export const getUserId = async (action?: string) => {
  const session = await auth();

  const userId = session?.user.id;

  // These actions can return null without logging an error (guest-friendly)
  if (
    action === ACTIONS.GET_CURRENT_USER ||
    action === ACTIONS.GET_ALL_COLORING_IMAGES ||
    action === ACTIONS.CREATE_CHECKOUT_SESSION ||
    action === ACTIONS.GET_ACTIVE_PROFILE
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
