import { ApiMessageEntityTypes } from '../../api/types';

const htmlReg = /<\s*(\w+)[^>]*>((\s*(\w+)[^>]*)|(.*))<\/\s*(\w+)[^/>]*>/gm;

export function isHtml(html: string): boolean {
  htmlReg.lastIndex = 0;
  if (htmlReg.exec(html)) return true;
  return false;
}
export const TG_TAGS: Record<string, string> = {
  B: '**#text#**',
  STRONG: '**#text#**',
  I: '__#text#__',
  EM: '__#text#__',
  INS: '_#text#_',
  U: '_#text#_',
  S: '~~#text#~~',
  STRIKE: '~~#text#~~',
  DEL: '~~#text#~~',
  CODE: '`#text#`',
  Pre_Code: '```#language#\n#text#\n```\n',
  Blockquote_Newline: '>#text#',
  Blockquote_Inline: '>>#text#<<',
  Link: '[#text#](#url#)',
  Spoiler: '||#text#||',
  CodeTitle: 'code-title',
};

export function htmlToMarkdown(html: string, map: Record<string, string>) {
  html = html.replace(/&gt;/g, '>').replace(/&lt;/g, '<');
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/<div><br([^>]*)?><\/div>/g, '\n');
  html = html.replace(/<br([^>]*)?>/g, '\n');
  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  let result = '';

  function addNode(node: ChildNode) {
    if (node.nodeName === '#text') {
      return node.textContent;
    }
    let textContent = '';
    for (const child of node.childNodes) {
      textContent += addNode(child);
    }
    const p = map[node.nodeName];
    if (p) {
      return p.replace('#text#', textContent);
    } else {
      switch (node.nodeName) {
        case 'BLOCKQUOTE': {
          const split = textContent.split(/\n/g);
          if (split.length > 1) {
            textContent = '';
            for (const line of split) {
              if (line) textContent += `${map.Blockquote_Newline.replace('#text#', line)}\n`;
            }
            return textContent;
          } else {
            return `${map.Blockquote_Inline.replace('#text#', split[0])}`;
          }
        }
          break;
        case 'A': {
          const a = node as HTMLAnchorElement;
          if (!textContent) {
            for (const img of node.childNodes) {
              if (img instanceof HTMLImageElement && img.alt) {
                textContent = img.alt;
                break;
              }
            }
          }
          return map.Link.replace('#text#', textContent).replace('#url#', a.href);
        }
          break;
        case 'SPAN':
          if (node instanceof HTMLElement && node.dataset.entityType === ApiMessageEntityTypes.Spoiler) {
            return map.Spoiler.replace('#text#', textContent);
          }
          break;
        case 'PRE':
          if (node instanceof HTMLPreElement) {
            if (result && result.charAt(result.length - 1) !== '\n') {
              textContent += '\n';
            }
            return map.Pre_Code.replace('#text#', textContent).replace('#language#', node.dataset.language || '');
          }
          break;
        case 'P':
          if (node instanceof HTMLElement && node.classList.contains(map.CodeTitle)) {
            textContent = '';
          }
          break;
        default:

          break;
      }
    }
    return textContent;
  }
  for (const node of fragment.childNodes) {
    result += addNode(node);
  }
  return result;
}