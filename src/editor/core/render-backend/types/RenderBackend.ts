import { IRenderSurface } from './RenderSurface'
import { IRenderTask } from './RenderTask'

/** 渲染backend契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderBackend {
  /** 渲染后端名称，用于调试和统计。 */
  name: string
  /** 获取后端能力状态，用于调试多引擎备用路径。 */
  getCapability?(): {
    /** 当前环境是否支持该后端能力。 */
    supported?: boolean
    /** 当前是否启用该后端处理任务。 */
    enabled?: boolean
    /** 索引签名，描述动态键值的访问结构。 */
    [key: string]: unknown
  }
  /** 判断当前后端是否能够处理指定任务。 */
  canRender(task: IRenderTask): boolean
  /** 在指定 surface 上执行渲染任务。 */
  render(surface: IRenderSurface, task: IRenderTask): void
}
