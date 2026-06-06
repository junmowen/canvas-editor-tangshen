import { RenderLayer } from '../types/RenderLayer'
import type { IRenderBackend } from '../types/RenderBackend'
import type { IRenderSurface } from '../types/RenderSurface'
import type { IRenderTask } from '../types/RenderTask'

/**
 * Overlay2D 渲染引擎。
 *
 * 该引擎专门承接 overlay 层任务，集中处理清理、选区和高优先级交互反馈。
 */
export class Overlay2DRenderEngine implements IRenderBackend {
  /** 渲染引擎名称，用于后端调度统计。 */
  public readonly name = 'overlay-2d'
  /** 当前引擎只处理 overlay 层任务。 */
  private readonly supportedLayer = RenderLayer.OVERLAY

  /**
   * 判断任务是否适合由 overlay 引擎处理。
   *
   * @param task - 渲染任务描述
   * @returns 仅 overlay 层任务返回 true
   */
  public canRender(task: IRenderTask): boolean {
    return task.layer === this.supportedLayer && Boolean(task.execute)
  }

  /**
   * 执行 overlay 渲染任务。
   *
   * Overlay 任务通过同步 2D 绘制回调执行。
   *
   * @param surface - 目标渲染 surface
   * @param task - 渲染任务描述
   */
  public render(surface: IRenderSurface, task: IRenderTask) {
    task.execute?.(surface, task)
  }

  /** 获取 Overlay2D 引擎能力状态。 */
  public getCapability() {
    return {
      supported: true,
      enabled: true
    }
  }
}
