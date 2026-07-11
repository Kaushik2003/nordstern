import { visit } from 'unist-util-visit';
import type { Root, Code } from 'mdast';

/**
 * Converts fenced ```mermaid code blocks into a `<Mermaid chart="…" />`
 * MDX element so they render as real diagrams instead of highlighted code.
 * Runs at the remark (mdast) stage, before syntax highlighting.
 */
export function remarkMermaid() {
  return (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;

      parent.children[index] = {
        type: 'mdxJsxFlowElement',
        name: 'Mermaid',
        attributes: [
          {
            type: 'mdxJsxAttribute',
            name: 'chart',
            value: node.value,
          },
        ],
        children: [],
      };
    });
  };
}
