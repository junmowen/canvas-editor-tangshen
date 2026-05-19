import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { Draw } from '../Draw'

/**
 * 页眉边框边界。
 *
 * 只负责计算页眉侧的上边界，避免和页脚边界耦在同一个类里。
 */
export class HeaderPageBorder {
  private draw: Draw
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
  }

  public getTop(): number {
    const {
      scale,
      pageBorder: { padding }
    } = this.options
    const margins = this.draw.getMargins()
    const headerExtraHeight = this.draw.getHeader().getExtraHeight()
    const topGapRatio = 0.25
    return Math.max(
      0,
      margins[0] + headerExtraHeight * topGapRatio - padding[0] * scale
    )
  }

  public getLeft(): number {
    const {
      scale,
      pageBorder: { padding }
    } = this.options
    const margins = this.draw.getMargins()
    return Math.max(0, margins[3] - padding[3] * scale)
  }

  public getWidth(): number {
    const {
      scale,
      pageBorder: { padding }
    } = this.options
    return Math.max(
      0,
      this.draw.getInnerWidth() + (padding[1] + padding[3]) * scale
    )
  }
}
