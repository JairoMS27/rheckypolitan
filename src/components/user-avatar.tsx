"use client";

import Link from "next/link";
import { profilePath } from "@/lib/username";

function initialsFrom(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type Props = {
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** When false, never wrap in a profile link. */
  link?: boolean;
};

const sizes = {
  sm: "h-8 w-8 text-[9px]",
  md: "h-10 w-10 text-[11px]",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function UserAvatar({
  displayName,
  username,
  avatarUrl,
  size = "sm",
  className = "",
  link = true,
}: Props) {
  const href = link ? profilePath(username) : null;
  const shell = (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-foreground font-mono font-bold text-background ${sizes[size]} ${className}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="media-outline h-full w-full object-cover"
        />
      ) : (
        initialsFrom(displayName || "?")
      )}
    </div>
  );

  if (!href) return shell;

  return (
    <Link
      href={href}
      className="shrink-0 transition-opacity duration-150 ease-out hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B22234] active:scale-[0.96]"
      title={`Ver perfil de ${displayName}`}
    >
      {shell}
    </Link>
  );
}
