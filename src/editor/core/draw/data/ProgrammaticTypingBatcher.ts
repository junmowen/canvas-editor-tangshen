import { IElement, IInsertElementListOption } from '../../../interface/Element'

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
    elementList: IElement[]
    isSubmitHistory: boolean
    flushTimer: number | null
  } | null = null

  constructor(private readonly flushCallback: (batch: IProgrammaticTypingBatch) => void) {}

  /** 尝试把当前输入纳入合并队列。 */
  public tryQueue(payload: {
    elementList: IElement[]
    options: IInsertElementListOption
    isSubmitHistory: boolean
    isSelection: boolean
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
