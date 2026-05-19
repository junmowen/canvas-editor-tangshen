import { IElement } from '../../../interface/Element'

export interface IInputAction {
  type: 'insert' | 'delete' | 'composition'
  data: string
  timestamp: number
  startIndex: number
  endIndex: number
}

export interface IInputBatch {
  actions: IInputAction[]
  elements: IElement[]
  finalCursorIndex: number
}

export class InputBuffer {
  private buffer: IInputAction[] = []
  private flushTimer: number | null = null

  public push(action: IInputAction): void {
    this.buffer.push(action)
    this.scheduleFlush()
  }

  public clear(): void {
    this.buffer = []
    if (this.flushTimer !== null) {
      cancelAnimationFrame(this.flushTimer)
      this.flushTimer = null
    }
  }

  public getBatch(): IInputAction[] {
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
