
import { ulStyleMapping } from '../../../dataset/constant/List'
import { ZERO } from '../../../dataset/constant/Common'
import { ListStyle, ListType, UlStyle } from '../../../dataset/enum/List'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { isWorkerSnapshotListMarkerTab } from '../../modules/list/render/WorkerSnapshotListMarkerPolicy'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotInlineControlCommands } from './PageRenderSnapshotInlineControlCommands'

/** Ordered, unordered and checkbox list marker command generation. */
export abstract class PageRenderSnapshotListCommands extends PageRenderSnapshotInlineControlCommands {
  /** 写入列表markercommands，追加后续渲染需要的命令数据。 */
  protected pushListMarkerCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    rowStartPosition: IElementPosition,
    alpha: number
  ) {
    const startElement = row.elementList[0]
    if (startElement.value !== ZERO || startElement.listWrap) return
    const {
      defaultTabWidth,
      scale,
      defaultFont,
      defaultSize,
      defaultColor
    } = this.draw.getRuntime().getOptions()
    const levelIndent = (startElement.listLevel || 0) * defaultTabWidth * scale
    let tabWidth = 0
    for (let i = 1; i < row.elementList.length; i++) {
      const element = row.elementList[i]
      if (!isWorkerSnapshotListMarkerTab(element)) break
      tabWidth += defaultTabWidth * scale
    }
    const startX = rowStartPosition.coordinate.leftTop[0]
    const startY = rowStartPosition.coordinate.leftTop[1]
    const x = startX - (row.offsetX || 0) + levelIndent + tabWidth
    const y = startY + row.ascent
    if (startElement.listStyle === ListStyle.CHECKBOX) {
      const {
        checkbox: { width, height, gap }
      } = this.draw.getRuntime().getOptions()
      const checkboxRowElement: IRowElement = {
        ...startElement,
        checkbox: {
          value: !!startElement.checkbox?.value
        },
        metrics: {
          ...startElement.metrics,
          width: (width + gap * 2) * scale,
          height: height * scale
        }
      }
      this.pushCheckboxCommands(
        commandList,
        {
          ...row,
          elementList: [checkboxRowElement, ...row.elementList]
        },
        checkboxRowElement,
        {
          ...rowStartPosition,
          coordinate: {
            ...rowStartPosition.coordinate,
            leftTop: [x - gap * scale, startY]
          }
        },
        alpha
      )
      return
    }
    const text =
      startElement.listType === ListType.UL
        ? this.getUlStyleText(startElement)
        : `${(row.listIndex || 0) + 1}.`
    if (!text) return
    commandList.push({
      type: 'fillText',
      text,
      x,
      y,
      font: `${defaultSize * scale}px ${defaultFont}`,
      fillStyle: defaultColor,
      alpha
    })
  }

  /** 获取无序列表标记字符。 */
  protected getUlStyleText(element: IRowElement): string {
    if (element.listStyle === ListStyle.CHECKBOX) {
      return ulStyleMapping[UlStyle.CHECKBOX]
    }
    const levelStyleList = [UlStyle.DISC, UlStyle.CIRCLE, UlStyle.SQUARE]
    const levelStyle =
      levelStyleList[(element.listLevel || 0) % levelStyleList.length]
    return ulStyleMapping[levelStyle] || ulStyleMapping[UlStyle.DISC]
  }
}
