import { showAuthButtonsFlag } from '@/flags';
import CreateColoringPageForm from './CreateColoringPageForm';

type CreateColoringPageFormWrapperProps = {
  className?: string;
};

// Server component wrapper that reads the flag
async function CreateColoringPageFormWrapper({
  className,
}: CreateColoringPageFormWrapperProps) {
  // Read the flag value (this uses 'use cache: private')
  const showAuthButtons = await showAuthButtonsFlag();

  // Pass the flag value to the client component
  return (
    <CreateColoringPageForm
      className={className}
      showAuthButtons={showAuthButtons as boolean}
    />
  );
}

export default CreateColoringPageFormWrapper;
