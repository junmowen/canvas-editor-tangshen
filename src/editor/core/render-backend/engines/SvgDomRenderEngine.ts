import type { IRenderBackend } from '../types/RenderBackend'
import type { IRenderSurface } from '../types/RenderSurface'
import type { IRenderTask } from '../types/RenderTask'

/** SVG / DOM 渲染引擎配置。 */
export interface ISvgDomRenderEngineOptions {
  /** 是否启用 SVG / DOM 任务处理，默认关闭以保持现有 canvas 主链路稳定。 */
  enabled?: boolean
  /** 是否允许 DOM / SVG 引擎接管外部 block host 任务。 */
  blockTask?: boolean
}

/**
 * SVG / DOM 渲染引擎占位实现。
 *
 * 用于后续承接外部 block、嵌入内容或 SVG 装饰层；
 * 当前仅暴露 capability，不处理现有 canvas 渲染任务。
 */
export class SvgDomRenderEngine implements IRenderBackend {
  /** 渲染引擎名称，用于后端调度统计。 */
  public readonly name = 'svg-dom'
  /** 当前环境是否具备 DOM / SVG 基础能力。 */
  public readonly supported: boolean
  /** 当前引擎配置，保留引用以支持运行时灰度开关。 */
  private readonly options: ISvgDomRenderEngineOptions

  /**
   * 创建 SVG / DOM 渲染引擎。
   *
   * @param options - 引擎启用配置
   */
  constructor(options: ISvgDomRenderEngineOptions = {}) {
    this.options = options
    this.supported =
      typeof document !== 'undefined' &&
      typeof document.createElementNS === 'function'
  }

  /**
   * 判断任务是否适合由 SVG / DOM 引擎处理。
   *
   * 当前尚未定义 DOM / SVG 专用任务原因，因此默认不抢占任何任务。
   *
   * @returns 当前阶段始终返回 false
   */
  public canRender(task: IRenderTask): boolean {
    return (
      Boolean(this.options.enabled) &&
      this.options.blockTask !== false &&
      this.supported &&
      task.reason === 'svg-dom-block' &&
      Boolean(task.execute)
    )
  }

  /**
   * 执行 SVG / DOM 渲染任务。
   *
   * 当前为占位实现，默认不会被调度命中。
   *
   * @param _surface - 目标渲染 surface
   * @param _task - 渲染任务描述
   */
  public render(surface: IRenderSurface, task: IRenderTask) {
    task.execute?.(surface, task)
  }

  /** 获取 SVG / DOM 引擎能力状态。 */
  public getCapability() {
    return {
      supported: this.supported,
      enabled: Boolean(this.options.enabled) && this.options.blockTask !== false
    }
  }
}
