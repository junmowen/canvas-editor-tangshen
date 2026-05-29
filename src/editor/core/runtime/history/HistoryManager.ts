import { Draw } from '../../draw/Draw'

/** 历史记录管理器，负责撤销/重做操作的核心逻辑实现。 */
export class HistoryManager {
  /** 撤销栈，首条记录是初始快照，撤销时回放栈顶之前的快照函数。 */
  private undoStack: Array<Function> = []
  /** 重做栈，保存撤销时移出的快照函数，重做时重新回放。 */
  private redoStack: Array<Function> = []
  /** 历史记录容量上限，包含用于兜底回退的初始快照。 */
  private maxRecordCount: number
  /** 历史记录开关，批量恢复或内部回放期间关闭以避免递归写入。 */
  private isDisabled: boolean

  /** 读取历史记录上限，并为编辑器保留一条初始快照空间。 */
  constructor(draw: Draw) {
    // 忽略第一次历史记录
    this.maxRecordCount = draw.getOptions().historyMaxRecordCount + 1
    this.isDisabled = false
  }

  /** 执行撤销操作，回退到上一条历史记录。 */
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

  /** 执行重做操作，恢复被撤销的历史记录。 */
  public redo() {
    if (this.isDisabled) return
    if (this.redoStack.length) {
      const pop = this.redoStack.pop()!
      this.undoStack.push(pop)
      pop()
    }
  }

  /** 执行命令或历史事务，并把结果同步到编辑器状态。 */
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

  /** 是否存在可撤销的变更记录；只有初始快照时不能再撤销。 */
  public isCanUndo(): boolean {
    return this.undoStack.length > 1
  }

  /** 是否有撤销过程中暂存的记录可以重新回放。 */
  public isCanRedo(): boolean {
    return !!this.redoStack.length
  }

  /** 撤销栈和重做栈是否都没有可回放的历史记录。 */
  public isStackEmpty(): boolean {
    return !this.undoStack.length && !this.redoStack.length
  }

  /** 清空撤销和重做记录，用于重新初始化历史状态。 */
  public recovery() {
    this.undoStack = []
    this.redoStack = []
  }

  /** 暂停历史记录写入，避免内部状态恢复过程被再次记录。 */
  public disable() {
    this.isDisabled = true
  }

  /** 重新启用历史记录，并丢弃禁用期间不可靠的旧历史栈。 */
  public enable() {
    this.recovery()
    this.isDisabled = false
  }

  /** 判断历史记录功能是否已被禁用。 */
  public isDisabledHistory() {
    return this.isDisabled
  }

  /** 弹出最近一条撤销记录，供外部迁移或清理历史栈时使用。 */
  public popUndo() {
    return this.undoStack.pop()
  }
}
