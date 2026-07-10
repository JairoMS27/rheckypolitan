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
  className = "",
}: {
  author: string | null | undefined;
  isRedactor?: boolean;
  className?: string;
}) {
  if (!author) return null;
  return (
    <span className={className}>
      {" · "}
      {author}
      {isRedactor ? <RedactorBadge /> : null}
    </span>
  );
}
