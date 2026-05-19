import { RenderLayer } from './RenderLayer'

/** 单个渲染 surface，描述某一页某一层实际绑定的渲染资源。 */
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
  /** surface 挂载的 DOM 宿主，当前阶段通常是 page wrapper。 */
  host: HTMLElement
  /** 当前阶段实际复用的 HTMLCanvasElement。 */
  canvas: HTMLCanvasElement
  /** 当前阶段实际使用的 2D 上下文。 */
  ctx2d: CanvasRenderingContext2D
  /** 是否已挂载到页面 DOM 中。 */
  mounted: boolean
}

/** 单页 surface 状态，第一阶段只包含 base 和 overlay 两层。 */
export interface IRenderSurfacePageState {
  /** 当前页基础正文层 surface。 */
  base?: IRenderSurface
  /** 当前页覆盖装饰层 surface。 */
  overlay?: IRenderSurface
}
