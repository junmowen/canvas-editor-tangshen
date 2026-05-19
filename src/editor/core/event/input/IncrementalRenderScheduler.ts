import { Draw } from '../../draw/Draw'
import { IDrawOption } from '../../../interface/Draw'

export interface IRenderTask {
  priority: 'immediate' | 'high' | 'normal' | 'low'
  payload: IDrawOption
  timestamp: number
}

export class IncrementalRenderScheduler {
  private pendingTask: IRenderTask | null = null
  private rafHandle: number | null = null
  private isRendering = false

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
    return priorityMap[newTask.priority] > priorityMap[oldTask.priority]
  }
}
