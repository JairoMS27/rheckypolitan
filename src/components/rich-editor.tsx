"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { uploadAuthorImage } from "@/lib/author-api";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Youtube as YoutubeIcon,
  Undo2,
  Redo2,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  RemoveFormatting,
  Pilcrow,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

function ToolbarBtn({
  active,
  onClick,
  children,
  title,
  disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors disabled:opacity-40 ${
        active
          ? "bg-[#B22234] text-white"
          : "text-foreground/80 hover:bg-foreground/8 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 hidden h-5 w-px bg-foreground/12 sm:inline-block" aria-hidden />;
}

async function uploadInlineImage(file: File): Promise<string> {
  const { publicUrl } = await uploadAuthorImage(file, { kind: "inline" });
  return publicUrl;
}

function Toolbar({
  editor,
  onImagePick,
}: {
  editor: Editor;
  onImagePick: () => void;
}) {
  const addLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addYoutube = () => {
    const url = window.prompt("URL del vídeo de YouTube");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-foreground/10 bg-background/95 px-2 py-1.5 backdrop-blur-sm">
      <ToolbarBtn
        title="Deshacer"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Rehacer"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        title="Párrafo"
        active={editor.isActive("paragraph") && !editor.isActive("heading")}
        onClick={() => editor.chain().focus().setParagraph().run()}
      >
        <Pilcrow className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Titular"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Subtítulo"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Antetítulo / sección"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        title="Negrita"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Cursiva"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Subrayado"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Tachado"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Resaltar"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        title="Alinear izquierda"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Centrar"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Alinear derecha"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Justificar"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn
        title="Lista"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Cita destacada"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Separador editorial"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarBtn>

      <Divider />

      <ToolbarBtn title="Enlace" active={editor.isActive("link")} onClick={addLink}>
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Insertar imagen" onClick={onImagePick}>
        <ImageIcon className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn title="Vídeo de YouTube" onClick={addYoutube}>
        <YoutubeIcon className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Quitar formato"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <RemoveFormatting className="h-3.5 w-3.5" />
      </ToolbarBtn>
    </div>
  );
}

function SelectionBubble({ editor }: { editor: Editor }) {
  if (!editor) return null;

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", offset: 8 }}
      className="flex items-center gap-0.5 rounded-md border border-foreground/15 bg-background px-1 py-1 shadow-lg"
    >
      <ToolbarBtn
        title="Negrita"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Cursiva"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Subrayado"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Resaltar"
        active={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <Highlighter className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Enlace"
        active={editor.isActive("link")}
        onClick={() => {
          const prev = editor.getAttributes("link").href as string | undefined;
          const url = window.prompt("URL del enlace", prev ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </ToolbarBtn>
      <ToolbarBtn
        title="Cita"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarBtn>
    </BubbleMenu>
  );
}

export function RichEditor({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [ready, setReady] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Highlight.configure({ multicolor: false }),
      Typography,
      CharacterCount,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "magazine-figure",
        },
      }),
      Youtube.configure({ controls: true, nocookie: true }),
      Placeholder.configure({
        placeholder: "Empieza por el lead: un párrafo que enganche… luego desarrolla la historia.",
      }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "magazine-editor prose-editor focus:outline-none",
        spellcheck: "true",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || !event.dataTransfer?.files?.length) return false;
        const file = event.dataTransfer.files[0];
        if (!file?.type.startsWith("image/")) return false;
        event.preventDefault();
        void (async () => {
          const t = toast.loading("Subiendo imagen…");
          try {
            const url = await uploadInlineImage(file);
            const { schema } = view.state;
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (!coordinates || !schema.nodes.image) return;
            const node = schema.nodes.image.create({ src: url, alt: file.name });
            const tr = view.state.tr.insert(coordinates.pos, node);
            view.dispatch(tr);
            toast.success("Imagen añadida", { id: t });
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Error al subir", { id: t });
          }
        })();
        return true;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (!file) continue;
            event.preventDefault();
            void (async () => {
              const t = toast.loading("Subiendo imagen pegada…");
              try {
                const url = await uploadInlineImage(file);
                editor?.chain().focus().setImage({ src: url, alt: "Imagen" }).run();
                toast.success("Imagen añadida", { id: t });
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Error al subir", {
                  id: t,
                });
              }
            })();
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    onCreate: () => setReady(true),
  });

  // Keep external value in sync when loading an existing article
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = editor.getHTML();
    if (value && value !== current && !editor.isFocused) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const onImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !editor) return;
      const t = toast.loading("Subiendo imagen…");
      try {
        const url = await uploadInlineImage(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        toast.success("Imagen añadida", { id: t });
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al subir", { id: t });
      }
    },
    [editor],
  );

  if (!editor) {
    return (
      <div className="overflow-hidden rounded-md border border-foreground/12 bg-background shadow-sm">
        <div className="h-11 border-b border-foreground/10 bg-muted/30" />
        <div className="min-h-[480px] px-6 py-8 text-sm text-muted-foreground">
          Cargando editor…
        </div>
      </div>
    );
  }

  const words = editor.storage.characterCount?.words?.() ?? 0;
  const chars = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className="overflow-hidden rounded-md border border-foreground/12 bg-background shadow-sm">
      <Toolbar editor={editor} onImagePick={() => fileRef.current?.click()} />
      {ready && <SelectionBubble editor={editor} />}

      <div className="relative bg-[linear-gradient(to_bottom,hsl(var(--muted)/0.35)_0,transparent_120px)]">
        <div className="mx-auto max-w-[42rem] px-5 py-8 sm:px-8 sm:py-10">
          <p className="mb-6 border-b border-foreground/8 pb-3 font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            Cuerpo del artículo · estilo revista
          </p>
          <EditorContent editor={editor} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-foreground/10 bg-muted/25 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Selecciona texto para formato rápido · arrastra o pega imágenes
        </p>
        <p className="font-mono text-[10px] tabular-nums tracking-wider text-muted-foreground">
          {words} {words === 1 ? "palabra" : "palabras"} · {chars} caracteres
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />

      <style>{`
        .magazine-editor {
          min-height: 480px;
          max-width: none;
          font-family: var(--font-serif, "Fraunces", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif);
          font-size: 1.125rem;
          line-height: 1.8;
          color: hsl(var(--foreground));
          letter-spacing: 0.01em;
        }
        .magazine-editor > *:first-child {
          margin-top: 0;
        }
        .magazine-editor p {
          margin: 0 0 1.15em;
          text-wrap: pretty;
        }
        .magazine-editor p:first-of-type {
          font-size: 1.2rem;
          line-height: 1.65;
          color: hsl(var(--foreground) / 0.92);
        }
        .magazine-editor h1 {
          font-family: var(--font-serif, "Fraunces", Georgia, serif);
          font-size: 2.15rem;
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.02em;
          margin: 1.4em 0 0.5em;
        }
        .magazine-editor h2 {
          font-family: var(--font-serif, "Fraunces", Georgia, serif);
          font-size: 1.55rem;
          font-weight: 600;
          line-height: 1.25;
          margin: 1.5em 0 0.45em;
        }
        .magazine-editor h3 {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #B22234;
          margin: 1.6em 0 0.6em;
        }
        .magazine-editor ul,
        .magazine-editor ol {
          padding-left: 1.35rem;
          margin: 0 0 1.15em;
        }
        .magazine-editor ul { list-style: disc; }
        .magazine-editor ol { list-style: decimal; }
        .magazine-editor li { margin: 0.35em 0; }
        .magazine-editor li p { margin: 0.2em 0; }
        .magazine-editor blockquote {
          position: relative;
          margin: 1.75em 0;
          padding: 0.25rem 0 0.25rem 1.35rem;
          border-left: 3px solid #B22234;
          font-size: 1.28rem;
          font-style: italic;
          line-height: 1.55;
          color: hsl(var(--foreground) / 0.88);
        }
        .magazine-editor blockquote p { margin: 0.4em 0; }
        .magazine-editor a {
          color: #B22234;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 1px;
        }
        .magazine-editor img,
        .magazine-editor .magazine-figure {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 1.75em auto;
          border-radius: 2px;
        }
        .magazine-editor iframe {
          width: 100%;
          aspect-ratio: 16/9;
          height: auto;
          margin: 1.75em 0;
          border: 0;
          border-radius: 2px;
        }
        .magazine-editor hr {
          border: 0;
          margin: 2.25em auto;
          width: 4rem;
          height: 2px;
          background: #B22234;
          opacity: 0.7;
        }
        .magazine-editor mark {
          background: color-mix(in srgb, #B22234 18%, transparent);
          color: inherit;
          padding: 0.05em 0.15em;
          border-radius: 2px;
        }
        .magazine-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
          font-style: italic;
          font-size: 1.05rem;
        }
        .magazine-editor:focus {
          outline: none;
        }
        .ProseMirror-selectednode {
          outline: 2px solid #B22234;
          outline-offset: 3px;
        }
      `}</style>
    </div>
  );
}
