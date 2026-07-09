import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, X } from "lucide-react";

export type PageFile = {
  id: string;
  file: File;
  url: string;
};

export function PageUploader({ pages, onChange }: { pages: PageFile[]; onChange: (next: PageFile[]) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const sorted = Array.from(files).sort((a, b) => a.name.localeCompare(b.name));
    const newOnes: PageFile[] = sorted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      url: URL.createObjectURL(file),
    }));
    onChange([...pages, ...newOnes]);
  };

  const remove = (id: string) => {
    onChange(pages.filter((p) => p.id !== id));
  };
  /* Comment goes here */

  const onDragStart = (i: number) => setDragIndex(i);
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    const next = [...pages];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setDragIndex(i);
    onChange(next);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Páginas · {pages.length}
        </p>
        <label>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <Button type="button" variant="outline" size="sm" asChild>
            <span>+ Añadir imágenes</span>
          </Button>
        </label>
      </div>

      {pages.length === 0 ? (
        <label className="flex h-40 cursor-pointer items-center justify-center border border-dashed border-foreground/30 text-sm text-muted-foreground">
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          Selecciona imágenes (se ordenarán alfabéticamente, puedes reordenar arrastrando).
        </label>
      ) : (
        <ul className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
          {pages.map((p, i) => (
            <li
              key={p.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={() => setDragIndex(null)}
              className="group relative aspect-[3/4] cursor-grab bg-muted active:cursor-grabbing"
            >
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              <div className="absolute left-1 top-1 bg-black/70 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {i + 1}
              </div>
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute right-1 top-1 bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Quitar"
              >
                <X className="h-3 w-3" />
              </button>
              <GripVertical className="absolute bottom-1 left-1 h-4 w-4 text-white opacity-0 drop-shadow group-hover:opacity-100" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
