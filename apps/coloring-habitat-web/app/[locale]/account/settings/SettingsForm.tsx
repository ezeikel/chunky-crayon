"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("accountSettings");

  const handleCommunityToggle = (checked: boolean) => {
    setShowCommunityImages(checked);

    startTransition(async () => {
      const result = await updateShowCommunityImages(checked);

      if (result.error) {
        toast.error(result.error);
        setShowCommunityImages(!checked);
      } else {
        toast.success(checked ? t("communityEnabled") : t("communityDisabled"));
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("account")}</CardTitle>
          <CardDescription>{t("accountDetails")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">
                {t("email")}
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                {initialSettings?.email || t("noEmail")}
              </p>
            </div>
            {initialSettings?.name && (
              <div>
                <label className="text-sm font-medium text-foreground">
                  {t("name")}
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  {initialSettings.name}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("galleryPreferences")}</CardTitle>
          <CardDescription>{t("galleryControl")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label
                htmlFor="show-community"
                className="text-sm font-medium leading-none"
              >
                {t("showCommunityArtwork")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("showCommunityDescription")}
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
