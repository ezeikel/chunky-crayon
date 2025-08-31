'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createColoringImage } from '@/app/actions';
import cn from '@/utils/cn';
import { trackEvent } from '@/utils/analytics';
import { ANALYTICS_EVENTS } from '@/constants';
import UserInput from './UserInput';
import UserInputV2 from './UserInputV2';

type CreateColoringPageFormProps = {
  className?: string;
  showAuthButtons?: boolean;
};

const CreateColoringPageForm = ({
  className,
  showAuthButtons = false,
}: CreateColoringPageFormProps) => {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const InputComponent = showAuthButtons ? UserInputV2 : UserInput;

  return (
    <div className="max-w-lg flex flex-col gap-y-4 p-8 bg-white rounded-lg shadow-perfect">
      <p className="font-tondo font-bold text-xl text-orange text-center">
        Describe a scene and let Chunky Crayon generate a unique colouring page
        for you! ✨
      </p>
      <p className="font-tondo text-[#A6A6A6] text-base leading-6 font-bold text-center">
        (This can take up to 2 minutes - please be patient)
      </p>
      <form
        action={async (formData) => {
          const rawFormData = {
            description: (formData.get('description') as string) || '',
          };

          trackEvent(ANALYTICS_EVENTS.SUBMITTED_COLORING_IMAGE_DESCRIPTION, {
            description: rawFormData.description,
            type: 'text',
          });

          const coloringImage = await createColoringImage(formData);

          if ('error' in coloringImage) {
            console.error(coloringImage.error);
            return;
          }

          router.push(`/coloring-image/${coloringImage.id}`);
        }}
        ref={formRef}
        className={cn('flex flex-col gap-y-4', {
          [className as string]: !!className,
        })}
      >
        <InputComponent />
      </form>
    </div>
  );
};

export default CreateColoringPageForm;
