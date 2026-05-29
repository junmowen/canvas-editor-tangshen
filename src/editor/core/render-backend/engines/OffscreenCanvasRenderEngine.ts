import { RenderLayer } from '../types/RenderLayer'
import type { IRenderBackend } from '../types/RenderBackend'
import type { IRenderSurface } from '../types/RenderSurface'
import type { IRenderTask } from '../types/RenderTask'
import type { WorkerRenderScheduler } from '../worker/WorkerRenderScheduler'

/** offscreen画布渲染engine选项契约，用于约束内部流程中传递的数据结构。 */
export interface IOffscreenCanvasRenderEngineOptions {
  /** 是否启用 OffscreenCanvas 任务处理，默认关闭以保持主渲染链路稳定。 */
  enabled?: boolean
}

/**
 * OffscreenCanvas 渲染引擎占位实现。
 *
 * 当前阶段只接入能力探测和调度统计，不抢占 Canvas2D 主链路；
 * 后续可以在这里扩展 worker 绘制、ImageBitmap 回传和主线程合成。
 */
export class OffscreenCanvasRenderEngine implements IRenderBackend {
  /** 渲染引擎名称，用于后端调度统计。 */
  public readonly name = 'offscreen-canvas'
  /** 当前浏览器是否具备 OffscreenCanvas 基础能力。 */
  public readonly supported: boolean
  /** 当前引擎配置，保留引用以支持运行时灰度开关。 */
  private readonly options: IOffscreenCanvasRenderEngineOptions
  /** worker 调度器，负责真实 OffscreenCanvas 后台绘制。 */
  private readonly scheduler?: WorkerRenderScheduler

  /**
   * 创建 OffscreenCanvas 渲染引擎。
   *
   * @param options - 引擎启用配置
   */
  constructor(
    options: IOffscreenCanvasRenderEngineOptions = {},
    scheduler?: WorkerRenderScheduler
  ) {
    this.supported = typeof OffscreenCanvas !== 'undefined'
    this.options = options
    this.scheduler = scheduler
  }

  /**
   * 判断任务是否适合由 OffscreenCanvas 引擎处理。
   *
   * 当前只允许明确 worker 优先级的 base 任务进入该后端，默认关闭时始终返回 false。
   *
   * @param task - 渲染任务描述
   * @returns 能力可用、已启用且任务适配时返回 true
   */
  public canRender(task: IRenderTask): boolean {
    return (
      Boolean(this.options.enabled) &&
      this.supported &&
      Boolean(this.scheduler) &&
      !this.scheduler?.isCircuitOpen() &&
      task.layer === RenderLayer.BASE &&
      task.priority === 'worker' &&
      !task.isCurrentPage &&
      !task.isInteractive &&
      Boolean(task.pagePayload)
    )
  }

  /**
   * 执行 OffscreenCanvas 渲染任务。
   *
   * 当前还没有 worker 绘制实现，因此保守复用同步 execute 回调作为临时兜底。
   *
   * @param surface - 目标渲染 surface
   * @param task - 渲染任务描述
   */
  public render(surface: IRenderSurface, task: IRenderTask) {
    if (!this.scheduler) {
      throw new Error('OffscreenCanvas worker scheduler not found')
    }
    this.scheduler.submit(surface, task)
  }

  /** 获取 OffscreenCanvas 引擎能力状态。 */
  public getCapability() {
    return {
      supported: this.supported,
      enabled: Boolean(this.options.enabled)
    }
  }
}
