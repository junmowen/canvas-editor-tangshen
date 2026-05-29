import { BackgroundRepeat, BackgroundSize } from '../../../dataset/enum/Background'
import { RenderLayer } from '../types/RenderLayer'

/** 后台线程渲染rect，描述选区、元素或页面中的矩形区域。 */
export interface IWorkerRenderRect {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/** 后台线程clearcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerClearCommand {
  type: 'clear'
  /** 矩形区域，用于描述命中、裁剪或重绘范围。 */
  rect: IWorkerRenderRect
}

/** 后台线程背景图片command契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerBackgroundImageCommand {
  type: 'backgroundImage'
  /** 资源地址，用于加载图片、视频或外部内容。 */
  src: string
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size: BackgroundSize
  /** 是否重复，用于控制背景、页眉页脚或水印复用。 */
  repeat: BackgroundRepeat
}

/** 后台线程fillrectcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerFillRectCommand {
  type: 'fillRect'
  /** 矩形区域，用于描述命中、裁剪或重绘范围。 */
  rect: IWorkerRenderRect
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle: string
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
}

/** 后台线程fill文本command契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerFillTextCommand {
  type: 'fillText'
  /** 文本内容，用于剪贴板、输入或公式节点。 */
  text: string
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font: string
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle: string
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
  /** rotate数值，用于当前布局、统计或索引计算。 */
  rotate?: number
  baseline?: CanvasTextBaseline
}

/** 后台线程repeat文本watermarkcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerRepeatTextWatermarkCommand {
  type: 'repeatTextWatermark'
  /** 文本内容，用于剪贴板、输入或公式节点。 */
  text: string
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font: string
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle: string
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha: number
  /** 间距值，用于控制元素之间的空白距离。 */
  gap: [number, number]
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/** 后台线程repeat图片watermarkcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerRepeatImageWatermarkCommand {
  type: 'repeatImageWatermark'
  /** 资源地址，用于加载图片、视频或外部内容。 */
  src: string
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha: number
  /** 图片位图宽度，供 worker 侧重放绘制命令。 */
  imageWidth: number
  /** 图片位图高度，供 worker 侧重放绘制命令。 */
  imageHeight: number
  /** 间距值，用于控制元素之间的空白距离。 */
  gap: [number, number]
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/** 后台线程绘制图片command契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerDrawImageCommand {
  type: 'drawImage'
  /** 资源地址，用于加载图片、视频或外部内容。 */
  src: string
  /** 矩形区域，用于描述命中、裁剪或重绘范围。 */
  rect: IWorkerRenderRect
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
  /** rotate数值，用于当前布局、统计或索引计算。 */
  rotate?: number
}

/** 后台线程strokerectcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerStrokeRectCommand {
  type: 'strokeRect'
  /** 矩形区域，用于描述命中、裁剪或重绘范围。 */
  rect: IWorkerRenderRect
  /** 描边样式，用于设置 Canvas 线条颜色或图案。 */
  strokeStyle: string
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth: number
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
}

/** 后台线程strokesegment契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerStrokeSegment {
  /** from数值，用于当前布局、统计或索引计算。 */
  from: [number, number]
  /** to数值，用于当前布局、统计或索引计算。 */
  to: [number, number]
}

/** 后台线程strokepathcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerStrokePathCommand {
  type: 'strokePath'
  segmentList: IWorkerStrokeSegment[]
  /** 描边样式，用于设置 Canvas 线条颜色或图案。 */
  strokeStyle: string
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth: number
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
  /** 行dash数值，用于当前布局、统计或索引计算。 */
  lineDash?: number[]
}

/** 后台线程strokesvgpathcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerStrokeSvgPathCommand {
  type: 'strokeSvgPath'
  /** path文本，用于标识、展示或匹配当前对象。 */
  path: string
  /** 描边样式，用于设置 Canvas 线条颜色或图案。 */
  strokeStyle: string
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth: number
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
  /** 缩放x数值，用于当前布局、统计或索引计算。 */
  scaleX?: number
  /** 缩放y数值，用于当前布局、统计或索引计算。 */
  scaleY?: number
}

/** 后台线程fillpathcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerFillPathCommand {
  type: 'fillPath'
  segmentList: IWorkerStrokeSegment[]
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle: string
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
}

/** 后台线程strokecirclecommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerStrokeCircleCommand {
  type: 'strokeCircle'
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 圆角半径，用于绘制圆角边框或背景。 */
  radius: number
  /** 描边样式，用于设置 Canvas 线条颜色或图案。 */
  strokeStyle: string
  /** 线宽，用于设置 Canvas 描边粗细。 */
  lineWidth: number
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
}

/** 后台线程fillcirclecommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerFillCircleCommand {
  type: 'fillCircle'
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 圆角半径，用于绘制圆角边框或背景。 */
  radius: number
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle: string
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 横向平移量，用于调整绘制或命中坐标。 */
  translateX?: number
  /** 纵向平移量，用于调整绘制或命中坐标。 */
  translateY?: number
}

/** 后台线程pushcliprectcommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerPushClipRectCommand {
  type: 'pushClipRect'
  /** 矩形区域，用于描述命中、裁剪或重绘范围。 */
  rect: IWorkerRenderRect
}

/** 后台线程popstatecommand契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerPopStateCommand {
  type: 'popState'
}

/** 后台线程paintcommand类型，用于约束内部流程中传递的数据结构。 */
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

/** 后台线程页面渲染snapshot契约，用于约束内部流程中传递的数据结构。 */
export interface IWorkerPageRenderSnapshot {
  /** 任务标识，用于关联异步渲染请求和响应。 */
  jobId: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 渲染图层标识，用于区分页背景、正文和浮层。 */
  layer: RenderLayer.BASE
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 设备像素比，用于将 CSS 尺寸换算为画布像素。 */
  dpr: number
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale: number
  /** 布局版本号，用于判断缓存位置是否过期。 */
  layoutVersion: number
  /** 基准视觉版本，用于判断渲染快照是否仍然有效。 */
  baseVisualVersion: number
  /** 命令列表，保存需要按顺序执行的编辑命令。 */
  commandList: IWorkerPaintCommand[]
}

export interface IWorkerRenderSuccessResult {
  type: 'success'
  /** 任务标识，用于关联异步渲染请求和响应。 */
  jobId: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 渲染图层标识，用于区分页背景、正文和浮层。 */
  layer: RenderLayer.BASE
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 设备像素比，用于将 CSS 尺寸换算为画布像素。 */
  dpr: number
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale: number
  /** 布局版本号，用于判断缓存位置是否过期。 */
  layoutVersion: number
  /** 基准视觉版本，用于判断渲染快照是否仍然有效。 */
  baseVisualVersion: number
  bitmap: ImageBitmap
}

export interface IWorkerRenderErrorResult {
  type: 'error'
  /** 任务标识，用于关联异步渲染请求和响应。 */
  jobId: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 渲染图层标识，用于区分页背景、正文和浮层。 */
  layer: RenderLayer.BASE
  /** errorreason文本，用于标识、展示或匹配当前对象。 */
  errorReason: string
}

export type IWorkerRenderResult =
  | IWorkerRenderSuccessResult
  | IWorkerRenderErrorResult
