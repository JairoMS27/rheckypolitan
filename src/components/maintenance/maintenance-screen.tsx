import { MAINTENANCE_TEST_ID } from "@/lib/maintenance";

export function MaintenanceScreen() {
  return (
    <div
      data-testid={MAINTENANCE_TEST_ID}
      className="flex min-h-screen flex-col bg-background text-foreground"
    >
      <div
        className="h-2 w-full shrink-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#B22234]">
          ★ Obras en curso ★
        </p>
        <h1 className="mt-4 text-center font-display text-4xl leading-tight md:text-5xl">
          Estamos reconstruyendo
          <br />
          <span className="italic text-[#B22234]">el archivo.</span>
        </h1>
        <p className="mt-6 max-w-md text-center text-sm leading-relaxed text-muted-foreground">
          Rheckypolitan está en mantenimiento. Volvemos en breve con el archivo
          listo para hojear.
        </p>

        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Louisville, KY · En construcción
        </p>
      </main>

      <div
        className="h-2 w-full shrink-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #B22234 0 2px, #ffffff 2px 4px)",
        }}
        aria-hidden
      />
    </div>
  );
}