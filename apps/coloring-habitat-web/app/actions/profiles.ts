"use server";

// Stub — profiles simplified for Habitat (no kid profile switching)
// These are placeholder server actions to satisfy imports

import { getUserId } from "./user";
import { ACTIONS } from "@/constants";

export const getActiveProfile = async () => {
  const userId = await getUserId(ACTIONS.GET_ACTIVE_PROFILE);
  if (!userId) return null;
  return null;
};

export const getProfiles = async () => {
  const userId = await getUserId(ACTIONS.GET_PROFILES);
  if (!userId) return null;
  return [];
};
