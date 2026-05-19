import { RenderLayer } from '../types/RenderLayer'
import type { IRenderBackend } from '../types/RenderBackend'
import type { IRenderSurface } from '../types/RenderSurface'
import type { IRenderTask } from '../types/RenderTask'

/** Canvas2D 渲染引擎，第一阶段用于承接现有同步 2D 绘制回调。 */
export class Canvas2DRenderEngine implements IRenderBackend {
  /** 渲染引擎名称，用于后端调度统计。 */
  public readonly name = 'canvas-2d'
  /** 当前引擎支持的渲染层集合，用于快速判断任务是否可处理。 */
  private readonly layerSet: Set<RenderLayer>

  /**
   * 创建 Canvas2D 渲染引擎。
   *
   * @param layerList - 支持的渲染层列表，默认覆盖当前已定义的全部 2D surface
   */
  constructor(
    layerList: RenderLayer[] = [
      RenderLayer.BASE,
      RenderLayer.OVERLAY,
      RenderLayer.EXPORT,
      RenderLayer.MEASURE
    ]
  ) {
    this.layerSet = new Set(layerList)
  }

  /**
   * 判断当前任务是否可由 Canvas2D 引擎执行。
   *
   * @param task - 渲染任务描述
   * @returns 支持该 layer 且任务包含同步执行回调时返回 true
   */
  public canRender(task: IRenderTask): boolean {
    return this.layerSet.has(task.layer) && Boolean(task.execute)
  }

  /**
   * 执行 Canvas2D 渲染任务。
   *
   * @param surface - 目标渲染 surface
   * @param task - 渲染任务描述
   */
  public render(surface: IRenderSurface, task: IRenderTask) {
    // 第一阶段保持原绘制代码位置不变，仅通过后端任务入口收口调度边界。
    task.execute?.(surface, task)
  }

  /** 获取 Canvas2D 引擎能力状态。 */
  public getCapability() {
    return {
      supported: true,
      enabled: true
    }
  }
}
