export enum AstNodeType {
  Unknown = 'Unknown',
  Space = 'Space',
  NewLine = 'NewLine',
  HorizontalRule = 'hr',
  Heading = 'Heading',
  CodeBlock = 'code',
  InlineCode = 'codeInline',
  Table = 'Table',
  TableCell = 'TableCell',
  TableRow = 'TableRow',
  TableHeader = 'TableHeader',
  Blockquote = 'blockquote',
  ExpandableBlockquote = 'blockquote expandable',
  List = 'List',
  ListItem = 'ListItem',
  LooseListItem = 'LooseItem',
  Html = 'Html',
  Paragraph = 'Paragraph',
  Text = 'Text',
  Link = 'Link',
  Escape = 'Escape',
  LineBreak = 'br',
  Strikethrough = 'Strikethrough',
  Italic = 'Italic',
  Bold = 'Bold',
  Image = 'img',
  Emoji = 'Emoji',
  Highlight = 'mark',
  Underline = 'Underline',
  Spoiler = 'Spoiler',
  Subscript = 'sub',
  Superscript = 'sup',
}

export interface AstNode {
  type: AstNodeType;
  source: string;
}

export interface BlockNode extends AstNode {
  children: AstNode[];
}

export interface ListNode extends BlockNode {
  isOrdered: boolean;
}

export interface TextNode extends AstNode {
  content: string;
}

export interface HtmlNode extends TextNode {
  isPreformatted: boolean;
}

export interface LinkNode extends BlockNode {
  id?: string;
  title: string;
  href: string;
}

export interface CodeNode extends BlockNode {
  language?: string;
}

export interface HeadingNode extends BlockNode {
  level: number;
}

export interface TableNode extends BlockNode {
  headers: TableCellNode[];
}

export interface TableCellNode extends BlockNode {
  alignment?: 'left' | 'right' | 'center';
}

export enum RuleType {
  Space = 'space',
  CodeBlock = 'code',
  FencedCode = 'fences',
  Heading = 'heading',
  UnderlineHeading = 'lheading',
  HorizontalRule = 'hr',
  NpTable = 'npTable',
  Blockquote = 'blockquote',
  ExpandableBlockquote = 'expandableBlockquote',
  List = 'list',
  Html = 'html',
  Definition = 'def',
  Table = 'table',
  Paragraph = 'paragraph',
  Text = 'text',
  NewLine = 'newLine',
  Escape = 'escape',
  Image = 'image',
  AutoLink = 'autoLink',
  Emoji = 'emoji',
  Url = 'url',
  Tag = 'tag',
  Link = 'link',
  ReferenceLink = 'refLink',
  IdLink = 'idLink',
  Bold = 'bold',
  Italic = 'italic',
  InlineCode = 'monospace',
  LineBreak = 'br',
  Strikethrough = 'strike',
  Highlight = 'mark',
  Underline = 'underline',
  Spoiler = 'spoiler',
  Subscript = 'sub',
  Superscript = 'sup',
  InlineBlockquote = 'blockquoteInline',
  InlineText = 'textInline',
}

export interface Rule {
  type: RuleType;
  pattern: RegExp;
}

export interface TopLevelRule extends Rule {
  topLevelOnly: boolean;
}

const PATTERNS = {
  LIST_ITEM: /^( *)((?:[*+-]|\d+\.)) [^\n]*(?:\n(?!\1(?:[*+-]|\d+\.) )[^\n]*)*/gm,
  LIST_ITEM_PREFIX: /^ *([*+-]|\d+\.) +/,
  LOOSE_ITEM: /\n\n(?!\s*$)/,
  SPECIAL_CHARS: /[\\~#%&*{}/:<>?|\\"-]/gm,
  DOCUMENT_ID: /(\?|&)id=(.*)/,
} as const;

const HTML_ENTITIES: Record<string, string> = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  "'": '\'',
  '/': '/',
};

const EMOJI_MAP: Record<string, string> = {
  ':-)': '&#128515;',
  ':-(': '&#128550;',
  '8-)': '&#128526;',
  ';)': '&#128521;',
  ':wink:': '&#128521;',
  ':cry:': '&#128546;',
  ':laughing:': '&#128518;',
  ':yum:': '&#128523;',
};

function escapeSpecialChars(input: string): string {
  return input?.replace(PATTERNS.SPECIAL_CHARS, char => HTML_ENTITIES[char] || '') || '';
}

function getNonEmptyMatch(matches: string[], primaryIndex: number, fallbackIndex: number): string {
  return (matches.length > primaryIndex && matches[primaryIndex]) 
    ? matches[primaryIndex] 
    : matches[fallbackIndex];
}

class MarkdownParser {
  private referenceLinks: Record<string, LinkNode> = {};
  private rules: Rule[];

  constructor(rules: Rule[]) {
    this.rules = rules;
  }

  private addNode<T extends AstNode>(nodes: AstNode[], node: T): void {
    nodes.push(node);
  }

  private parseEscape(nodes: AstNode[], match: RegExpMatchArray): void {
    this.addNode(nodes, {
      type: AstNodeType.Escape,
      source: match[0],
      content: match[1],
    } as TextNode);
  }

  private parseLink(nodes: AstNode[], match: RegExpMatchArray): void {
    const idMatch = match[2] ? PATTERNS.DOCUMENT_ID.exec(match[2]) : undefined;
    this.addNode(nodes, {
      type: match[0][0] === '!' ? AstNodeType.Image : AstNodeType.Link,
      source: match[0],
      children: this.parse(match[1]),
      href: match[2],
      title: escapeSpecialChars(match[4]),
      id: idMatch?.[2],
    } as LinkNode);
  }

  private parseReferenceLink(nodes: AstNode[], match: RegExpMatchArray): void {
    const id = match[2].toLowerCase();
    const link: LinkNode = {
      type: match[0][0] === '!' ? AstNodeType.Image : AstNodeType.Link,
      source: match[0],
      children: this.parse(match[1]),
      href: '',
      title: '',
    };
    this.referenceLinks[id] = link;
    this.addNode(nodes, link);
  }

  private parseIdLink(nodes: AstNode[], match: RegExpMatchArray): void {
    const id = match[1].toLowerCase();
    const link = this.referenceLinks[id];
    if (link) {
      link.href = match[2];
      link.title = escapeSpecialChars(match[4]);
    }
  }

  private parseFormatting(nodes: AstNode[], match: RegExpMatchArray, type: AstNodeType): void {
    this.addNode(nodes, {
      type,
      source: match[0],
      children: this.parse(getNonEmptyMatch(match, 2, 1)),
    } as BlockNode);
  }

  private parseBlockquote(nodes: AstNode[], match: RegExpMatchArray, isTopLevel: boolean): void {
    const source = match[0];
    let content = source.replace(/^ *> ?/gm, '');
    let type = AstNodeType.Blockquote;

    if (source.length > 1 && source.endsWith('||')) {
      type = AstNodeType.ExpandableBlockquote;
      content = content.replace(/\|\|/gm, '');
    }

    this.addNode(nodes, {
      type,
      source,
      children: this.parse(content, isTopLevel),
    } as BlockNode);
  }

  private parseList(nodes: AstNode[], match: RegExpMatchArray): void {
    const bullet = match[2];
    const list: ListNode = {
      type: AstNodeType.List,
      source: match[0],
      children: [],
      isOrdered: bullet.length > 1,
    };

    const items = match[0].match(PATTERNS.LIST_ITEM);
    if (items?.[0]) {
      let isNextLoose = false;
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (!item) continue;

        item = item.replace(PATTERNS.LIST_ITEM_PREFIX, '').replace(/[\n]/g, '');
        const isLoose = isNextLoose || !!item.match(PATTERNS.LOOSE_ITEM);
        
        if (i < items.length - 1) {
          isNextLoose = item.endsWith('\n');
        }

        list.children.push({
          type: isLoose ? AstNodeType.LooseListItem : AstNodeType.ListItem,
          source: items[i],
          children: this.parse(item),
        } as BlockNode);
      }
    }

    this.addNode(nodes, list);
  }

  private parseTable(nodes: AstNode[], match: RegExpMatchArray): void {
    const rows = match[3].replace(/(?: *\| *)?\n$/g, '').split(/\n/);
    const headers = match[1].replace(/^ *| *\| *$/g, '').split(/ *\| */);
    const alignments = match[2].replace(/^ *|\| *$/g, '').split(/ * *\| */);

    const headerNodes: TableCellNode[] = [];
    const alignmentValues: Array<'left' | 'right' | 'center' | undefined> = [];
    const rowNodes: AstNode[] = [];

    for (let i = 0; i < alignments.length; i++) {
      if (alignments[i]?.match('^ *-+: *$')) {
        alignmentValues[i] = 'right';
      } else if (alignments[i]?.match('^ *:-+: *$')) {
        alignmentValues[i] = 'center';
      } else if (alignments[i]?.match('^ *:-+ *$')) {
        alignmentValues[i] = 'left';
      } else {
        alignmentValues[i] = undefined;
      }
    }

    for (let i = 0; i < headers.length; i++) {
      headerNodes[i] = {
        type: AstNodeType.TableHeader,
        source: headers[i],
        children: this.parse(headers[i]),
        alignment: alignmentValues[i],
      };
    }

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].replace(/^ *\| *| *\| *$/g, '').split(/ *\| /);
      const cellNodes: TableCellNode[] = [];
      
      for (let j = 0; j < cells.length; j++) {
        cellNodes.push({
          type: AstNodeType.TableCell,
          source: cells[j],
          children: this.parse(cells[j]),
          alignment: alignmentValues[j],
        });
      }

      rowNodes.push({
        type: AstNodeType.TableRow,
        source: rows[i],
        children: cellNodes,
      } as BlockNode);
    }

    this.addNode(nodes, {
      type: AstNodeType.Table,
      source: match[0],
      headers: headerNodes,
      children: rowNodes,
    } as TableNode);
  }

  parse(source: string, isTopLevel = false): AstNode[] {
    source = source.replace(/^ +$/gm, '');
    const nodes: AstNode[] = [];

    while (source) {
      let processed = false;

      for (const rule of this.rules) {
        const topRule = rule as TopLevelRule;
        if (topRule.topLevelOnly && !isTopLevel) continue;

        const match = rule.pattern.exec(source);
        if (!match) continue;

        processed = true;
        const matchedText = match[0];
        source = source.substring(matchedText.length);

        switch (rule.type) {
          case RuleType.NewLine:
            this.addNode(nodes, { type: AstNodeType.NewLine, source: matchedText });
            break;

          case RuleType.Space:
            if (matchedText.length > 1) {
              this.addNode(nodes, { type: AstNodeType.Space, source: matchedText });
            }
            break;

          case RuleType.FencedCode:
            this.addNode(nodes, {
              type: AstNodeType.CodeBlock,
              source: matchedText,
              language: match[2],
              children: this.parse(match[3]),
            } as CodeNode);
            break;

          case RuleType.Heading:
            this.addNode(nodes, {
              type: AstNodeType.Heading,
              source: matchedText,
              level: match[1].length,
              children: this.parse(match[2]),
            } as HeadingNode);
            break;

          case RuleType.UnderlineHeading:
            this.addNode(nodes, {
              type: AstNodeType.Heading,
              source: matchedText,
              level: match[2] === '=' ? 1 : 2,
              children: this.parse(match[1]),
            } as HeadingNode);
            break;

          case RuleType.HorizontalRule:
            this.addNode(nodes, { type: AstNodeType.HorizontalRule, source: matchedText });
            break;

          case RuleType.ExpandableBlockquote:
            this.addNode(nodes, {
              type: AstNodeType.ExpandableBlockquote,
              source: matchedText,
              children: this.parse(match[0].replace(/^ *\*\*> ?/gm, ''), isTopLevel),
            } as BlockNode);
            break;

          case RuleType.Blockquote:
            this.parseBlockquote(nodes, match, isTopLevel);
            break;

          case RuleType.List:
            this.parseList(nodes, match);
            break;

          case RuleType.Html:
            this.addNode(nodes, {
              type: AstNodeType.Html,
              source: matchedText,
              isPreformatted: ['pre', 'script', 'style'].includes(match[1]),
              content: matchedText,
            } as HtmlNode);
            break;

          case RuleType.Definition:
            this.addNode(nodes, {
              type: AstNodeType.Link,
              source: matchedText,
              children: this.parse(match[1]),
              href: match[2],
              title: match[3],
            } as LinkNode);
            break;

          case RuleType.Table:
            this.parseTable(nodes, match);
            break;

          case RuleType.Paragraph:
            const paraText = matchedText.endsWith('\n') 
              ? match[1].slice(0, -1) 
              : match[1];
            this.addNode(nodes, {
              type: AstNodeType.Paragraph,
              source: matchedText,
              children: this.parse(paraText),
            } as BlockNode);
            break;

          case RuleType.Text:
            this.addNode(nodes, match[1]
              ? {
                  type: AstNodeType.Paragraph,
                  source: matchedText,
                  children: this.parse(match[1].endsWith('\n') ? match[1].slice(0, -1) : match[1]),
                } as BlockNode
              : {
                  type: AstNodeType.Paragraph,
                  source: matchedText,
                  content: matchedText,
                } as TextNode);
            break;

          case RuleType.Escape:
            this.parseEscape(nodes, match);
            break;

          case RuleType.Image:
          case RuleType.Url:
          case RuleType.Link:
            this.parseLink(nodes, match);
            break;

          case RuleType.ReferenceLink:
            this.parseReferenceLink(nodes, match);
            break;

          case RuleType.IdLink:
            this.parseIdLink(nodes, match);
            break;

          case RuleType.Bold:
            this.parseFormatting(nodes, match, AstNodeType.Bold);
            break;

          case RuleType.Italic:
            this.parseFormatting(nodes, match, AstNodeType.Italic);
            break;

          case RuleType.InlineCode:
            this.parseFormatting(nodes, match, AstNodeType.InlineCode);
            break;

          case RuleType.LineBreak:
            this.addNode(nodes, { type: AstNodeType.LineBreak, source: matchedText });
            break;

          case RuleType.Strikethrough:
            this.parseFormatting(nodes, match, AstNodeType.Strikethrough);
            break;

          case RuleType.Highlight:
            this.parseFormatting(nodes, match, AstNodeType.Highlight);
            break;

          case RuleType.Underline:
            this.parseFormatting(nodes, match, AstNodeType.Underline);
            break;

          case RuleType.Spoiler:
            this.parseFormatting(nodes, match, AstNodeType.Spoiler);
            break;

          case RuleType.Subscript:
            this.parseFormatting(nodes, match, AstNodeType.Subscript);
            break;

          case RuleType.Superscript:
            this.parseFormatting(nodes, match, AstNodeType.Superscript);
            break;

          case RuleType.InlineBlockquote:
            this.addNode(nodes, {
              type: AstNodeType.Blockquote,
              source: matchedText,
              children: this.parse(match[1], false),
            } as BlockNode);
            break;

          case RuleType.InlineText:
            this.addNode(nodes, {
              type: AstNodeType.Text,
              source: matchedText,
              content: matchedText,
            } as TextNode);
            break;

          case RuleType.Emoji:
            source = source.replace(rule.pattern, (_, key) => EMOJI_MAP[key] || matchedText);
            processed = false;
            break;

          default:
            continue;
        }
        break;
      }

      if (!processed && source) {
        throw new Error(`Infinite loop detected at: "${source.slice(0, 20)}..."`);
      }
    }

    return nodes;
  }
}

export function parseMarkdownToAst(rules: Rule[], source: string): AstNode[] {
  const normalizedSource = source
    .replace(/[\r]/g, '')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');
  
  return new MarkdownParser(rules).parse(normalizedSource, true);
}
