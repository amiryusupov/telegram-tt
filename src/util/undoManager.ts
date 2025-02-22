interface IState {
  start?: number;
  end?: number;
  scroll?: number;
}
export interface IUndoState extends IState {
  text?: string;
}
export interface IUndoData extends IState {
  stack: IUndoState[];
  index: number;
  limit: number;
}

export class UndoManager {
  private data: IUndoData;

  public constructor(data: IUndoData) {
    this.data = data;
  }

  private addState(state: IUndoState) {
    this.data.stack = this.data.stack.slice(0, this.data.index + 1);
    this.data.stack.push(state);
    if (this.data.limit > 0 && this.data.stack.length > this.data.limit) {
      this.data.stack.shift();
    }
    this.data.index = this.data.stack.length - 1;
  }

  public add(text: string, start?: number, end?: number, scroll?: number) {
    if (start === undefined) start = this.data.start;
    if (end === undefined) end = this.data.end;
    if (scroll === undefined) scroll = this.data.scroll;
    const state = this.current();
    if (state) {
      if (text === state.text
        && state.start === start
        && state.end === end
        && state.scroll === scroll
      ) {
        return;
      }
    }
    this.data.start = start;
    this.data.end = end;
    this.data.scroll = scroll;
    this.addState({
      text, start, end, scroll,
    });
  }

  public setSelection(start: number, end: number) {
    this.data.start = start;
    this.data.end = end;
  }

  public setScroll(scroll: number) {
    this.data.scroll = scroll;
  }

  public redo(): IUndoState | undefined {
    if (this.data.index < this.data.stack.length - 1) {
      this.data.index++;
      return this.current();
    }
    return undefined;
  }

  public undo(): IUndoState | undefined {
    this.data.start = undefined;
    this.data.end = undefined;
    if (this.data.index >= 0) {
      this.data.index--;
      return this.current();
    }
    return undefined;
  }

  public current(): IUndoState | undefined {
    if (this.data.index >= 0 && this.data.index < this.data.stack.length) {
      return this.data.stack[this.data.index];
    }
    return undefined;
  }

  static cteateData(html?: string) {
    const state = { stack: [], index: -1, limit: 0 };
    if (html) {
      new UndoManager(state).add(html);
    }
    return state;
  }

  public clear() {
    this.data = UndoManager.cteateData();
  }
}
