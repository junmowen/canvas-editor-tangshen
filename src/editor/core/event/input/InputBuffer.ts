import { IElement } from '../../../interface/Element'

/** inputaction契约，用于约束内部流程中传递的数据结构。 */
export interface IInputAction {
  type: 'insert' | 'delete' | 'composition'
  /** 业务数据载荷，供当前操作读取或提交。 */
  data: string
  /** 时间戳，用于标记任务、缓存或事件发生时间。 */
  timestamp: number
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
}

/** inputbatch契约，用于约束内部流程中传递的数据结构。 */
export interface IInputBatch {
  /** actions列表，保存同类数据的有序集合。 */
  actions: IInputAction[]
  /** elements列表，保存同类数据的有序集合。 */
  elements: IElement[]
  /** final光标索引，用于定位对应元素、行或片段。 */
  finalCursorIndex: number
}

export class InputBuffer {
  private buffer: IInputAction[] = []
  private flushTimer: number | null = null

  /** 写入当前项，追加后续渲染需要的命令数据。 */
  public push(action: IInputAction): void {
    this.buffer.push(action)
    this.scheduleFlush()
  }

  /** 清理当前项，释放缓存或移除旧的界面状态。 */
  public clear(): void {
    this.buffer = []
    if (this.flushTimer !== null) {
      cancelAnimationFrame(this.flushTimer)
      this.flushTimer = null
    }
  }

  public getBatch(): IInputAction[] {
    // 初始化 batch 列表。
    const batch = [...this.buffer]
    this.buffer = []
    return batch
  }

  public hasPending(): boolean {
    return this.buffer.length > 0
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return
    this.flushTimer = requestAnimationFrame(() => {
      this.flushTimer = null
    })
  }
}
