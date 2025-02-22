import type { Rule, TopLevelRule } from './astConstructor';
import { RuleType } from './astConstructor';

let defaultMarkdownRules: Rule[] | undefined;
let telegramMarkdownRules: Rule[] | undefined;

export function getDefaultMarkdownRules(): Rule[] {
  if (!defaultMarkdownRules) {
    defaultMarkdownRules = [
      { type: RuleType.NewLine, pattern: /^\n+/ },
      { type: RuleType.Space, pattern: /^\n+/ },
      { type: RuleType.LineBreak, pattern: /^ {2,}\n(?!\s*$)/ },
      
      { type: RuleType.FencedCode, pattern: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/ },
      { type: RuleType.InlineCode, pattern: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/ },
      
      { type: RuleType.Heading, pattern: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/ },
      { type: RuleType.UnderlineHeading, pattern: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/ },
      { type: RuleType.HorizontalRule, pattern: /^( *[-*_]){3,} *(?:\n+|$)/ },
      { type: RuleType.Blockquote, pattern: /^( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+/ },
      { type: RuleType.List, pattern: /^( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\1?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)/ },
      { type: RuleType.Html, pattern: /^ *(?:<!--[\s\S]*?-->|<((?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b)[\s\S]+?<\/\1>|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b(?:[^'"">])*?>) *(?:\n{2,}|\s*$)/m },
      
      { type: RuleType.NpTable, topLevelOnly: true, pattern: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/ } as TopLevelRule,
      { type: RuleType.Definition, topLevelOnly: true, pattern: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/ } as TopLevelRule,
      { type: RuleType.Table, topLevelOnly: true, pattern: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/ } as TopLevelRule,
      { type: RuleType.Paragraph, topLevelOnly: true, pattern: /^((?:[^\n]+\n?(?! *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\2 *(?:\n+|$)|( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\3?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\\1(?:[*+-]|\d+\.) )\n*|\s*$)|( *[-*_]){3,} *(?:\n+|$)| *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)|([^\n]+)\n *([=|-]){2,} *(?:\n+|$)|( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b| *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)))+)\n*/ } as TopLevelRule,
      
      { type: RuleType.Escape, pattern: /^\\([\\`*{}\[\]()#+\-.!_>~|])/ },
      { type: RuleType.Image, pattern: /^!\[(.*)\]\((.*?)\s*(?:"(.*[^"])")?\s*\)/ },
      { type: RuleType.AutoLink, pattern: /^<([^ >]+(@|:\/)[^ >]+)>/ },
      { type: RuleType.Emoji, pattern: /(:-\)|:-\(|8-\)|;\)|:wink:|:cry:|:laughing:|:yum:)/g },
      { type: RuleType.Url, pattern: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/ },
      { type: RuleType.Link, pattern: /^\[([^\]]*)\]\(([^)]*)\)/ },
      { type: RuleType.ReferenceLink, pattern: /^!?\[((?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*)\]\s*\[([^\]]*)\]/ },
      { type: RuleType.IdLink, pattern: /^\[(.*)\]:\s*(\S*)\s*(?:"(.*[^"])")?\s*/ },
      
      { type: RuleType.Tag, pattern: /^<!--[\s\S]*?-->|^<\/?\w+(?:[^'"">])*?>/ },
      
      { type: RuleType.Bold, pattern: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/ },
      { type: RuleType.Italic, pattern: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/ },
      { type: RuleType.Strikethrough, pattern: /^~~(?=\S)([\s\S]*?\S)~~/ },
      { type: RuleType.Highlight, pattern: /^==(?=\S)([\s\S]*?\S)==/ },
      { type: RuleType.Underline, pattern: /^\+\+(?=\S)([\s\S]*?\S)\+\+/ },
      { type: RuleType.Subscript, pattern: /^~(?=\S)([\s\S]*?\S)~/ },
      { type: RuleType.Superscript, pattern: /^\^(?=\S)([\s\S]*?\S)\^/ },
      
      { type: RuleType.InlineText, pattern: /^[\s\S]+?(?=[\\<!\[_*`~^]|https?:\/\/| {2,}\n|$)/ },
      { type: RuleType.Text, pattern: /^[^\n]+/ },
    ];
  }
  return defaultMarkdownRules;
}

export function getTelegramMarkdownRules(): Rule[] {
  if (!telegramMarkdownRules) {
    telegramMarkdownRules = [
      { type: RuleType.NewLine, pattern: /^\n+/ },
      { type: RuleType.FencedCode, pattern: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/ },
      { type: RuleType.InlineCode, pattern: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/ },
      { type: RuleType.Blockquote, pattern: /^(> ?.+\n*)+ ?/ },
      
      { type: RuleType.Image, pattern: /^!\[(.*)\]\((.*?)\s*(?:"(.*[^"])")?\s*\)/ },
      { type: RuleType.Link, pattern: /^\[([^\]]*)\]\(([^)]*)\)/ },
      
      { type: RuleType.Bold, pattern: /^\*\*(.*)\*\*/ },
      { type: RuleType.Strikethrough, pattern: /^~~(?=\S)([\s\S]*?\S)~~/ },
      { type: RuleType.Italic, pattern: /^__(.*)__/ },
      { type: RuleType.Underline, pattern: /^_(.*)_/ },
      { type: RuleType.Spoiler, pattern: /^\|\|(.*)\|\|/m },
      
      { type: RuleType.InlineText, pattern: /^[\s\S]+?(?=[\\<!\[>>|_*`~^]|https?:\/\/| {2,}\n|$)/m },
      { type: RuleType.Text, pattern: /^[^\n]+/ },
    ];
  }
  return telegramMarkdownRules;
}