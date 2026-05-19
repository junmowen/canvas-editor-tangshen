import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { Draw } from '../Draw'

/**
 * 页脚边框边界。
 *
 * 只负责计算页脚侧的下边界，便于单独维护。
 */
export class FooterPageBorder {
  private draw: Draw
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
  }

  public getBottom(): number {
    const {
      scale,
      pageBorder: { padding }
    } = this.options
    const margins = this.draw.getMargins()
    const footerExtraHeight = this.draw.getFooter().getExtraHeight()
    const bottomGapRatio = 0.25
    return Math.max(
      0,
      this.draw.getHeight() -
        margins[2] -
        footerExtraHeight * bottomGapRatio +
        padding[2] * scale
    )
  }
}
