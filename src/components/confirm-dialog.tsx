"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive styling for delete actions */
  tone?: "default" | "danger";
};

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirm that replaces window.confirm with a brand AlertDialog.
 * Usage: const ok = await confirm({ title: "¿Borrar?", tone: "danger" })
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: "¿Confirmar?",
  });
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = useCallback((value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
    resolver.current = null;
  }, []);

  const value = useMemo(() => confirm, [confirm]);
  const tone = options.tone ?? "default";

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next) finish(false);
        }}
      >
        <AlertDialogContent className="max-w-md rounded-none border-foreground/20 bg-background p-0 shadow-2xl sm:rounded-none">
          <div
            className="h-1.5 w-full"
            style={{
              backgroundImage:
                tone === "danger"
                  ? "repeating-linear-gradient(to right, #B22234 0 8px, #ffffff 8px 16px)"
                  : "repeating-linear-gradient(to right, #0a0a0a 0 8px, #ffffff 8px 16px)",
            }}
            aria-hidden
          />
          <AlertDialogHeader className="space-y-2 px-6 pt-5 text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#B22234]">
              {tone === "danger" ? "★ Acción irreversible" : "★ Confirmar"}
            </p>
            <AlertDialogTitle className="font-display text-2xl font-normal leading-tight">
              {options.title}
            </AlertDialogTitle>
            {options.description ? (
              <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {options.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 border-t border-foreground/10 px-6 py-4 sm:space-x-2">
            <AlertDialogCancel
              onClick={() => finish(false)}
              className="rounded-none border-foreground/20 bg-transparent font-mono text-[10px] uppercase tracking-widest active:scale-[0.96]"
            >
              {options.cancelLabel ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => finish(true)}
              className={
                tone === "danger"
                  ? "rounded-none border border-[#B22234] bg-[#B22234] font-mono text-[10px] uppercase tracking-widest text-white hover:border-[#8B1A29] hover:bg-[#8B1A29] active:scale-[0.96]"
                  : "rounded-none border border-foreground bg-foreground font-mono text-[10px] uppercase tracking-widest text-background hover:border-[#B22234] hover:bg-[#B22234] active:scale-[0.96]"
              }
            >
              {options.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback so components still work outside provider (should not happen)
    return async (opts) =>
      typeof window !== "undefined"
        ? window.confirm(opts.description ? `${opts.title}\n\n${opts.description}` : opts.title)
        : false;
  }
  return ctx;
}
