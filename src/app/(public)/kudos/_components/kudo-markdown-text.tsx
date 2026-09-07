import { Fragment, type ReactNode } from "react";

import {
  parseKudoMarkdown,
  type KudoMarkdownNode,
} from "../_utils/parse-kudo-markdown";

export type KudoMarkdownTextProps = {
  text: string;
};

type KudoListItemNode = Extract<KudoMarkdownNode, { type: "listItem" }>;
type ListBlock = { type: "list"; items: KudoListItemNode[] };

/**
 * Renders a Kudo's `content` (BR-005, FR-204) as real React elements built
 * from `parse-kudo-markdown.ts`'s token tree — never raw-HTML injection and
 * never a markdown dependency (clarifications.md § toolbar). Server
 * Component compatible: no hooks, no browser API, so no `"use client"`.
 *
 * `parseKudoMarkdown` never throws and degrades any malformed marker to
 * literal text on its own, so this renderer has no error boundary to add —
 * whatever tree it returns is exactly what gets rendered.
 */
export function KudoMarkdownText({ text }: KudoMarkdownTextProps) {
  const blocks = groupListItems(parseKudoMarkdown(text));

  return (
    <>
      {blocks.map((block, index) =>
        block.type === "list" ? (
          <ol key={index} className="list-decimal pl-6">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderChildren(item.children)}</li>
            ))}
          </ol>
        ) : (
          <Fragment key={index}>{renderNode(block)}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * `parseKudoMarkdown` emits one `listItem` node per `"1. "` line, joined to
 * its neighbours by a `lineBreak` node (block-level splitting happens once,
 * per line — see that file's own doc comment). A lone `<li>` outside an
 * `<ol>` is invalid HTML, so consecutive `listItem`s — allowing exactly the
 * `lineBreak` that already separates every line — are grouped into one
 * synthetic `list` block here before rendering. Any `lineBreak` that is NOT
 * sandwiched between two `listItem`s (before the first, after the last, or
 * between two ordinary lines) is left untouched and still renders as `<br>`.
 */
function groupListItems(
  nodes: KudoMarkdownNode[],
): Array<KudoMarkdownNode | ListBlock> {
  const blocks: Array<KudoMarkdownNode | ListBlock> = [];
  let i = 0;

  while (i < nodes.length) {
    const node = nodes[i];
    if (node?.type === "listItem") {
      const items: KudoListItemNode[] = [node];
      let next = i + 1;
      while (
        nodes[next]?.type === "lineBreak" &&
        nodes[next + 1]?.type === "listItem"
      ) {
        items.push(nodes[next + 1] as KudoListItemNode);
        next += 2;
      }
      blocks.push({ type: "list", items });
      i = next;
    } else if (node) {
      blocks.push(node);
      i += 1;
    } else {
      i += 1;
    }
  }

  return blocks;
}

/** `parseKudoMarkdown` already whitelists `http(s)` before ever creating a
 * `link` node (its own `isSafeLinkUrl`) — this is defense-in-depth only, in
 * case a future caller feeds this renderer a hand-built tree. On failure the
 * link text still renders, just without the `<a>` wrapper: dropping the
 * content entirely would be a worse failure mode than losing a hyperlink. */
function isSafeHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

function renderNode(node: KudoMarkdownNode): ReactNode {
  switch (node.type) {
    case "text":
      return node.text;
    case "bold":
      return <strong>{renderChildren(node.children)}</strong>;
    case "italic":
      return <em>{renderChildren(node.children)}</em>;
    case "strike":
      return <del>{renderChildren(node.children)}</del>;
    case "link":
      return isSafeHref(node.href) ? (
        <a href={node.href} target="_blank" rel="noopener noreferrer">
          {renderChildren(node.children)}
        </a>
      ) : (
        renderChildren(node.children)
      );
    case "quote":
      return (
        <blockquote className="border-l-2 border-login-button-text/40 pl-3 italic">
          {renderChildren(node.children)}
        </blockquote>
      );
    case "listItem":
      // Reached only for a `listItem` fed in outside `groupListItems` (e.g.
      // a single-item `children` array never contains one — see below) —
      // kept so the switch stays exhaustive rather than throwing.
      return <li>{renderChildren(node.children)}</li>;
    case "lineBreak":
      return <br />;
  }
}

/**
 * `bold`/`italic`/`strike`/`link` children come from `parseInline`, which
 * never emits `listItem`/`quote`/`lineBreak` (those are block-level, one per
 * source line) — so no grouping is needed for any nested `children` array,
 * only for the top-level tree `KudoMarkdownText` renders directly.
 */
function renderChildren(nodes: KudoMarkdownNode[]): ReactNode {
  return nodes.map((node, index) => (
    <Fragment key={index}>{renderNode(node)}</Fragment>
  ));
}
