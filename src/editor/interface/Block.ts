import { BlockType } from '../dataset/enum/Block'

export interface IIFrameBlock {
  src?: string
  srcdoc?: string
}

export interface IVideoBlock {
  src: string
}

export interface ISvgBlock {
  /** Inline SVG source. Used by the DOM/SVG host and Canvas2D export raster fallback. */
  svg: string
  /** Cached image populated after SVG source is loaded for synchronous export drawing. */
  rasterImage?: HTMLImageElement
}

export interface IHtmlBlock {
  /** Sanitized or trusted inline HTML fragment rendered inside the DOM/SVG block host. */
  html: string
  /** Plain text summary used by Canvas2D export fallback. */
  text?: string
}

export interface IBlock {
  type: BlockType
  iframeBlock?: IIFrameBlock
  videoBlock?: IVideoBlock
  fill?: string
  borderColor?: string
  borderWidth?: number
  radius?: number
  shape?: 'rect' | 'ellipse'
  textColor?: string
  svgBlock?: ISvgBlock
  htmlBlock?: IHtmlBlock
}
