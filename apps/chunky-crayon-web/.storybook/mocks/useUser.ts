const useUser = () => ({
  user: null,
  isLoading: false,
  isSignedIn: false,
  hasEnoughCredits: false,
  hasActiveSubscription: false,
  handleAuthAction: (action: string) =>
    console.info('[storybook] auth action', action),
  isGuest: true,
  guestGenerationsRemaining: 3,
  guestGenerationsUsed: 0,
  maxGuestGenerations: 3,
  incrementGuestGeneration: () => undefined,
  resetGuestData: () => undefined,
  canGenerate: true,
  blockedReason: null,
});

export default useUser;
