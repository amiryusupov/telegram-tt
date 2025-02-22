const extractorEl = document.createElement('div');

export function insertHtmlInSelection(html: string) {
  const selection = window.getSelection();

  if (selection?.getRangeAt && selection.rangeCount) {
    const range = selection.getRangeAt(0);
    range.deleteContents();

    const fragment = range.createContextualFragment(html);
    // const lastInsertedNode = fragment.lastChild;
    range.insertNode(fragment);
    // if (lastInsertedNode) {
    //   range.setStartAfter(lastInsertedNode);
    //   range.setEndAfter(lastInsertedNode);
    // } else {
    //   range.collapse(false);
    // }
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function getHtmlBeforeSelection(container?: HTMLElement, useCommonAncestor?: boolean) {
  if (!container) {
    return '';
  }

  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) {
    return container.innerHTML;
  }

  const range = sel.getRangeAt(0).cloneRange();
  if (!range.intersectsNode(container)) {
    return container.innerHTML;
  }

  if (!useCommonAncestor && !container.contains(range.commonAncestorContainer)) {
    return '';
  }

  range.collapse(true);
  range.setStart(container, 0);

  extractorEl.innerHTML = '';
  extractorEl.appendChild(range.cloneContents());

  return extractorEl.innerHTML;
}

// https://stackoverflow.com/a/3976125
export function getCaretPosition(element: HTMLElement) {
  let caretPosition = 0;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return caretPosition;
  }

  const range = selection.getRangeAt(0);
  const caretRange = range.cloneRange();
  caretRange.selectNodeContents(element);
  caretRange.setEnd(range.endContainer, range.endOffset);
  caretPosition = caretRange.toString().length;

  return caretPosition;
}

// https://stackoverflow.com/a/36953852
export function setCaretPosition(element: Node, position: number) {
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node as Text).length >= position) {
        const range = document.createRange();
        const selection = window.getSelection()!;
        range.setStart(node, position);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        return -1;
      } else {
        position -= 'length' in node ? node.length as number : 0;
      }
    } else {
      position = setCaretPosition(node, position);
      if (position === -1) {
        return -1;
      }
    }
  }

  return position;
}

export function removeAllSelections() {
  const selection = window.getSelection();
  selection?.removeAllRanges();
}

export function getSelectionRangePosition(container: HTMLElement, useAllText: boolean = false) : [number, number, string] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return [0, 0, ''];
  }

  const range = selection.getRangeAt(0);
  let start = range.startOffset;
  let end = range.endOffset;
  let pos = 0;
  let allText = '';

  let { startContainer, endContainer } = range;
  if (startContainer.nodeType !== Node.TEXT_NODE) {
    startContainer = startContainer.childNodes[range.startOffset];
    start = 0;
  }
  if (endContainer.nodeType !== Node.TEXT_NODE) {
    endContainer = endContainer.childNodes[range.endOffset];
    end = 0;
  }
  function getOffset(p: Node) {
    for (let i = 0; i < p.childNodes.length; i++) {
      const child = p.childNodes[i];
      if (child.nodeName === 'BR') {
        pos += 1;
        if (useAllText) allText += '\n';
        continue;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        pos += child.textContent!.length;
        if (useAllText) allText += child.textContent;
      } else if (getOffset(child)) {
        return true;
      }
      if (child === startContainer) {
        start += pos - (child.nodeType === Node.TEXT_NODE ? child.textContent!.length : 0);
      }
      if (child === endContainer) {
        end += pos - (child.nodeType === Node.TEXT_NODE ? child.textContent!.length : 0);
        if (!useAllText) return true;
      }
    }
    return false;
  }
  getOffset(container);
  return [start, end, allText];
}

export function setSelectionRangePosition(container: HTMLElement, start: number, end: number) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  let pos = 0;
  let stop = start;
  const range = document.createRange();
  function getOffset(p: Node) {
    for (let i = 0; i < p.childNodes.length; i++) {
      const child = p.childNodes[i];
      if (child.nodeName === 'BR') {
        pos += 1;
        continue;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        pos += child.textContent!.length;
      } else if (getOffset(child)) {
        return true;
      }
      if (stop === start) {
        if (pos >= stop) {
          range.setStart(child, stop - (pos - child.textContent!.length));
          stop = end;
        }
      }
      if (stop === end) {
        if (pos >= stop) {
          range.setEnd(child, stop - (pos - child.textContent!.length));
          return true;
        }
      }
    }
    return false;
  }
  getOffset(container);

  selection.removeAllRanges();
  selection.addRange(range);
}

export function getSelectedText() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return undefined;
  }
  const range = selection.getRangeAt(0);
  const clonedSelection = range.cloneContents();
  const div = document.createElement('div');
  div.appendChild(clonedSelection);
  return div.innerHTML;
}
