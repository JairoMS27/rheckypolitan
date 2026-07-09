import { useEffect, useState } from "react";

// Próximo miércoles a las 22:00 (hora local del visitante)
function getNextTarget(): Date {
  const now = new Date();
  const target = new Date(now);
  const day = now.getDay(); // 0=domingo ... 3=miércoles
  let diff = (3 - day + 7) % 7;
  target.setHours(22, 0, 0, 0);
  if (diff === 0 && target.getTime() <= now.getTime()) {
    diff = 7;
  }
  target.setDate(now.getDate() + diff);
  return target;
}

export function SummerCountdownBanner() {
  const [target] = useState<Date>(() => getNextTarget());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target.getTime() - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);

  const pad = (n: number) => String(n).padStart(2, "0");

  const Cell = ({ value, label }: { value: string; label: string }) => (
    <div className="flex flex-col items-center leading-none">
      <span className="font-display text-xl font-bold tabular-nums md:text-2xl">{value}</span>
      <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.2em] opacity-80 md:text-[9px]">
        {label}
      </span>
    </div>
  );

  return (
    <div className="w-full bg-[#B22234] text-white">
      <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-center gap-3 px-6 py-3 md:flex-row md:gap-6">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
          ★ Especial Verano ★
        </span>
        <span className="hidden font-display text-sm italic md:inline">
          Miércoles a las 22:00
        </span>
        <div className="flex items-center gap-3 md:gap-4">
          <Cell value={pad(days)} label="Días" />
          <span aria-hidden className="font-display text-xl opacity-60">:</span>
          <Cell value={pad(hours)} label="Hrs" />
          <span aria-hidden className="font-display text-xl opacity-60">:</span>
          <Cell value={pad(minutes)} label="Min" />
          <span aria-hidden className="font-display text-xl opacity-60">:</span>
          <Cell value={pad(seconds)} label="Seg" />
        </div>
      </div>
    </div>
  );
}
