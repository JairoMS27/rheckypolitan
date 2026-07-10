import sanitize from "sanitize-html";

/**
 * Sanitize untrusted HTML before rendering with dangerouslySetInnerHTML.
 * Strips scripts, event handlers, and unknown tags. Works in Node and browser.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  return sanitize(dirty, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "img",
      "hr",
      "span",
      "div",
      "figure",
      "figcaption",
      "iframe",
      "pre",
      "code",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      iframe: [
        "src",
        "width",
        "height",
        "allow",
        "allowfullscreen",
        "frameborder",
        "loading",
        "referrerpolicy",
        "title",
      ],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
      iframe: ["https"],
    },
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    transformTags: {
      a: sanitize.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}
