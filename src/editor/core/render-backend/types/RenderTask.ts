import { RenderLayer } from './RenderLayer'
import type { IDrawPagePayload } from '../../../interface/Draw'
import type {
  IImageWebGLCrop,
  IImageWebGLFilter
} from '../../../interface/Element'
import type { IRenderSurface } from './RenderSurface'

/** 渲染taskreason类型，用于约束内部流程中传递的数据结构。 */
export type RenderTaskReason =
  | 'layout'
  | 'base-visible'
  | 'overlay-visible'
  | 'image-webgl'
  | 'svg-dom-block'
  | 'export'
  | 'measure'

/** 渲染taskpriority类型，用于约束内部流程中传递的数据结构。 */
export type RenderTaskPriority =
  | 'sync'
  | 'animation-frame'
  | 'idle'
  | 'worker'

/** 渲染taskexecutor类型，用于约束内部流程中传递的数据结构。 */
export type RenderTaskExecutor = (
  surface: IRenderSurface,
  task: IRenderTask
) => void

/** webgl图片渲染task调用载荷，聚合执行该操作所需的输入数据。 */
export interface IWebGLImageRenderTaskPayload {
  /** 图片源，主线程 WebGL 任务可直接消费 DOM image / bitmap / canvas。 */
  source: TexImageSource
  /** 稳定资源缓存键，用于 WebGL 纹理复用。 */
  cacheKey?: string
  /** 输出 CSS 逻辑宽度。 */
  width: number
  /** 输出 CSS 逻辑高度。 */
  height: number
  /** 可选基础图片滤镜，由 WebGL shader 和 Canvas2D 备用路径共同消费。 */
  filter?: IImageWebGLFilter
  /** 显式标记当前任务为高分辨率源图降采样输出。 */
  downsample?: boolean
  /** 源图裁剪区域，按源图固有像素坐标描述。 */
  crop?: IImageWebGLCrop
  /** 图片旋转角度，单位为度，围绕输出区域中心旋转。 */
  rotation?: number
}

/** 渲染task契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderTask {
  /** 目标页码。 */
  pageNo: number
  /** 目标渲染层。 */
  layer: RenderLayer
  /** 触发渲染的原因。 */
  reason: RenderTaskReason
  /** 可选脏矩形列表，后续用于局部重绘。 */
  dirtyRectList?: DOMRect[]
  /** 调度优先级。 */
  priority: RenderTaskPriority
  /** 是否属于当前交互页，实验后端必须保守避开该类任务。 */
  isCurrentPage?: boolean
  /** 是否包含输入、选区、光标或活动范围等高频交互状态。 */
  isInteractive?: boolean
  /** 页级绘制输入，供 OffscreenCanvas worker 构建可序列化快照。 */
  pagePayload?: IDrawPagePayload
  /** 独立 WebGL 图片任务输入，不参与正文文字排版。 */
  webglImage?: IWebGLImageRenderTaskPayload
  /** 同步执行回调，供 Canvas2D、Overlay 和备用路径执行具体绘制。 */
  execute?: RenderTaskExecutor
}
