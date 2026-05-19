import { IRenderSurface } from './RenderSurface'
import { IRenderTask } from './RenderTask'

/** 渲染后端接口，不同引擎通过该接口接入统一调度。 */
export interface IRenderBackend {
  /** 渲染后端名称，用于调试和统计。 */
  name: string
  /** 获取后端能力状态，用于调试多引擎 fallback。 */
  getCapability?(): {
    /** 当前环境是否支持该后端能力。 */
    supported?: boolean
    /** 当前是否启用该后端处理任务。 */
    enabled?: boolean
    [key: string]: unknown
  }
  /** 判断当前后端是否能够处理指定任务。 */
  canRender(task: IRenderTask): boolean
  /** 在指定 surface 上执行渲染任务。 */
  render(surface: IRenderSurface, task: IRenderTask): void
}
