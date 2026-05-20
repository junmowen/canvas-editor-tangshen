import { Draw } from '../draw/Draw'

export class HistoryManager {
  private undoStack: Array<Function> = []
  private redoStack: Array<Function> = []
  private maxRecordCount: number
  private isDisabled: boolean

  constructor(draw: Draw) {
    // 忽略第一次历史记录
    this.maxRecordCount = draw.getOptions().historyMaxRecordCount + 1
    this.isDisabled = false
  }

  public undo() {
    if (this.isDisabled) return
    if (this.undoStack.length > 1) {
      const pop = this.undoStack.pop()!
      this.redoStack.push(pop)
      if (this.undoStack.length) {
        this.undoStack[this.undoStack.length - 1]()
      }
    }
  }

  public redo() {
    if (this.isDisabled) return
    if (this.redoStack.length) {
      const pop = this.redoStack.pop()!
      this.undoStack.push(pop)
      pop()
    }
  }

  public execute(fn: Function) {
    if (this.isDisabled) return
    this.undoStack.push(fn)
    if (this.redoStack.length) {
      this.redoStack = []
    }
    while (this.undoStack.length > this.maxRecordCount) {
      this.undoStack.shift()
    }
  }

  public isCanUndo(): boolean {
    return this.undoStack.length > 1
  }

  public isCanRedo(): boolean {
    return !!this.redoStack.length
  }

  public isStackEmpty(): boolean {
    return !this.undoStack.length && !this.redoStack.length
  }

  public recovery() {
    this.undoStack = []
    this.redoStack = []
  }

  public disable() {
    this.isDisabled = true
  }

  public enable() {
    this.recovery()
    this.isDisabled = false
  }

  public isDisabledHistory() {
    return this.isDisabled
  }

  public popUndo() {
    return this.undoStack.pop()
  }
}
