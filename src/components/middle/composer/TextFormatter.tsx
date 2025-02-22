import type { FC } from '../../../lib/teact/teact';
import React, {
  memo, useEffect, useRef, useState,
} from '../../../lib/teact/teact';

import type { IAnchorPosition } from '../../../types';
import type { UndoManager } from '../../../util/undoManager';
import { ApiMessageEntityTypes } from '../../../api/types';

import buildClassName from '../../../util/buildClassName';
import captureEscKeyListener from '../../../util/captureEscKeyListener';
import { ensureProtocol } from '../../../util/ensureProtocol';
import getKeyFromEvent from '../../../util/getKeyFromEvent';
import { getSelectionRangePosition, setSelectionRangePosition } from '../../../util/selection';
import stopEvent from '../../../util/stopEvent';
import { INPUT_CUSTOM_EMOJI_SELECTOR } from './helpers/customEmoji';

import useFlag from '../../../hooks/useFlag';
import useLastCallback from '../../../hooks/useLastCallback';
import useOldLang from '../../../hooks/useOldLang';
import useShowTransitionDeprecated from '../../../hooks/useShowTransitionDeprecated';
import useVirtualBackdrop from '../../../hooks/useVirtualBackdrop';

import codeBlockHtml from '../../common/code/CodeBlock';
import Icon from '../../common/icons/Icon';
import Button from '../../ui/Button';
import { getInputScroller } from './MessageInput';

import './TextFormatter.scss';

export type OwnProps = {
  inputDiv?: HTMLDivElement | null;
  isOpen: boolean;
  anchorPosition?: IAnchorPosition;
  selectedRange?: Range;
  undoManager?: UndoManager;
  editableInputId: string;
  setSelectedRange: (range: Range) => void;
  onClose: () => void;
  onUpdate: (html: string) => void;
  processSelection: () => void;
};
interface ISelectedTextFormats {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  monospace?: boolean;
  spoiler?: boolean;
  quote?: boolean;
  code?: boolean;
  link?: boolean;
}

enum TextFormats {
  bold = 'bold', italic = 'italic', underline = 'underline', strikethrough = 'strikethrough',
  monospace = 'monospace', spoiler = 'spoiler', quote = 'quote', code = 'code', link = 'link',
}
const DEFAULT_TEXT_FORMATS: Record<string, TextFormats> = {
  bold: TextFormats.bold,
  italic: TextFormats.italic,
  underline: TextFormats.underline,
  strikethrough: TextFormats.strikethrough,
};

const TEXT_FORMAT_BY_TAG_NAME: Record<string, keyof ISelectedTextFormats> = {
  B: 'bold',
  STRONG: 'bold',
  I: 'italic',
  EM: 'italic',
  U: 'underline',
  DEL: 'strikethrough',
  STRIKE: 'strikethrough',
  CODE: 'monospace',
  SPAN: 'spoiler',
  BLOCKQUOTE: 'quote',
  PRE: 'code',
};
export type TextFormatHandler = {
  handler: AnyToVoidFunction;
  format: keyof ISelectedTextFormats;
};
const fragmentEl = document.createElement('div');

const TextFormatter: FC<OwnProps> = ({
  inputDiv,
  isOpen,
  anchorPosition,
  undoManager,
  selectedRange,
  editableInputId,
  setSelectedRange,
  onClose,
  onUpdate,
  processSelection,
}) => {
  // eslint-disable-next-line no-null/no-null
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line no-null/no-null
  const linkUrlInputRef = useRef<HTMLInputElement>(null);
  const { shouldRender, transitionClassNames } = useShowTransitionDeprecated(isOpen);
  const [isLinkControlOpen, openLinkControl, closeLinkControl] = useFlag();
  const [linkUrl, setLinkUrl] = useState('');
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [inputClassName, setInputClassName] = useState<string | undefined>();
  const [selectedTextFormats, setSelectedTextFormats] = useState<ISelectedTextFormats>({});

  useEffect(() => (isOpen ? captureEscKeyListener(onClose) : undefined), [isOpen, onClose]);
  useVirtualBackdrop(
    isOpen,
    containerRef,
    onClose,
    true,
  );

  useEffect(() => {
    if (isLinkControlOpen) {
      linkUrlInputRef.current!.focus();
    } else {
      setLinkUrl('');
      setIsEditingLink(false);
    }
  }, [isLinkControlOpen]);

  useEffect(() => {
    if (!shouldRender) {
      closeLinkControl();
      setSelectedTextFormats({});
      setInputClassName(undefined);
    }
  }, [closeLinkControl, shouldRender]);

  useEffect(() => {
    if (!isOpen || !selectedRange) {
      return;
    }

    const selectedFormats: ISelectedTextFormats = {};
    let parentElement = selectedRange.commonAncestorContainer as HTMLElement;
    const content = selectedRange.cloneContents();
    if (content.children.length <= 1) {
      parentElement = selectedRange.endContainer as HTMLElement;
    }
    while (parentElement && parentElement.id !== editableInputId) {
      const textFormat = TEXT_FORMAT_BY_TAG_NAME[parentElement.tagName];
      if (textFormat) {
        selectedFormats[textFormat] = true;
      }
      parentElement = parentElement.parentElement!;
    }

    setSelectedTextFormats(selectedFormats);
  }, [isOpen, selectedRange, openLinkControl, editableInputId]);

  const restoreSelection = useLastCallback(() => {
    if (!selectedRange) {
      return;
    }

    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(selectedRange);
    }
  });

  const getInput = useLastCallback(() => {
    if (inputDiv) {
      return inputDiv;
    }
    if (selectedRange) {
      let element : HTMLElement | null = selectedRange.commonAncestorContainer as HTMLElement;
      while (element && element.id !== editableInputId) {
        element = element.parentElement;
      }
      return element;
    }
    return document.querySelector(editableInputId);
  });
  const getSelectedText = useLastCallback((shouldDropCustomEmoji?: boolean) => {
    if (!selectedRange) {
      return undefined;
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount >= 0) {
      fragmentEl.replaceChildren(selection.getRangeAt(0).cloneContents());
    } else {
      fragmentEl.replaceChildren(selectedRange.cloneContents());
    }
    if (shouldDropCustomEmoji) {
      fragmentEl.querySelectorAll(INPUT_CUSTOM_EMOJI_SELECTOR).forEach((el) => {
        el.replaceWith(el.getAttribute('alt')!);
      });
    }
    return fragmentEl.innerHTML;
  });

  const getSelectedElement = useLastCallback(() => {
    if (!selectedRange) {
      return undefined;
    }

    return selectedRange.commonAncestorContainer.parentElement;
  });

  function updateInputStyles() {
    const linkInput = linkUrlInputRef.current;
    if (!linkInput) {
      return;
    }

    const { offsetWidth, scrollWidth, scrollLeft } = linkInput;
    if (scrollWidth <= offsetWidth) {
      setInputClassName(undefined);
      return;
    }

    let className = '';
    if (scrollLeft < scrollWidth - offsetWidth) {
      className = 'mask-right';
    }
    if (scrollLeft > 0) {
      className += ' mask-left';
    }

    setInputClassName(className);
  }

  function handleLinkUrlChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLinkUrl(e.target.value);
    updateInputStyles();
  }

  function getFormatButtonClassName(key: keyof ISelectedTextFormats) {
    if (selectedTextFormats[key]) {
      return 'active';
    }
    if (selectedTextFormats.code || selectedTextFormats.monospace) {
      return 'disabled';
    }
    switch (key) {
      case 'code':
        if (selectedTextFormats.quote) {
          return 'disabled';
        }
        break;
      case 'monospace':
        if (selectedTextFormats.bold || selectedTextFormats.italic || selectedTextFormats.strikethrough || selectedTextFormats.underline) {
          return 'disabled';
        }
        break;
    }
    const element = getSelectedElement();
    if (element && element.classList.contains('code-title')) {
      return 'disabled';
    }
    return undefined;
  }
  function selectText2(node: HTMLElement | null | undefined) {
    if (!node) return;
    const parent = node.parentElement;
    const selection = window.getSelection();
    if (selection && parent) {
      const range = document!.createRange();
      if (parent.childNodes.length > 0) {
        const index = Array.from(parent.childNodes).indexOf(node);
        range.setStart(parent, index);
        range.setEnd(parent, index + 1);
      }
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
  function selectText(node: HTMLElement | null | undefined) {
    if (!node) return;
    const selection = window.getSelection();
    if (selection) {
      const range = document!.createRange();

      if (node.childNodes.length === 1 && node.firstChild && node.firstChild.nodeType === Node.TEXT_NODE) {
        range.setStart(node.firstChild, 0);
        range.setEnd(node.firstChild, node.firstChild.textContent!.length);
      } else {
        range.setStart(node, 0);
        range.setEnd(node, node.childNodes.length);
      }
      selection.removeAllRanges();
      selection.addRange(range!);
    }
  }
  const handleUpdateFormat = useLastCallback((format: TextFormats) => {
    setSelectedTextFormats((selectedFormats) => {
      const f = Boolean(selectedFormats[format]);
      const defFolmat = DEFAULT_TEXT_FORMATS[format];
      const input = getInput();
      // eslint-disable-next-line prefer-const
      let [start, end, allText] = getSelectionRangePosition(input, true);
      if (undoManager) {
        undoManager.add(input.innerHTML, start, end, getInputScroller(input)?.scrollTop);
      }
      if (f) {
        selectedFormats[format] = false;
        if (defFolmat) {
          document.execCommand('removeFormat');
          Object.keys(selectedFormats).forEach((key) => {
            const fkey = DEFAULT_TEXT_FORMATS[key];
            if (fkey && Boolean(selectedFormats[fkey])) {
              document.execCommand(fkey);
            }
          });
        } else {
          const range = window.getSelection()?.getRangeAt(0);
          if (format === TextFormats.code) {
            let parentElement = range!.endContainer as HTMLElement;
            while (parentElement && parentElement.id !== editableInputId) {
              if (!parentElement.className || !parentElement.classList.contains('CodeBlock')) {
                parentElement = parentElement.parentElement!;
                continue;
              }
              for (const child of parentElement.children) {
                if (child.tagName === 'PRE') {
                  if (child instanceof HTMLElement && child.dataset.language) {
                    start -= child.dataset.language.length;
                    end -= child.dataset.language.length;
                  }
                  parentElement.replaceWith(child.textContent!);
                  if (undoManager) {
                    undoManager.setSelection(start, end);
                    undoManager.add(input.innerHTML);
                  }
                  onUpdate(input.innerHTML!);
                  break;
                }
              }
              break;
            }
          } else {
            let parentElement = range!.endContainer as HTMLElement;
            while (parentElement && parentElement.id !== editableInputId) {
              if (TEXT_FORMAT_BY_TAG_NAME[parentElement.tagName] !== format) {
                parentElement = parentElement.parentElement!;
                continue;
              }
              if (undoManager) {
                parentElement.replaceWith(parentElement.innerText);
                if (undoManager) {
                  undoManager.add(input.innerHTML);
                }
                onUpdate(input.innerHTML!);
              } else {
                selectText2(parentElement);
                const parent = parentElement.parentElement!;
                const parentHtml = parent.innerHTML;
                const innter = parentHtml?.replace(getSelectedText()!, parentElement.innerHTML);
                selectText(parent);
                document.execCommand('insertHTML', false, innter);
                if (parent.innerHTML === parentHtml) {
                  parentElement.replaceWith(parentElement.innerText);
                  onUpdate(input?.innerHTML!);
                }
              }
              break;
            }
          }
        }
      } else if (defFolmat) {
        document.execCommand(format);
      } else {
        const text = getSelectedText();
        if (text) {
          switch (format) {
            case TextFormats.monospace:
              document.execCommand('insertHTML', false, `<code class="text-entity-code" dir="auto">${text}</code>`);
              break;
            case TextFormats.quote:
            case TextFormats.code: {
              const sch = allText.charAt(start - 1);
              const ech = allText.length > end ? allText.charAt(end) : '';
              let n = '';
              if (sch !== '\n') {
                start += 1;
                end += 1;
                n = '\n';
              }
              if (format === TextFormats.quote) {
                if (undoManager) {
                  undoManager.setSelection(start, end);
                }
                const e = ech === '\n' ? '' : '\n';
                document.execCommand('insertHTML', false, `${n}<blockquote >${text}</blockquote>${e}`);
              } else {
                const lang = 'TypeScript';
                start += lang.length;
                end += lang.length;
                if (undoManager) {
                  undoManager.setSelection(start, end);
                }
                document.execCommand('insertHTML', false, `${n}${codeBlockHtml(text, lang)}`);
              }
            }
              break;
            case TextFormats.spoiler:
              document.execCommand('insertHTML', false, `<span class="spoiler" data-entity-type="${ApiMessageEntityTypes.Spoiler}">${text}</span>`);
              break;
          }
        }
      }
      setSelectionRangePosition(input, start, end);
      processSelection();
      return {
        ...selectedFormats,
        [format]: !f,
      };
    });
  });
  const handleSpoilerText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.spoiler);
  });
  const handleBoldText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.bold);
  });

  const handleItalicText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.italic);
  });

  const handleUnderlineText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.underline);
  });

  const handleStrikethroughText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.strikethrough);
  });

  const handleMonospaceText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.monospace);
  });

  const handleQuoteText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.quote);
  });

  const handleCodeText = useLastCallback(() => {
    handleUpdateFormat(TextFormats.code);
  });
  const handleLinkUrlConfirm = useLastCallback(() => {
    const formattedLinkUrl = (ensureProtocol(linkUrl) || '').split('%').map(encodeURI).join('%');

    if (isEditingLink) {
      const element = getSelectedElement();
      if (!element || element.tagName !== 'A') {
        return;
      }
      (element as HTMLAnchorElement).href = formattedLinkUrl;
      onClose();
      return;
    }
    restoreSelection();
    const text = getSelectedText(true);
    document.execCommand(
      'insertHTML',
      false,
      `<a href=${formattedLinkUrl} class="text-entity-link" dir="auto">${text}</a>`,
    );

    onClose();
  });

  const handleKeyDown = useLastCallback((e: KeyboardEvent) => {
    const HANDLERS_BY_KEY: Record<string, TextFormatHandler> = {
      k: { handler: openLinkControl, format: 'link' },
      b: { handler: handleBoldText, format: 'bold' },
      u: { handler: handleUnderlineText, format: 'underline' },
      i: { handler: handleItalicText, format: 'italic' },
      m: { handler: handleMonospaceText, format: 'monospace' },
      s: { handler: handleStrikethroughText, format: 'strikethrough' },
      q: { handler: handleQuoteText, format: 'quote' },
      o: { handler: handleCodeText, format: 'code' },
      p: { handler: handleSpoilerText, format: 'spoiler' },
    };

    const fh = HANDLERS_BY_KEY[getKeyFromEvent(e)];

    if (
      e.altKey
      || !(e.ctrlKey || e.metaKey)
      || !fh
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (getFormatButtonClassName(fh.format) === 'disabled') {
      return;
    }
    fh.handler();
  });
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  const lang = useOldLang();

  function handleContainerKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' && isLinkControlOpen) {
      handleLinkUrlConfirm();
      e.preventDefault();
    }
  }

  if (!shouldRender) {
    return undefined;
  }
  const className = buildClassName(
    'TextFormatter',
    transitionClassNames,
    isLinkControlOpen && 'link-control-shown',
  );

  const linkUrlConfirmClassName = buildClassName(
    'TextFormatter-link-url-confirm',
    Boolean(linkUrl.length) && 'shown',
  );

  const style = anchorPosition
    ? `left: ${anchorPosition.x}px; top: ${anchorPosition.y}px;--text-formatter-left: ${anchorPosition.x}px;`
    : '';
  return (
    <div
      ref={containerRef}
      className={className}
      style={style}
      onKeyDown={handleContainerKeyDown}
      // Prevents focus loss when clicking on the toolbar
      onMouseDown={stopEvent}
    >
      <div className="TextFormatter-buttons">
        <Button
          color="translucent"
          ariaLabel={lang('lng_menu_formatting_spoiler')}
          className={getFormatButtonClassName('spoiler')}
          onClick={handleSpoilerText}
        >
          <Icon name="eye-closed" />
        </Button>
        <div className="TextFormatter-divider" />
        <Button
          color="translucent"
          ariaLabel={lang('lng_menu_formatting_bold')}
          className={getFormatButtonClassName('bold')}
          onClick={handleBoldText}
        >
          <Icon name="bold" />
        </Button>
        <Button
          color="translucent"
          ariaLabel={lang('lng_menu_formatting_italic')}
          className={getFormatButtonClassName('italic')}
          onClick={handleItalicText}
        >
          <Icon name="italic" />
        </Button>
        <Button
          color="translucent"
          ariaLabel={lang('lng_menu_formatting_underline')}
          className={getFormatButtonClassName('underline')}
          onClick={handleUnderlineText}
        >
          <Icon name="underlined" />
        </Button>
        <Button
          color="translucent"
          ariaLabel={lang('lng_menu_formatting_strike_out')}
          className={getFormatButtonClassName('strikethrough')}
          onClick={handleStrikethroughText}
        >
          <Icon name="strikethrough" />
        </Button>
        <Button
          color="translucent"
          ariaLabel={lang('lng_menu_formatting_monospace')}
          className={getFormatButtonClassName('monospace')}
          onClick={handleMonospaceText}
        >
          <Icon name="monospace" />
        </Button>
        <Button
          color="translucent"
          ariaLabel="Code block text"
          className={getFormatButtonClassName('code')}
          onClick={handleCodeText}
        >
          <Icon name="code-block" />
        </Button>
        <Button
          color="translucent"
          ariaLabel={lang('lng_menu_formatting_blockquote')}
          className={getFormatButtonClassName('quote')}
          onClick={handleQuoteText}
        >
          <Icon name="quote" />
        </Button>
        <div className="TextFormatter-divider" />
        <Button
          color="translucent"
          ariaLabel={lang('TextFormat.AddLinkTitle')}
          className={getFormatButtonClassName('link')}
          onClick={openLinkControl}
        >
          <Icon name="link" />
        </Button>
      </div>

      <div className="TextFormatter-link-control">
        <div className="TextFormatter-buttons">
          <Button color="translucent" ariaLabel={lang('Cancel')} onClick={closeLinkControl}>
            <Icon name="arrow-left" />
          </Button>
          <div className="TextFormatter-divider" />

          <div
            className={buildClassName('TextFormatter-link-url-input-wrapper', inputClassName)}
          >
            <input
              ref={linkUrlInputRef}
              className="TextFormatter-link-url-input"
              type="text"
              value={linkUrl}
              placeholder="Enter URL..."
              autoComplete="off"
              inputMode="url"
              dir="auto"
              onChange={handleLinkUrlChange}
              onScroll={updateInputStyles}
            />
          </div>

          <div className={linkUrlConfirmClassName}>
            <div className="TextFormatter-divider" />
            <Button
              color="translucent"
              ariaLabel={lang('Save')}
              className="color-primary"
              onClick={handleLinkUrlConfirm}
            >
              <Icon name="check" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(TextFormatter);
