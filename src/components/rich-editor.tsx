import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadAuthorImage } from "@/lib/author-api";
import {
  Bold,
  Italic,
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
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded border border-foreground/10 transition-colors hover:bg-foreground/5 ${
        active ? "bg-foreground text-background hover:bg-foreground" : ""
      }`}
    >
      {children}
    </button>
  );
}

async function uploadInlineImage(file: File): Promise<string> {
  // Any logged-in author — server uploads under posts/ only (never revistas).
  const { publicUrl } = await uploadAuthorImage(file, { kind: "inline" });
  return publicUrl;
}

function Toolbar({ editor }: { editor: Editor }) {
  const fileRef = useRef<HTMLInputElement>(null);

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

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const t = toast.loading("Subiendo imagen…");
    try {
      const url = await uploadInlineImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      toast.success("Imagen añadida", { id: t });
    } catch (err: any) {
      toast.error(err.message ?? "Error al subir", { id: t });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-foreground/10 bg-muted/40 px-2 py-2">
      <ToolbarBtn title="Negrita" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Cursiva" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Tachado" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough className="h-4 w-4" />
      </ToolbarBtn>
      <span className="mx-1 h-5 w-px bg-foreground/15" />
      <ToolbarBtn title="Título 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Título 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Título 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="h-4 w-4" />
      </ToolbarBtn>
      <span className="mx-1 h-5 w-px bg-foreground/15" />
      <ToolbarBtn title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Cita" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Separador" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <Minus className="h-4 w-4" />
      </ToolbarBtn>
      <span className="mx-1 h-5 w-px bg-foreground/15" />
      <ToolbarBtn title="Enlace" active={editor.isActive("link")} onClick={addLink}>
        <LinkIcon className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Imagen" onClick={() => fileRef.current?.click()}>
        <ImageIcon className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="YouTube" onClick={addYoutube}>
        <YoutubeIcon className="h-4 w-4" />
      </ToolbarBtn>
      <span className="mx-1 h-5 w-px bg-foreground/15" />
      <ToolbarBtn title="Deshacer" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="h-4 w-4" />
      </ToolbarBtn>
      <ToolbarBtn title="Rehacer" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="h-4 w-4" />
      </ToolbarBtn>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImage} />
    </div>
  );
}

export function RichEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
      Image,
      Youtube.configure({ controls: true, nocookie: true }),
      Placeholder.configure({ placeholder: "Escribe la noticia…" }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-[400px] max-w-none px-4 py-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) {
    return (
      <div className="rounded border border-foreground/10">
        <div className="h-12 border-b border-foreground/10 bg-muted/40" />
        <div className="min-h-[400px] px-4 py-4 text-sm text-muted-foreground">Cargando editor…</div>
      </div>
    );
  }

  return (
    <div className="rounded border border-foreground/10">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <style>{`
        .prose-editor p { margin: 0.6em 0; line-height: 1.7; }
        .prose-editor h1 { font-size: 2rem; font-weight: 600; margin: 1em 0 0.4em; }
        .prose-editor h2 { font-size: 1.5rem; font-weight: 600; margin: 1em 0 0.4em; }
        .prose-editor h3 { font-size: 1.2rem; font-weight: 600; margin: 1em 0 0.4em; }
        .prose-editor ul, .prose-editor ol { padding-left: 1.5rem; margin: 0.6em 0; }
        .prose-editor ul { list-style: disc; }
        .prose-editor ol { list-style: decimal; }
        .prose-editor blockquote { border-left: 3px solid #B22234; padding-left: 1rem; color: hsl(var(--muted-foreground)); font-style: italic; margin: 1em 0; }
        .prose-editor a { color: #B22234; text-decoration: underline; }
        .prose-editor img { max-width: 100%; height: auto; margin: 1em 0; }
        .prose-editor iframe { width: 100%; aspect-ratio: 16/9; height: auto; margin: 1em 0; }
        .prose-editor hr { border: 0; border-top: 1px solid hsl(var(--border)); margin: 1.5em 0; }
        .prose-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left; color: hsl(var(--muted-foreground)); pointer-events: none; height: 0;
        }
      `}</style>
    </div>
  );
}
