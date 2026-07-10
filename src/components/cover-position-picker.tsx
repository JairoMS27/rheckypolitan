"use client";

import { useCallback, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

type Props = {
  src: string;
  position: string;
  onChange: (position: string) => void;
};

function parsePosition(position: string): { x: number; y: number } {
  const parts = position.trim().split(/\s+/);
  const x = Math.min(100, Math.max(0, parseFloat(parts[0] ?? "50") || 50));
  const y = Math.min(100, Math.max(0, parseFloat(parts[1] ?? "50") || 50));
  return { x, y };
}

function formatPosition(x: number, y: number): string {
  return `${x.toFixed(1)}% ${y.toFixed(1)}%`;
}

/**
 * Cover focus control: drag the pin on a real object-cover frame
 * (same math as the public site), fine-tune with sliders, live previews.
 */
export function CoverPositionPicker({ src, position, onChange }: Props) {
  const { x, y } = parsePosition(position);
  const frameRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const setFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = frameRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return;
      const nx = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
      const ny = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
      onChange(formatPosition(nx, ny));
    },
    [onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setFromPoint(e.clientX, e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFromPoint(e.clientX, e.clientY);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  return (
    <div className="w-full max-w-xl space-y-4 rounded-md border border-foreground/10 bg-muted/20 p-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Zona visible de la portada
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Arrastra el punto rojo hasta la zona que quieres que se vea. También puedes usar los
          deslizadores o los atajos.
        </p>
      </div>

      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative aspect-[16/10] w-full touch-none select-none overflow-hidden border border-foreground/20 bg-black/5 ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        role="application"
        aria-label="Ajustar punto de interés de la portada"
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: position }}
        />

        {/* Soft vignette so the pin stays readable */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${x}% ${y}%, transparent 12%, rgba(0,0,0,0.22) 70%)`,
          }}
        />

        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-white/50"
          style={{ left: `${x}%` }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 h-px bg-white/50"
          style={{ top: `${y}%` }}
        />

        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <div className="relative flex h-11 w-11 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#B22234]/25" />
            <span className="absolute h-9 w-9 rounded-full border-2 border-white shadow-md" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#B22234] shadow" />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white backdrop-blur-sm">
          {dragging ? "Soltar para fijar" : "Arrastra el punto"}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Horizontal
            </label>
            <span className="font-mono text-[10px] text-muted-foreground">{x.toFixed(0)}%</span>
          </div>
          <Slider
            value={[x]}
            min={0}
            max={100}
            step={0.5}
            onValueChange={([v]) => onChange(formatPosition(v ?? 50, y))}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Vertical
            </label>
            <span className="font-mono text-[10px] text-muted-foreground">{y.toFixed(0)}%</span>
          </div>
          <Slider
            value={[y]}
            min={0}
            max={100}
            step={0.5}
            onValueChange={([v]) => onChange(formatPosition(x, v ?? 50))}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Atajos
        </span>
        {(
          [
            ["Centro", 50, 50],
            ["Arriba", 50, 18],
            ["Abajo", 50, 82],
            ["Izquierda", 22, 50],
            ["Derecha", 78, 50],
          ] as const
        ).map(([label, px, py]) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant="outline"
            className="h-7 font-mono text-[10px] uppercase tracking-widest"
            onClick={() => onChange(formatPosition(px, py))}
          >
            {label}
          </Button>
        ))}
      </div>

      <div>
        <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Cómo se verá
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="aspect-[4/3] overflow-hidden border border-foreground/15 bg-muted">
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: position }}
              />
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Listado 4:3
            </p>
          </div>
          <div>
            <div className="aspect-[16/9] overflow-hidden border border-foreground/15 bg-muted">
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: position }}
              />
            </div>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              Cabecera 16:9
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
