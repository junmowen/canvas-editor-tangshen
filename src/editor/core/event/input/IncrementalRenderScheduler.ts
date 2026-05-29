import { Draw } from '../../draw/Draw'
import { IDrawOption } from '../../../interface/Draw'

/** 渲染task契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderTask {
  priority: 'immediate' | 'high' | 'normal' | 'low'
  /** 调用载荷，保存事件或命令传入的数据。 */
  payload: IDrawOption
  /** 时间戳，用于标记任务、缓存或事件发生时间。 */
  timestamp: number
}

export class IncrementalRenderScheduler {
  /** 待执行的增量渲染任务，用于合并连续输入后的刷新。 */
  private pendingTask: IRenderTask | null = null
  private rafHandle: number | null = null
  private isRendering = false

  /** 初始化 IncrementalRenderScheduler 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  public schedule(task: IRenderTask): void {
    if (!this.pendingTask || task.priority === 'immediate') {
      this.pendingTask = task
    } else if (this.shouldReplace(task, this.pendingTask)) {
      this.pendingTask = task
    }

    if (task.priority === 'immediate') {
      this.flushImmediate()
    } else {
      this.scheduleRaf()
    }
  }

  public flush(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    this.executeRender()
  }

  /** 清理当前项，释放缓存或移除旧的界面状态。 */
  public clear(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    this.pendingTask = null
  }

  private scheduleRaf(): void {
    if (this.rafHandle !== null || this.isRendering) return
    this.rafHandle = requestAnimationFrame(() => {
      this.rafHandle = null
      this.executeRender()
    })
  }

  private flushImmediate(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle)
      this.rafHandle = null
    }
    this.executeRender()
  }

  private executeRender(): void {
    if (!this.pendingTask || this.isRendering) return

    this.isRendering = true
    const task = this.pendingTask
    this.pendingTask = null

    try {
      this.draw.render(task.payload)
    } finally {
      this.isRendering = false
    }
  }

  private shouldReplace(newTask: IRenderTask, oldTask: IRenderTask): boolean {
    const priorityMap = { immediate: 4, high: 3, normal: 2, low: 1 }
    return priorityMap[newTask.priority] >= priorityMap[oldTask.priority]
  }
}
