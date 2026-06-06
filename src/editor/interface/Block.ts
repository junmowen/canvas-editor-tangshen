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
  /** 内联 SVG 源，供 DOM/SVG host 和 Canvas2D 导出备用栅格绘制使用。 */
  svg: string
  /** SVG 源加载后缓存的图片，用于同步导出绘制。 */
  rasterImage?: HTMLImageElement
}

/** htmlblock契约，用于约束公开 API中传递的数据结构。 */
export interface IHtmlBlock {
  /** 已清理或可信的内联 HTML 片段，在 DOM/SVG block host 中渲染。 */
  html: string
  /** 纯文本摘要，用于 Canvas2D 导出备用绘制。 */
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
