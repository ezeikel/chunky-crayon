import { getProviderData, createFlagsDiscoveryEndpoint } from 'flags/next';
import { showAuthButtonsFlagDefinition } from '../../../../flags';

// Only pass flag definitions to discovery endpoint, not wrapper functions
export const GET = createFlagsDiscoveryEndpoint(() =>
  getProviderData({ showAuthButtonsFlagDefinition }),
);
