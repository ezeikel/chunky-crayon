'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faGlobe } from '@fortawesome/pro-regular-svg-icons';
import cn from '@/utils/cn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useUser from '@/hooks/useUser';

type ImageFilterToggleProps = {
  className?: string;
};

const ImageFilterToggle = ({ className }: ImageFilterToggleProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get('show') || 'all';
  const { user } = useUser();

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('show', value);
    router.push(`?${params.toString()}`);
  };

  if (!user) {
    return null;
  }

  return (
    <Select value={show} onValueChange={handleValueChange}>
      <SelectTrigger className={cn('w-[180px]', className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={show === 'all' ? faGlobe : faUser}
              className="text-gray-600"
            />
            <span className="text-gray-700 font-medium">
              {show === 'all' ? 'All Images' : 'My Images'}
            </span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faGlobe} className="text-gray-600" />
            <span>All Images</span>
          </div>
        </SelectItem>
        <SelectItem value="user">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUser} className="text-gray-600" />
            <span>My Images</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ImageFilterToggle;
