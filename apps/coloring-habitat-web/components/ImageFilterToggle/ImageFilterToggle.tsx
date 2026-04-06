"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faUsers } from "@fortawesome/pro-duotone-svg-icons";
import cn from "@/utils/cn";
import useUser from "@/hooks/useUser";

type ImageFilterToggleProps = {
  className?: string;
  showCommunityImages?: boolean;
};

const ImageFilterToggle = ({
  className,
  showCommunityImages = false,
}: ImageFilterToggleProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const show = searchParams.get("show") || "all";
  const { user } = useUser();

  const handleSelect = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("show", value);
    router.push(`?${params.toString()}`);
  };

  // Only show if user is logged in AND community images is enabled in settings
  if (!user || !showCommunityImages) {
    return null;
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {/* Everyone's button */}
      <button
        type="button"
        onClick={() => handleSelect("all")}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-full font-sans font-bold text-base",
          "transition-all duration-200 hover:scale-105 active:scale-95",
          "border-2",
          show === "all"
            ? "bg-accent text-white border-accent shadow-lg"
            : "bg-white text-muted-foreground border-border hover:border-accent hover:text-accent",
        )}
      >
        <FontAwesomeIcon
          icon={faUsers}
          className="text-lg"
          style={
            show === "all"
              ? ({
                  "--fa-primary-color": "#ffffff",
                  "--fa-secondary-color": "#ffffff",
                  "--fa-secondary-opacity": "0.7",
                } as React.CSSProperties)
              : ({
                  "--fa-primary-color": "hsl(var(--accent))",
                  "--fa-secondary-color": "hsl(var(--primary))",
                  "--fa-secondary-opacity": "0.8",
                } as React.CSSProperties)
          }
        />
        Everyone&apos;s
      </button>

      {/* Mine button */}
      <button
        type="button"
        onClick={() => handleSelect("user")}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-full font-sans font-bold text-base",
          "transition-all duration-200 hover:scale-105 active:scale-95",
          "border-2",
          show === "user"
            ? "bg-primary text-white border-primary shadow-lg"
            : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary",
        )}
      >
        <FontAwesomeIcon
          icon={faUser}
          className="text-lg"
          style={
            show === "user"
              ? ({
                  "--fa-primary-color": "#ffffff",
                  "--fa-secondary-color": "#ffffff",
                  "--fa-secondary-opacity": "0.7",
                } as React.CSSProperties)
              : ({
                  "--fa-primary-color": "hsl(var(--primary))",
                  "--fa-secondary-color": "hsl(var(--accent))",
                  "--fa-secondary-opacity": "0.8",
                } as React.CSSProperties)
          }
        />
        Mine
      </button>
    </div>
  );
};

export default ImageFilterToggle;
