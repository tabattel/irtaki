import { parseFragment } from "parse5";

export type SafeTafsirNode =
  | { readonly type: "text"; readonly value: string }
  | {
      readonly type: "element";
      readonly tag: "span" | "br" | "p" | "strong" | "div";
      readonly classes: readonly string[];
      readonly children: readonly SafeTafsirNode[];
    };

interface ParsedAttribute {
  readonly name: string;
  readonly value: string;
}
interface ParsedNode {
  readonly nodeName?: string;
  readonly tagName?: string;
  readonly value?: string;
  readonly attrs?: readonly ParsedAttribute[];
  readonly childNodes?: readonly ParsedNode[];
}

const ALLOWED_TAGS = new Set(["span", "br", "p", "strong", "div"]);
const ALLOWED_CLASSES = new Set(["book-ayah", "text-primary", "text-center", "foot-notes"]);
const DROP_SUBTREE_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "svg", "math",
  "template", "noscript",
]);

function convertNode(node: ParsedNode): SafeTafsirNode[] {
  if (node.nodeName === "#text") {
    return [{ type: "text", value: node.value ?? "" }];
  }

  const tag = node.tagName?.toLowerCase();
  if (tag && DROP_SUBTREE_TAGS.has(tag)) {
    return [];
  }

  const children = (node.childNodes ?? []).flatMap(convertNode);
  if (!tag || !ALLOWED_TAGS.has(tag)) {
    return children;
  }

  const classes = (node.attrs ?? [])
    .filter((attr) => attr.name.toLowerCase() === "class")
    .flatMap((attr) => attr.value.split(/\s+/))
    .filter((name) => ALLOWED_CLASSES.has(name));

  return [{
    type: "element",
    tag: tag as "span" | "br" | "p" | "strong" | "div",
    classes: [...new Set(classes)],
    children: tag === "br" ? [] : children,
  }];
}

/**
 * Converts source HTML to a safe AST. No raw HTML or arbitrary attributes are returned.
 * External image URLs are deliberately not parsed into renderable elements.
 */
export function parseQuranpediaTafsirHtml(source: string): readonly SafeTafsirNode[] {
  const fragment = parseFragment(source) as unknown as ParsedNode;
  return (fragment.childNodes ?? []).flatMap(convertNode);
}

export function isSafeTafsirClassName(value: string): boolean {
  return ALLOWED_CLASSES.has(value);
}
