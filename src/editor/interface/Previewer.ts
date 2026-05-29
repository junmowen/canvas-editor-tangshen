import { IElement } from './Element'

export interface IPreviewerCreateResult {
  resizerSelection: HTMLDivElement
  resizerHandleList: HTMLDivElement[]
  resizerImageContainer: HTMLDivElement
  resizerImage: HTMLImageElement
  /** 缩放控制点尺寸，决定图片和浮层拖拽手柄大小。 */
  resizerSize: HTMLSpanElement
}

/** 预览器绘制选项，用于约束调用方可传入的可选配置。 */
export interface IPreviewerDrawOption {
  mime?: 'png' | 'jpg' | 'jpeg' | 'svg'
  /** srckey，用于在映射表或缓存中定位数据。 */
  srcKey?: keyof Pick<IElement, 'value' | 'laTexSVG'>
  /** dragdisable开关，用于控制当前流程的判断分支。 */
  dragDisable?: boolean
}
