import type {
  AstNode, BlockNode, CodeNode, HeadingNode, LinkNode, ListNode, TableCellNode, TableNode, TextNode,
} from './astConstructor';
import { ApiMessageEntityTypes } from '../../api/types';
import { IS_EMOJI_SUPPORTED } from '../windowEnvironment';
import { AstNodeType } from './astConstructor';

export function renderAstToHtml(nodes: AstNode[]): string {
  if (!nodes?.length) return '';
  
  let html = '';
  
  for (const node of nodes) {
    const block = node as BlockNode;
    
    switch (node.type) {
      case AstNodeType.Text:
      case AstNodeType.Emoji:
        html += (node as TextNode).content;
        break;
        
      case AstNodeType.Paragraph:
        html += `<p>${renderAstToHtml(block.children)}</p>`;
        break;
        
      case AstNodeType.Blockquote:
        html += `<blockquote>${renderAstToHtml(block.children)}</blockquote>`;
        break;
        
      case AstNodeType.ExpandableBlockquote:
        html += `<blockquote class="expandable">${renderAstToHtml(block.children)}</blockquote>\n`;
        break;
        
      case AstNodeType.LineBreak:
      case AstNodeType.NewLine:
        html += '<br>';
        break;
        
      case AstNodeType.Space:
        html += ' ';
        break;
        
      case AstNodeType.InlineCode:
        html += `<code>${renderAstToHtml(block.children)}</code>`;
        break;
        
      case AstNodeType.CodeBlock: {
        const code = node as CodeNode;
        const langAttr = code.language ? ` class="language-${code.language}"` : '';
        html += `<pre><code${langAttr}>${renderAstToHtml(block.children)}</code></pre>\n`;
        break;
      }
        
      case AstNodeType.Heading: {
        const heading = node as HeadingNode;
        html += `<h${heading.level}>${renderAstToHtml(block.children)}</h${heading.level}>\n`;
        break;
      }
        
      case AstNodeType.Italic:
        html += `<i>${renderAstToHtml(block.children)}</i>`;
        break;
        
      case AstNodeType.Bold:
        html += `<b>${renderAstToHtml(block.children)}</b>`;
        break;
        
      case AstNodeType.Strikethrough:
        html += `<s>${renderAstToHtml(block.children)}</s>`;
        break;
        
      case AstNodeType.Highlight:
        html += `<mark>${renderAstToHtml(block.children)}</mark>`;
        break;
        
      case AstNodeType.Underline:
        html += `<u>${renderAstToHtml(block.children)}</u>`;
        break;
        
      case AstNodeType.Spoiler:
        html += `<span data-entity-type="${ApiMessageEntityTypes.Spoiler}">${renderAstToHtml(block.children)}</span>`;
        break;
        
      case AstNodeType.Subscript:
        html += `<sub>${renderAstToHtml(block.children)}</sub>`;
        break;
        
      case AstNodeType.Superscript:
        html += `<sup>${renderAstToHtml(block.children)}</sup>`;
        break;
        
      case AstNodeType.ListItem:
      case AstNodeType.LooseListItem:
        html += `<li>${renderAstToHtml(block.children)}</li>`;
        break;
        
      case AstNodeType.List: {
        const list = node as ListNode;
        const tag = list.isOrdered ? 'ol' : 'ul';
        html += `<${tag}>${renderAstToHtml(block.children)}</${tag}>`;
        break;
      }
        
      case AstNodeType.Link: {
        const link = node as LinkNode;
        const titleAttr = link.title ? ` title="${link.title}"` : '';
        const targetAttr = link.href.match(/^(\/\/|http)/i) ? ' target="_blank" rel="nofollow"' : '';
        html += `<a href="${link.href}"${titleAttr}${targetAttr}>${renderAstToHtml(block.children)}</a>`;
        break;
      }
        
      case AstNodeType.Image: {
        const image = node as LinkNode;
        const titleAttr = image.title ? ` title="${image.title}"` : '';
        const altAttr = image.children ? ` alt="${renderAstToHtml(block.children)}"` : '';
        const idAttr = image.id ? ` data-document-id="${image.id}"` : '';
        
        if (IS_EMOJI_SUPPORTED) {
          html += `<img src="${image.href}"${titleAttr}${altAttr}${idAttr}>`;
        } else {
          html += `<a href="${image.href}"${titleAttr}${idAttr}>${renderAstToHtml(block.children)}</a>`;
        }
        break;
      }
        
      case AstNodeType.TableCell:
      case AstNodeType.TableHeader: {
        const cell = node as TableCellNode;
        const tag = node.type === AstNodeType.TableHeader ? 'th' : 'td';
        const styleAttr = cell.alignment ? ` style="text-align:${cell.alignment}"` : '';
        html += `<${tag}${styleAttr}>${renderAstToHtml(block.children)}</${tag}>\n`;
        break;
      }
        
      case AstNodeType.TableRow:
        html += `<tr>${renderAstToHtml(block.children)}</tr>\n`;
        break;
        
      case AstNodeType.Table: {
        const table = node as TableNode;
        html += `<table>\n<thead>\n${renderAstToHtml(table.headers)}</thead>\n<tbody>\n${renderAstToHtml(table.children)}</tbody>\n</table>\n`;
        break;
      }
        
      case AstNodeType.HorizontalRule:
        html += '<hr>';
        break;
        
      case AstNodeType.Html:
        html += (node as TextNode).content;
        break;
        
      case AstNodeType.Escape:
        break;
        
      case AstNodeType.Unknown:
        break;
    }
  }
  
  return html;
}

export function astDefaultRender(nodes: AstNode[]): string {
  return renderAstToHtml(nodes);
}

export const astRender = renderAstToHtml;
