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

function CreateColoringPageFormWrapper({
  className,
  size = 'default',
  location,
}: CreateColoringPageFormWrapperProps) {
  return (
    <CreateColoringPageForm
      className={className}
      size={size}
      location={location}
    />
  );
}

export default CreateColoringPageFormWrapper;
