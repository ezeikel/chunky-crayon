import { getCurrencyForRequest } from '@/lib/currency.server';
import CreateColoringPageForm from './CreateColoringPageForm';

type CreateColoringPageFormWrapperProps = {
  className?: string;
  /** Size variant - 'large' for logged-in dashboard */
  size?: 'default' | 'large';
  /** Where this form is mounted — used for example-prompt pill gating and
   *  analytics. Homepage uses 'homepage'; the dedicated ad landing page
   *  passes 'start'. */
  location?: 'homepage' | 'start';
};

/**
 * Async server wrapper. Resolves the geo currency here (not in the page
 * component) so reading the `x-vercel-ip-country` header doesn't push
 * the whole page out of the static shell — the wrapper is always
 * rendered inside a Suspense boundary, so only this subtree is dynamic.
 * Currency is forwarded to the form for the in-form PaywallModal's
 * plan prices.
 */
async function CreateColoringPageFormWrapper({
  className,
  size = 'default',
  location,
}: CreateColoringPageFormWrapperProps) {
  const currency = await getCurrencyForRequest();
  return (
    <CreateColoringPageForm
      className={className}
      size={size}
      location={location}
      currency={currency}
    />
  );
}

export default CreateColoringPageFormWrapper;
