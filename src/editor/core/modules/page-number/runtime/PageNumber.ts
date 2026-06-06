import { FORMAT_PLACEHOLDER } from '../../../../dataset/constant/PageNumber'
import { NumberType } from '../../../../dataset/enum/Common'
import { RowFlex } from '../../../../dataset/enum/Row'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { convertNumberToChinese } from '../../../../utils'
import { Draw } from '../../../draw/Draw'

export class PageNumber {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  /** 初始化 PageNumber 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
  }

  /** 格式化numberplaceholder，生成界面显示或提交需要的文本。 */
  static formatNumberPlaceholder(
    text: string,
    pageNo: number,
    replaceReg: RegExp,
    numberType: NumberType
  ) {
    const pageNoText =
      numberType === NumberType.CHINESE
        ? convertNumberToChinese(pageNo)
        : `${pageNo}`
    return text.replace(replaceReg, pageNoText)
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    const {
      scale,
      pageNumber: {
        size,
        font,
        color,
        rowFlex,
        numberType,
        format,
        startPageNo,
        fromPageNo
      }
    } = this.options
    if (pageNo < fromPageNo) return
    // 处理页码格式
    let text = format
    // 创建 page No Reg 实例。
    const pageNoReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_NO)
    if (pageNoReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        pageNo + startPageNo - fromPageNo,
        pageNoReg,
        numberType
      )
    }
    // 创建 page Count Reg 实例。
    const pageCountReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_COUNT)
    if (pageCountReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        this.draw.getPageCount() - fromPageNo,
        pageCountReg,
        numberType
      )
    }
    const width = this.draw.getWidth()
    // 计算y位置
    const height = this.draw.getHeight()
    const pageNumberBottom =
      this.draw.getServices().metricsService.getPageNumberBottom()
    const y = height - pageNumberBottom
    ctx.save()
    ctx.fillStyle = color
    ctx.font = `${size * scale}px ${font}`
    // 计算x位置-居左、居中、居右
    let x = 0
    // 页码左对齐/右对齐依赖当前页内外边距，镜像页边距时不能复用首页边距。
    const margins = this.draw.getMargins(pageNo)
    const { width: textWidth } = ctx.measureText(text)
    if (rowFlex === RowFlex.CENTER) {
      x = (width - textWidth) / 2
    } else if (rowFlex === RowFlex.RIGHT) {
      x = width - textWidth - margins[1]
    } else {
      x = margins[3]
    }
    ctx.fillText(text, x, y)
    ctx.restore()
  }
}
