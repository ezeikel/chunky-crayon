"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCreditCard,
  faGear,
  faArrowRightFromBracket,
  faUser,
  faHeadset,
  faPalette,
  faCoins,
} from "@fortawesome/free-solid-svg-icons";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

type HeaderDropdownProps = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    credits?: number;
  };
};

const HeaderDropdown = ({ user }: HeaderDropdownProps) => {
  const displayName = user.name || user.email?.split("@")[0] || "Account";
  const initials =
    user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <Avatar className="h-7 w-7">
            {user.image && <AvatarImage src={user.image} alt={displayName} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline text-foreground">
            {displayName.split(" ")[0]}
          </span>
          {typeof user.credits === "number" && (
            <>
              <span className="hidden sm:inline text-muted-foreground">|</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-foreground">
                <FontAwesomeIcon
                  icon={faCoins}
                  className="text-xs text-amber-500"
                />
                {user.credits}
              </span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/my-artwork" className="cursor-pointer">
            <FontAwesomeIcon
              icon={faPalette}
              className="text-muted-foreground"
            />
            My Artwork
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/billing" className="cursor-pointer">
            <FontAwesomeIcon
              icon={faCreditCard}
              className="text-muted-foreground"
            />
            Billing
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/settings" className="cursor-pointer">
            <FontAwesomeIcon icon={faGear} className="text-muted-foreground" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="mailto:support@coloringhabitat.com"
            className="cursor-pointer"
          >
            <FontAwesomeIcon
              icon={faHeadset}
              className="text-muted-foreground"
            />
            Support
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeaderDropdown;
