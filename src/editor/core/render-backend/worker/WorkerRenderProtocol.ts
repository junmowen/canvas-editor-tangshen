import { BackgroundRepeat, BackgroundSize } from '../../../dataset/enum/Background'
import { RenderLayer } from '../types/RenderLayer'

/** worker 渲染命令支持的基础矩形。 */
export interface IWorkerRenderRect {
  x: number
  y: number
  width: number
  height: number
}

/** 清屏命令。 */
export interface IWorkerClearCommand {
  type: 'clear'
  rect: IWorkerRenderRect
}

/** 页面背景图片命令。 */
export interface IWorkerBackgroundImageCommand {
  type: 'backgroundImage'
  src: string
  scale: number
  width: number
  height: number
  size: BackgroundSize
  repeat: BackgroundRepeat
}

/** 填充矩形命令。 */
export interface IWorkerFillRectCommand {
  type: 'fillRect'
  rect: IWorkerRenderRect
  fillStyle: string
  alpha?: number
  translateX?: number
  translateY?: number
}

/** 文本绘制命令。 */
export interface IWorkerFillTextCommand {
  type: 'fillText'
  text: string
  x: number
  y: number
  font: string
  fillStyle: string
  alpha?: number
  translateX?: number
  translateY?: number
  rotate?: number
  baseline?: CanvasTextBaseline
}

/** 重复文字水印命令。 */
export interface IWorkerRepeatTextWatermarkCommand {
  type: 'repeatTextWatermark'
  text: string
  font: string
  fillStyle: string
  alpha: number
  gap: [number, number]
  width: number
  height: number
}

/** 重复图片水印命令。 */
export interface IWorkerRepeatImageWatermarkCommand {
  type: 'repeatImageWatermark'
  src: string
  alpha: number
  imageWidth: number
  imageHeight: number
  gap: [number, number]
  width: number
  height: number
}

/** 图片绘制命令。 */
export interface IWorkerDrawImageCommand {
  type: 'drawImage'
  src: string
  rect: IWorkerRenderRect
  alpha?: number
  translateX?: number
  translateY?: number
  rotate?: number
}

/** 描边矩形命令。 */
export interface IWorkerStrokeRectCommand {
  type: 'strokeRect'
  rect: IWorkerRenderRect
  strokeStyle: string
  lineWidth: number
  alpha?: number
  translateX?: number
  translateY?: number
}

/** 描边线段。 */
export interface IWorkerStrokeSegment {
  from: [number, number]
  to: [number, number]
}

/** 描边路径命令。 */
export interface IWorkerStrokePathCommand {
  type: 'strokePath'
  segmentList: IWorkerStrokeSegment[]
  strokeStyle: string
  lineWidth: number
  alpha?: number
  translateX?: number
  translateY?: number
  lineDash?: number[]
}

/** 描边 SVG path 命令，用于 LaTeX 等已矢量化内容。 */
export interface IWorkerStrokeSvgPathCommand {
  type: 'strokeSvgPath'
  path: string
  strokeStyle: string
  lineWidth: number
  alpha?: number
  translateX?: number
  translateY?: number
  scaleX?: number
  scaleY?: number
}

/** 填充路径命令。 */
export interface IWorkerFillPathCommand {
  type: 'fillPath'
  segmentList: IWorkerStrokeSegment[]
  fillStyle: string
  alpha?: number
  translateX?: number
  translateY?: number
}

/** 描边圆形命令。 */
export interface IWorkerStrokeCircleCommand {
  type: 'strokeCircle'
  x: number
  y: number
  radius: number
  strokeStyle: string
  lineWidth: number
  alpha?: number
  translateX?: number
  translateY?: number
}

/** 填充圆形命令。 */
export interface IWorkerFillCircleCommand {
  type: 'fillCircle'
  x: number
  y: number
  radius: number
  fillStyle: string
  alpha?: number
  translateX?: number
  translateY?: number
}

/** 压入矩形裁剪区域。 */
export interface IWorkerPushClipRectCommand {
  type: 'pushClipRect'
  rect: IWorkerRenderRect
}

/** 弹出最近一次裁剪状态。 */
export interface IWorkerPopStateCommand {
  type: 'popState'
}

/** worker 当前支持清屏、基础图形和文本绘制。 */
export type IWorkerPaintCommand =
  | IWorkerClearCommand
  | IWorkerBackgroundImageCommand
  | IWorkerFillRectCommand
  | IWorkerFillTextCommand
  | IWorkerRepeatTextWatermarkCommand
  | IWorkerRepeatImageWatermarkCommand
  | IWorkerDrawImageCommand
  | IWorkerStrokeRectCommand
  | IWorkerStrokePathCommand
  | IWorkerStrokeSvgPathCommand
  | IWorkerFillPathCommand
  | IWorkerStrokeCircleCommand
  | IWorkerFillCircleCommand
  | IWorkerPushClipRectCommand
  | IWorkerPopStateCommand

/** worker 可消费的单页 base 渲染快照。 */
export interface IWorkerPageRenderSnapshot {
  jobId: number
  pageNo: number
  layer: RenderLayer.BASE
  width: number
  height: number
  dpr: number
  scale: number
  layoutVersion: number
  baseVisualVersion: number
  commandList: IWorkerPaintCommand[]
}

/** worker 渲染成功响应。 */
export interface IWorkerRenderSuccessResult {
  type: 'success'
  jobId: number
  pageNo: number
  layer: RenderLayer.BASE
  width: number
  height: number
  dpr: number
  scale: number
  layoutVersion: number
  baseVisualVersion: number
  bitmap: ImageBitmap
}

/** worker 渲染失败响应。 */
export interface IWorkerRenderErrorResult {
  type: 'error'
  jobId: number
  pageNo: number
  layer: RenderLayer.BASE
  errorReason: string
}

/** worker 渲染响应。 */
export type IWorkerRenderResult =
  | IWorkerRenderSuccessResult
  | IWorkerRenderErrorResult
