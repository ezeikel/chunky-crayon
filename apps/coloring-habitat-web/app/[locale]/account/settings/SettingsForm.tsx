"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateShowCommunityImages } from "@/app/actions/settings";

type SettingsFormProps = {
  initialSettings: {
    showCommunityImages: boolean;
    email: string | null;
    name: string | null;
  } | null;
};

const SettingsForm = ({ initialSettings }: SettingsFormProps) => {
  const [showCommunityImages, setShowCommunityImages] = useState(
    initialSettings?.showCommunityImages ?? false,
  );
  const [isPending, startTransition] = useTransition();

  const handleCommunityToggle = (checked: boolean) => {
    setShowCommunityImages(checked);

    startTransition(async () => {
      const result = await updateShowCommunityImages(checked);

      if (result.error) {
        toast.error(result.error);
        setShowCommunityImages(!checked);
      } else {
        toast.success(
          checked
            ? "Community gallery images enabled"
            : "Community gallery images disabled",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {initialSettings?.email || "No email set"}
              </p>
            </div>
            {initialSettings?.name && (
              <div>
                <label className="text-sm font-medium text-foreground">
                  Name
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {initialSettings.name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Community Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery Preferences</CardTitle>
          <CardDescription>Control your gallery experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label
                htmlFor="show-community"
                className="text-sm font-medium leading-none"
              >
                Show community artwork
              </label>
              <p className="text-sm text-muted-foreground">
                Display artwork shared by other members in the gallery
              </p>
            </div>
            <Switch
              id="show-community"
              checked={showCommunityImages}
              onCheckedChange={handleCommunityToggle}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsForm;
