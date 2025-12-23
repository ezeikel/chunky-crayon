'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { updateShowCommunityImages } from '@/app/actions/settings';

type SettingsFormProps = {
  initialSettings: {
    showCommunityImages: boolean;
  } | null;
};

const SettingsForm = ({ initialSettings }: SettingsFormProps) => {
  const [showCommunityImages, setShowCommunityImages] = useState(
    initialSettings?.showCommunityImages ?? false,
  );
  const [isPending, startTransition] = useTransition();

  const handleToggle = (checked: boolean) => {
    setShowCommunityImages(checked);

    startTransition(async () => {
      const result = await updateShowCommunityImages(checked);

      if (result.error) {
        toast.error(result.error);
        // Revert on error
        setShowCommunityImages(!checked);
      } else {
        toast.success(
          checked ? 'Community images enabled' : 'Community images disabled',
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Parental Controls</span>
          </CardTitle>
          <CardDescription>
            Control what content is visible when using the app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label
                htmlFor="show-community"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show community images
              </label>
              <p className="text-sm text-muted-foreground">
                When enabled, you&apos;ll see coloring pages created by other
                users in the gallery. When disabled, only your own creations are
                shown.
              </p>
            </div>
            <Switch
              id="show-community"
              checked={showCommunityImages}
              onCheckedChange={handleToggle}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsForm;
