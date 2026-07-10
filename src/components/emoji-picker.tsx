"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

type Category = {
  id: string;
  label: string;
  emojis: string[];
};

const CATEGORIES: Category[] = [
  {
    id: "smileys",
    label: "Caras",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
      "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙",
      "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫",
      "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
      "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
      "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸",
      "😎", "🤓", "🧐", "😕", "😟", "🙁", "☹️", "😮", "😯", "😲",
      "😳", "🥺", "😦", "😧", "😨", "😰", "😥", "😢", "😭", "😱",
      "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠",
      "🤬", "😈", "👿", "💀", "☠️", "💩", "🤡", "👹", "👺", "👻",
      "👽", "👾", "🤖", "😺", "😸", "😹", "😻", "😼", "😽", "🙀",
    ],
  },
  {
    id: "gestures",
    label: "Gestos",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍",
      "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿", "🦵", "🦶", "👂",
      "🦻", "👃", "🧠", "🫀", "🫁", "🦷", "🦴", "👀", "👁️", "👅",
      "👄", "💋", "🩸", "🫂", "👶", "👧", "🧒", "👦", "👩", "🧑",
    ],
  },
  {
    id: "hearts",
    label: "Corazones",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️",
      "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☯️", "☦️", "🛐",
      "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐",
      "⭐", "🌟", "✨", "⚡", "☄️", "💫", "🔥", "💥", "☀️", "🌤️",
    ],
  },
  {
    id: "objects",
    label: "Objetos",
    emojis: [
      "📰", "🗞️", "📑", "🔖", "🏷️", "💰", "💴", "💵", "💶", "💷",
      "💸", "💳", "🧾", "✉️", "📧", "📨", "📩", "📤", "📥", "📦",
      "📫", "📪", "📬", "📭", "📮", "🗳️", "✏️", "✒️", "🖋️", "🖊️",
      "🖌️", "🖍️", "📝", "💼", "📁", "📂", "🗂️", "📅", "📆", "🗒️",
      "🗓️", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️",
      "📏", "📐", "✂️", "🗃️", "🗄️", "🗑️", "🔒", "🔓", "🔏", "🔐",
      "🔑", "🗝️", "🔨", "🪓", "⛏️", "⚒️", "🛠️", "🗡️", "⚔️", "🔫",
      "📱", "📲", "☎️", "📞", "📟", "📠", "🔋", "🔌", "💻", "🖥️",
      "🖨️", "⌨️", "🖱️", "🖲️", "💽", "💾", "💿", "📀", "🧮", "🎥",
      "🎞️", "📽️", "🎬", "📺", "📷", "📸", "📹", "📼", "🔍", "🔎",
    ],
  },
  {
    id: "food",
    label: "Comida",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
      "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑",
      "🥦", "🥬", "🥒", "🌶️", "🫑", "🌽", "🥕", "🫒", "🧄", "🧅",
      "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳",
      "🧈", "🥞", "🧇", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔",
      "🍟", "🍕", "🫓", "🥪", "🥙", "🧆", "🌮", "🌯", "🫔", "🥗",
      "🥘", "🫕", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟",
      "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡",
      "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬",
      "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "☕",
      "🫖", "🍵", "🧃", "🥤", "🧋", "🍶", "🍺", "🍻", "🥂", "🍷",
      "🥃", "🍸", "🍹", "🧉", "🍾", "🧊", "🥄", "🍴", "🍽️", "🥣",
    ],
  },
  {
    id: "nature",
    label: "Naturaleza",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐻‍❄️", "🐨",
      "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊",
      "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉",
      "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪱", "🐛", "🦋", "🐌",
      "🐞", "🐜", "🪰", "🪲", "🪳", "🦟", "🦗", "🕷️", "🕸️", "🦂",
      "🐢", "🌹", "🥀", "🌺", "🌻", "🌼", "🌷", "🌱", "🪴", "🌲",
      "🌳", "🌴", "🌵", "🌾", "🌿", "☘️", "🍀", "🍁", "🍂", "🍃",
      "🍄", "🐚", "🪨", "🌎", "🌍", "🌏", "🌕", "🌖", "🌗", "🌘",
      "🌑", "🌒", "🌓", "🌔", "🌙", "🌚", "🌛", "🌜", "☀️", "🌝",
    ],
  },
  {
    id: "travel",
    label: "Viajes",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐",
      "🛻", "🚚", "🚛", "🚜", "🦯", "🦽", "🦼", "🛴", "🚲", "🛵",
      "🏍️", "🛺", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟",
      "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇",
      "🚊", "🚉", "✈️", "🛫", "🛬", "🛩️", "💺", "🛰️", "🚀", "🛸",
      "🚁", "🛶", "⛵", "🚤", "🛥️", "🛳️", "⛴️", "🚢", "⚓", "🪝",
      "⛽", "🚧", "🚦", "🚥", "🚏", "🗺️", "🗿", "🗽", "🗼", "🏰",
      "🏯", "🏟️", "🎡", "🎢", "🎠", "⛲", "⛱️", "🏖️", "🏝️", "🏜️",
      "🌋", "⛰️", "🏔️", "🗻", "🏕️", "⛺", "🏠", "🏡", "🏘️", "🏚️",
    ],
  },
  {
    id: "symbols",
    label: "Símbolos",
    emojis: [
      "❤️‍🔥", "💯", "💢", "💥", "💫", "💦", "💨", "🕳️", "💣", "💬",
      "👁️‍🗨️", "🗨️", "🗯️", "💭", "💤", "💮", "♨️", "💈", "🛑", "🕛",
      "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙",
      "✅", "☑️", "✔️", "❌", "❎", "➕", "➖", "➗", "✖️", "♾️",
      "‼️", "⁉️", "❓", "❔", "❕", "❗", "〰️", "💱", "💲", "⚕️",
      "♻️", "⚜️", "🔱", "📛", "🔰", "⭕", "🟢", "🔴", "🟡", "🟠",
      "🟣", "🔵", "🟤", "⚫", "⚪", "🟥", "🟧", "🟨", "🟩", "🟦",
      "🟪", "⬛", "⬜", "◼️", "◻️", "◾", "◽", "▪️", "▫️", "🔶",
      "🔷", "🔸", "🔹", "🔺", "🔻", "💠", "🔘", "🔳", "🔲", "🏁",
    ],
  },
  {
    id: "flags",
    label: "Banderas",
    emojis: [
      "🏳️", "🏴", "🏁", "🚩", "🏳️‍🌈", "🏳️‍⚧️", "🏴‍☠️",
      "🇪🇸", "🇪🇺", "🇺🇸", "🇬🇧", "🇫🇷", "🇩🇪", "🇮🇹", "🇵🇹", "🇲🇽",
      "🇦🇷", "🇨🇴", "🇨🇱", "🇵🇪", "🇻🇪", "🇺🇾", "🇧🇷", "🇯🇵", "🇨🇳",
      "🇰🇷", "🇮🇳", "🇦🇺", "🇨🇦", "🇨🇭", "🇸🇪", "🇳🇴", "🇩🇰", "🇳🇱",
      "🇧🇪", "🇮🇪", "🇵🇱", "🇬🇷", "🇹🇷", "🇷🇺", "🇺🇦", "🇲🇦", "🇪🇬",
    ],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (emoji: string) => void;
  /** Anchor the panel near the trigger (absolute within a relative parent). */
  className?: string;
};

export function EmojiPicker({ open, onClose, onPick, className }: Props) {
  const [category, setCategory] = useState(CATEGORIES[0]!.id);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const t = window.setTimeout(() => searchRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, onClose]);

  const active = CATEGORIES.find((c) => c.id === category) ?? CATEGORIES[0]!;

  // Full catalogue while searching; otherwise active category
  const displayEmojis = useMemo(() => {
    if (!query.trim()) return active.emojis;
    return CATEGORIES.flatMap((c) => c.emojis);
  }, [active, query]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className={
        className ??
        "absolute bottom-full left-0 z-50 mb-2 w-[min(100vw-2rem,22rem)] overflow-hidden border border-foreground/15 bg-background shadow-xl"
      }
      role="dialog"
      aria-label="Selector de emojis"
    >
      <div className="flex items-center gap-2 border-b border-foreground/10 px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar o explorar…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Cerrar"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!query.trim() && (
        <div className="flex gap-0.5 overflow-x-auto border-b border-foreground/10 px-1.5 py-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`shrink-0 px-2 py-1 font-mono text-[9px] uppercase tracking-widest transition ${
                category === c.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto p-2 sm:grid-cols-9">
        {displayEmojis.map((emoji, i) => (
          <button
            key={`${emoji}-${i}`}
            type="button"
            onClick={() => {
              onPick(emoji);
            }}
            className="flex h-9 w-full items-center justify-center rounded text-xl leading-none transition hover:bg-muted active:scale-95"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="border-t border-foreground/10 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        {query.trim()
          ? `${displayEmojis.length} emojis`
          : active.label}
      </div>
    </div>
  );
}
