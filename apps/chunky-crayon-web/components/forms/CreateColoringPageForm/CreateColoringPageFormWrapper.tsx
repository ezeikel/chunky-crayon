import CreateColoringPageForm from './CreateColoringPageForm';

type CreateColoringPageFormWrapperProps = {
  className?: string;
  /** Size variant - 'large' for logged-in dashboard */
  size?: 'default' | 'large';
};

function CreateColoringPageFormWrapper({
  className,
  size = 'default',
}: CreateColoringPageFormWrapperProps) {
  return <CreateColoringPageForm className={className} size={size} />;
}

export default CreateColoringPageFormWrapper;
