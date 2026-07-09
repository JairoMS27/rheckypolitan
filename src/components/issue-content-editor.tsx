import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

export type SummaryItem = { p: string; section: string; title: string };
export type QuoteItem = { text: string; author: string; where: string };
export type CreditItem = { rol: string; nombres: string };

export type IssueContent = {
  subtitle: string;
  summary: SummaryItem[];
  show_quotes: boolean;
  quotes: QuoteItem[];
  credits: CreditItem[];
};

export const emptyContent: IssueContent = {
  subtitle: "",
  summary: [],
  show_quotes: true,
  quotes: [],
  credits: [],
};

export function IssueContentEditor({
  value,
  onChange,
}: {
  value: IssueContent;
  onChange: (v: IssueContent) => void;
}) {
  const set = <K extends keyof IssueContent>(k: K, v: IssueContent[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="space-y-10">
      <div>
        <Label className="text-[11px] uppercase tracking-widest">
          Texto debajo del título
        </Label>
        <Textarea
          rows={4}
          value={value.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
          className="mt-2"
          placeholder="Una entrega dedicada al oficio lento…"
        />
      </div>

      {/* SUMARIO */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <Label className="text-[11px] uppercase tracking-widest">
            Lo que vas a encontrar dentro · {value.summary.length}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("summary", [...value.summary, { p: "", section: "", title: "" }])
            }
          >
            + Añadir entrada
          </Button>
        </div>
        <ul className="space-y-2">
          {value.summary.map((s, i) => (
            <li key={i} className="grid grid-cols-[60px_1fr_2fr_auto] gap-2">
              <Input
                placeholder="04"
                value={s.p}
                onChange={(e) => {
                  const next = [...value.summary];
                  next[i] = { ...s, p: e.target.value };
                  set("summary", next);
                }}
              />
              <Input
                placeholder="Sección"
                value={s.section}
                onChange={(e) => {
                  const next = [...value.summary];
                  next[i] = { ...s, section: e.target.value };
                  set("summary", next);
                }}
              />
              <Input
                placeholder="Título"
                value={s.title}
                onChange={(e) => {
                  const next = [...value.summary];
                  next[i] = { ...s, title: e.target.value };
                  set("summary", next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  set(
                    "summary",
                    value.summary.filter((_, j) => j !== i),
                  )
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {/* CITAS */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label className="flex items-center gap-3 text-[11px] uppercase tracking-widest">
            Citas
            <Switch
              checked={value.show_quotes}
              onCheckedChange={(v) => set("show_quotes", v)}
            />
            <span className="text-muted-foreground">
              {value.show_quotes ? "Mostrar" : "Oculto"}
            </span>
          </Label>
          {value.show_quotes && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                set("quotes", [
                  ...value.quotes,
                  { text: "", author: "", where: "" },
                ])
              }
            >
              + Añadir cita
            </Button>
          )}
        </div>
        {value.show_quotes && (
          <ul className="space-y-3">
            {value.quotes.map((q, i) => (
              <li key={i} className="rounded border border-foreground/10 p-3">
                <Textarea
                  rows={2}
                  placeholder="Texto de la cita"
                  value={q.text}
                  onChange={(e) => {
                    const next = [...value.quotes];
                    next[i] = { ...q, text: e.target.value };
                    set("quotes", next);
                  }}
                />
                <div className="mt-2 grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input
                    placeholder="Autor"
                    value={q.author}
                    onChange={(e) => {
                      const next = [...value.quotes];
                      next[i] = { ...q, author: e.target.value };
                      set("quotes", next);
                    }}
                  />
                  <Input
                    placeholder="Sección, p. 04"
                    value={q.where}
                    onChange={(e) => {
                      const next = [...value.quotes];
                      next[i] = { ...q, where: e.target.value };
                      set("quotes", next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      set(
                        "quotes",
                        value.quotes.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CRÉDITOS */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <Label className="text-[11px] uppercase tracking-widest">
            Créditos · {value.credits.length}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("credits", [...value.credits, { rol: "", nombres: "" }])
            }
          >
            + Añadir crédito
          </Button>
        </div>
        <ul className="space-y-2">
          {value.credits.map((c, i) => (
            <li key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              <Input
                placeholder="Rol (Editor, Fotografía…)"
                value={c.rol}
                onChange={(e) => {
                  const next = [...value.credits];
                  next[i] = { ...c, rol: e.target.value };
                  set("credits", next);
                }}
              />
              <Input
                placeholder="Nombres separados por · o coma"
                value={c.nombres}
                onChange={(e) => {
                  const next = [...value.credits];
                  next[i] = { ...c, nombres: e.target.value };
                  set("credits", next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  set(
                    "credits",
                    value.credits.filter((_, j) => j !== i),
                  )
                }
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
