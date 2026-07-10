"use client";

import Link from "next/link";
import { profilePath } from "@/lib/username";

/** Distinctive mark next to author name when the account holds the redactor role. */
export function RedactorBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`ml-1.5 inline-flex items-center border border-[#B22234] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#B22234] ${className}`}
      title="Redactor de Rheckypolitan"
    >
      Redactor
    </span>
  );
}

export function AuthorByline({
  author,
  isRedactor,
  username,
  className = "",
  /** When true (default), wrap author in profile link if username is set. */
  link = true,
}: {
  author: string | null | undefined;
  isRedactor?: boolean;
  username?: string | null;
  className?: string;
  link?: boolean;
}) {
  if (!author) return null;

  const href = link ? profilePath(username) : null;
  const name = href ? (
    <Link
      href={href}
      className="underline-offset-2 hover:text-[#B22234] hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {author}
    </Link>
  ) : (
    <span>{author}</span>
  );

  return (
    <span className={className}>
      {" · "}
      {name}
      {isRedactor ? <RedactorBadge /> : null}
    </span>
  );
}
