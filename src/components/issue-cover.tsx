import { publicUrl } from "@/lib/storage";

type Props = {
  number: number;
  coverPath: string | null;
  className?: string;
};

export function IssueCover({ number, coverPath, className = "" }: Props) {
  return (
    <div className={`relative aspect-[3/4] [perspective:1600px] ${className}`}>
      {/* back pages stack */}
      <div
        aria-hidden
        className="absolute inset-y-[3px] right-0 w-[5px] translate-x-[2.5px] bg-gradient-to-r from-foreground/15 via-background to-foreground/10"
      />
      <div
        aria-hidden
        className="absolute inset-y-[5px] right-0 w-[2px] translate-x-[1px] bg-foreground/10"
      />
      {/* magazine wrapper (rotates in 3D) */}
      <div className="relative h-full w-full origin-left transition-transform duration-[1400ms] ease-[cubic-bezier(0.16,0.84,0.3,1)] [transform-style:preserve-3d] will-change-transform group-hover:[transform:rotateY(-12deg)]">
        {/* spine (left side face) */}
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 w-[10px] origin-right [transform:rotateY(90deg)] [backface-visibility:hidden] bg-gradient-to-r from-foreground/80 via-foreground/40 to-foreground/70"
        >
          <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-background/30" />
        </div>
        {/* cover face */}
        <div className="relative h-full w-full overflow-hidden bg-muted shadow-[0_18px_40px_-18px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,0,0,0.05)] [backface-visibility:hidden] transition-shadow duration-[1400ms] ease-[cubic-bezier(0.16,0.84,0.3,1)] group-hover:shadow-[0_24px_48px_-22px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,0,0,0.05)]">
          {coverPath ? (
            <img
              src={publicUrl(coverPath)}
              alt={`Portada N.º ${number}`}
              loading="lazy"
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-6xl">
              {number}
            </div>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/45 via-black/10 to-transparent transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,0.84,0.3,1)] group-hover:opacity-60"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent mix-blend-overlay transition-opacity duration-[1400ms] ease-[cubic-bezier(0.16,0.84,0.3,1)] group-hover:opacity-80"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-b from-black/20 to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
