"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CheckCircle2, XCircle, Info, Loader2, AlertTriangle } from "lucide-react";

/**
 * Brand toasts: top-right, high contrast, type-colored left bar.
 * Easy to notice; success / error / warning clearly distinct.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      position="top-right"
      expand
      visibleToasts={5}
      duration={4500}
      closeButton
      gap={10}
      offset={16}
      className="toaster group"
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
        error: <XCircle className="h-5 w-5 text-[#B22234]" />,
        info: <Info className="h-5 w-5 text-sky-600" />,
        warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-foreground/70" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "group flex w-[min(100vw-2rem,24rem)] items-start gap-3 border border-foreground/12 bg-background px-4 py-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] ring-1 ring-black/5",
          title: "font-display text-[15px] leading-snug text-foreground",
          description: "mt-0.5 text-[13px] leading-relaxed text-muted-foreground",
          content: "flex-1 min-w-0 pr-2",
          icon: "mt-0.5 shrink-0",
          closeButton:
            "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-sm border border-foreground/10 bg-background text-muted-foreground opacity-70 transition hover:opacity-100 hover:text-foreground",
          actionButton:
            "mt-2 border border-foreground bg-foreground px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-background",
          cancelButton:
            "mt-2 border border-foreground/20 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground",
          success:
            "border-l-[3px] border-l-emerald-600 bg-[linear-gradient(90deg,rgba(5,150,105,0.08),transparent_40%)]",
          error:
            "border-l-[3px] border-l-[#B22234] bg-[linear-gradient(90deg,rgba(178,34,52,0.1),transparent_40%)]",
          warning:
            "border-l-[3px] border-l-amber-500 bg-[linear-gradient(90deg,rgba(245,158,11,0.1),transparent_40%)]",
          info:
            "border-l-[3px] border-l-sky-600 bg-[linear-gradient(90deg,rgba(2,132,199,0.08),transparent_40%)]",
          loading:
            "border-l-[3px] border-l-foreground/40",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
