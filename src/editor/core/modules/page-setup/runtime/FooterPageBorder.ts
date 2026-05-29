import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { Draw } from '../../../draw/Draw'

/**
 * 页脚边框边界。
 *
 * 只负责计算页脚侧的下边界，便于单独维护。
 */
export class FooterPageBorder {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  /** 初始化 FooterPageBorder 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
  }

  public getBottom(
    pageNo = this.draw.getPageNo(),
    pageHeight = this.draw.getPageCanvasHost().getPageHeight(pageNo)
  ): number {
    const {
      scale,
      pageBorder: { padding }
    } = this.options
    const margins = this.draw.getMargins()
    const footerExtraHeight = this.draw.getFooter().getExtraHeight()
    const bottomGapRatio = 0.25
    return Math.max(
      0,
      pageHeight -
        margins[2] -
        footerExtraHeight * bottomGapRatio +
        padding[2] * scale
    )
  }
}
