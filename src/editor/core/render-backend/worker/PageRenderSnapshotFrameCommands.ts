
import { FORMAT_PLACEHOLDER } from '../../../dataset/constant/PageNumber'
import { WatermarkType } from '../../../dataset/enum/Watermark'
import { IDrawPagePayload } from '../../../interface/Draw'
import { resolveWorkerSnapshotPageNumberX } from '../../modules/page-number/render/PageNumberWorkerSnapshotPolicy'
import { PageNumber } from '../../modules/page-number/runtime/PageNumber'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotPageCommands } from './PageRenderSnapshotPageCommands'

/** Paging frame, page number and watermark commands. */
export abstract class PageRenderSnapshotFrameCommands extends PageRenderSnapshotPageCommands {
  protected buildPagingFrameCommands(
    payload: IDrawPagePayload
  ): IWorkerPaintCommand[] {
    if (!this.draw.isPagingPageMode()) return []
    const commandList: IWorkerPaintCommand[] = []
    const options = this.draw.getRuntime().getOptions()
    if (!options.header.disabled) {
      this.buildHeaderCommands(commandList)
    }
    if (!options.pageNumber.disabled) {
      this.buildPageNumberCommands(commandList, payload.pageNo)
    }
    if (!options.footer.disabled) {
      this.buildFooterCommands(commandList)
    }
    return commandList
  }

  /** 生成页眉文本命令。 */
  protected buildHeaderCommands(commandList: IWorkerPaintCommand[]) {
    const header = this.draw.getHeader()
    this.buildRowTextCommands(
      commandList,
      this.getRenderableFrameRowList(
        header.getRowList(),
        header.getMaxHeight()
      ),
      header.getPositionList(),
      this.draw.getZone().isHeaderActive()
        ? 1
        : this.draw.getRuntime().getOptions().header.inactiveAlpha
    )
  }

  /** 生成页脚文本命令。 */
  protected buildFooterCommands(commandList: IWorkerPaintCommand[]) {
    const footer = this.draw.getFooter()
    this.buildRowTextCommands(
      commandList,
      this.getRenderableFrameRowList(
        footer.getRowList(),
        footer.getMaxHeight()
      ),
      footer.getPositionList(),
      this.draw.getZone().isFooterActive()
        ? 1
        : this.draw.getRuntime().getOptions().footer.inactiveAlpha
    )
  }

  protected buildPageNumberCommands(
    commandList: IWorkerPaintCommand[],
    pageNo: number
  ) {
    const {
      scale,
      pageNumber: { size, font, color, rowFlex, fromPageNo }
    } = this.draw.getRuntime().getOptions()
    if (pageNo < fromPageNo) return
    const text = this.formatPageNumberText(pageNo)
    const textWidth = this.measureTextWidth(
      text,
      `${size * scale}px ${font}`
    )
    const pageNumberBottom =
      this.draw.getServices().metricsService.getPageNumberBottom()
    const margins = this.draw.getMargins()
    const x = resolveWorkerSnapshotPageNumberX({
      rowFlex,
      pageWidth: this.draw.getWidth(),
      textWidth,
      margins
    })
    commandList.push({
      type: 'fillText',
      text,
      x,
      y: this.draw.getHeight() - pageNumberBottom,
      font: `${size * scale}px ${font}`,
      fillStyle: color
    })
  }


  protected buildWatermarkCommands(
    payload: IDrawPagePayload
  ): IWorkerPaintCommand[] {
    const {
      scale,
      watermark: { data, type, opacity, font, size, color, repeat, gap, width, height }
    } = this.draw.getRuntime().getOptions()
    if (!data) return []
    if (type === WatermarkType.IMAGE) {
      const imageWidth = width * scale
      const imageHeight = height * scale
      if (!imageWidth || !imageHeight) return []
      if (repeat) {
        return [
          {
            type: 'repeatImageWatermark',
            src: data,
            alpha: opacity,
            imageWidth,
            imageHeight,
            gap: [gap[0] * scale, gap[1] * scale],
            width: this.draw.getWidth(),
            height: this.draw.getHeight()
          }
        ]
      }
      return [
        {
          type: 'drawImage',
          src: data,
          rect: {
            x: -imageWidth / 2,
            y: -imageHeight / 2,
            width: imageWidth,
            height: imageHeight
          },
          alpha: opacity,
          translateX: this.draw.getWidth() / 2,
          translateY: this.draw.getHeight() / 2,
          rotate: (-45 * Math.PI) / 180
        }
      ]
    }
    const text = this.formatWatermarkText(payload.pageNo)
    const commandFont = `${size * scale}px ${font}`
    if (repeat) {
      return [
        {
          type: 'repeatTextWatermark',
          text,
          font: commandFont,
          fillStyle: color,
          alpha: opacity,
          gap: [gap[0] * scale, gap[1] * scale],
          width: this.draw.getWidth(),
          height: this.draw.getHeight()
        }
      ]
    }
    const metrics = this.measureTextMetrics(text, commandFont)
    return [
      {
        type: 'fillText',
        text,
        x: -metrics.width / 2,
        y: metrics.actualBoundingBoxAscent - (size * scale) / 2,
        font: commandFont,
        fillStyle: color,
        alpha: opacity,
        translateX: this.draw.getWidth() / 2,
        translateY: this.draw.getHeight() / 2,
        rotate: (-45 * Math.PI) / 180
      }
    ]
  }


  protected getRenderableFrameRowList(
    rowList: IDrawPagePayload['rowList'],
    maxHeight: number
  ): IDrawPagePayload['rowList'] {
    const renderableRowList: IDrawPagePayload['rowList'] = []
    let curRowHeight = 0
    for (let i = 0; i < rowList.length; i++) {
      const row = rowList[i]
      if (curRowHeight + row.height > maxHeight) break
      renderableRowList.push(row)
      curRowHeight += row.height
    }
    return renderableRowList
  }

  /** 格式化页码文本。 */
  protected formatPageNumberText(pageNo: number): string {
    const {
      pageNumber: { format, startPageNo, fromPageNo, numberType }
    } = this.draw.getRuntime().getOptions()
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
    return text
  }

  /** 格式化水印文本。 */
  protected formatWatermarkText(pageNo: number): string {
    const {
      watermark: { data, numberType }
    } = this.draw.getRuntime().getOptions()
    let text = data
    // 创建 page No Reg 实例。
    const pageNoReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_NO)
    if (pageNoReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        pageNo + 1,
        pageNoReg,
        numberType
      )
    }
    // 创建 page Count Reg 实例。
    const pageCountReg = new RegExp(FORMAT_PLACEHOLDER.PAGE_COUNT)
    if (pageCountReg.test(text)) {
      text = PageNumber.formatNumberPlaceholder(
        text,
        this.draw.getPageCount(),
        pageCountReg,
        numberType
      )
    }
    return text
  }
}
