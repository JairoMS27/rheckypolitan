import type { ReactNode } from "react";

/**
 * Shared staff page chrome — Fraunces titles, mono kickers, editorial red accent.
 */
export function AdminPageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 border-b border-foreground/15 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B22234]">
            ★ {kicker}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight md:text-5xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function AdminEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-foreground/25 bg-muted/20 px-6 py-20 text-center">
      <p className="font-display text-2xl">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function AdminPanel({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-foreground/15 bg-background ${className}`}>
      {title ? (
        <div className="border-b border-foreground/10 px-5 py-3">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
