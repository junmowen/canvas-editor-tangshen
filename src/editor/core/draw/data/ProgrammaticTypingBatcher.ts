import { IElement, IInsertElementListOption } from '../../../interface/Element'

/** programmatictypingbatch契约，用于约束内部流程中传递的数据结构。 */
export interface IProgrammaticTypingBatch {
  /** 合并后的输入元素。 */
  elementList: IElement[]
  /** 合并批次是否需要提交历史。 */
  isSubmitHistory: boolean
}

/** 程序化连续单字符输入合并器，避免每个字符都触发布局写回。 */
export class ProgrammaticTypingBatcher {
  /** 待合并的程序化输入批次。 */
  private batch: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
    isSubmitHistory: boolean
    /** flushtimer数值，用于当前布局、统计或索引计算。 */
    flushTimer: number | null
  } | null = null

  /** 初始化 ProgrammaticTypingBatcher 实例并注入运行依赖。 */
  constructor(private readonly flushCallback: (batch: IProgrammaticTypingBatch) => void) {}

  /** 尝试把当前输入纳入合并队列。 */
  public tryQueue(payload: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 操作配置项，用于调整当前流程的可选行为。 */
    options: IInsertElementListOption
    /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
    isSubmitHistory: boolean
    /** 是否选区，用于控制当前流程的判断分支。 */
    isSelection: boolean
    /** 是否表格上下文，用于控制当前流程的判断分支。 */
    isTableContext: boolean
  }) {
    if (
      payload.isSubmitHistory ||
      payload.elementList.length !== 1 ||
      payload.options.isReplace === false ||
      payload.isSelection ||
      payload.isTableContext
    ) {
      this.flush()
      return false
    }
    const element = payload.elementList[0]
    if (element.type || element.value.length !== 1) {
      this.flush()
      return false
    }
    if (!this.batch) {
      this.batch = {
        elementList: [],
        isSubmitHistory: false,
        flushTimer: null
      }
    }
    this.batch.elementList.push({ ...element })
    this.batch.isSubmitHistory =
      this.batch.isSubmitHistory || payload.isSubmitHistory
    if (this.batch.flushTimer !== null) {
      window.clearTimeout(this.batch.flushTimer)
    }
    this.batch.flushTimer = window.setTimeout(() => {
      this.flush()
    }, 0)
    return true
  }

  /** 立即提交已合并的程序化输入批次。 */
  public flush() {
    const batch = this.batch
    if (!batch) {
      return
    }
    if (batch.flushTimer !== null) {
      window.clearTimeout(batch.flushTimer)
    }
    this.batch = null
    this.flushCallback({
      elementList: batch.elementList,
      isSubmitHistory: batch.isSubmitHistory
    })
  }
}
