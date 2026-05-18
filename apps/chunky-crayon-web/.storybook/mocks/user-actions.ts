export const getCurrentUser = async () => ({
  id: 'storybook-user',
  email: 'maya@example.com',
  name: 'Maya Parent',
  credits: 125,
  role: 'USER',
  subscriptions: [{ id: 'sub_123', planName: 'SPLASH', status: 'ACTIVE' }],
});

export const getUserId = async () => 'storybook-user';
