import { BlockType } from '../dataset/enum/Block'

/** iframeblock契约，用于约束公开 API中传递的数据结构。 */
export interface IIFrameBlock {
  /** 资源地址，用于加载图片、视频或外部内容。 */
  src?: string
  /** 内联文档内容，用于 iframe 块直接渲染 HTML。 */
  srcdoc?: string
  /** 是否允许全屏，用于控制 iframe 或视频块的权限。 */
  allowFullscreen?: boolean
  /** 是否允许弹窗，用于控制嵌入内容的浏览器权限。 */
  allowPopup?: boolean
}

/** videoblock契约，用于约束公开 API中传递的数据结构。 */
export interface IVideoBlock {
  /** 资源地址，用于加载图片、视频或外部内容。 */
  src: string
}

/** svgblock契约，用于约束公开 API中传递的数据结构。 */
export interface ISvgBlock {
  /** Inline SVG source. Used by the DOM/SVG host and Canvas2D export raster fallback. */
  svg: string
  /** Cached image populated after SVG source is loaded for synchronous export drawing. */
  rasterImage?: HTMLImageElement
}

/** htmlblock契约，用于约束公开 API中传递的数据结构。 */
export interface IHtmlBlock {
  /** Sanitized or trusted inline HTML fragment rendered inside the DOM/SVG block host. */
  html: string
  /** Plain text summary used by Canvas2D export fallback. */
  text?: string
}

/** block契约，用于约束公开 API中传递的数据结构。 */
export interface IBlock {
  type: BlockType
  /** iframe 块配置，用于描述嵌入页面的资源和权限。 */
  iframeBlock?: IIFrameBlock
  /** 视频块配置，用于描述嵌入视频资源。 */
  videoBlock?: IVideoBlock
  /** 填充颜色或填充方式，用于绘制块级元素背景。 */
  fill?: string
  /** 边框颜色，用于绘制元素或表格边线。 */
  borderColor?: string
  /** 边框宽度，用于绘制元素或表格线条。 */
  borderWidth?: number
  /** 圆角半径，用于绘制圆角边框或背景。 */
  radius?: number
  /** 形状配置，用于控制块级元素外观。 */
  shape?: 'rect' | 'ellipse'
  /** 文本颜色，用于控制块级元素内文字显示。 */
  textColor?: string
  /** SVG 块配置，用于描述嵌入的矢量内容。 */
  svgBlock?: ISvgBlock
  /** HTML 块配置，用于描述嵌入 HTML 内容。 */
  htmlBlock?: IHtmlBlock
}
