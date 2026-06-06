import { RenderLayer } from './RenderLayer'

/** 渲染渲染面契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurface {
  /** 页码，和 PageCanvasHost 中的 page wrapper 下标保持一致。 */
  pageNo: number
  /** 渲染层类型，用于区分 base / overlay / export / measure。 */
  layer: RenderLayer
  /** CSS 逻辑宽度，单位为 px。 */
  width: number
  /** CSS 逻辑高度，单位为 px。 */
  height: number
  /** 连页分块渲染时，该 surface 在逻辑页内的 Y 偏移。 */
  offsetY?: number
  /** 当前 surface 的设备像素比。 */
  dpr: number
  /** surface 挂载的 DOM 宿主，通常是 page wrapper。 */
  host: HTMLElement
  /** 实际复用的 HTMLCanvasElement。 */
  canvas: HTMLCanvasElement
  /** 实际使用的 2D 上下文。 */
  ctx2d: CanvasRenderingContext2D
  /** 是否已挂载到页面 DOM 中。 */
  mounted: boolean
}

/** 渲染渲染面页面state契约，用于约束内部流程中传递的数据结构。 */
export interface IRenderSurfacePageState {
  /** 当前页基础正文层 surface。 */
  base?: IRenderSurface
  /** 当前页覆盖装饰层 surface。 */
  overlay?: IRenderSurface
}
