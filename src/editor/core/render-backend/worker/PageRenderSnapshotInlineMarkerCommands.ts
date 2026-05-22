
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { LineBreakParticle } from '../../draw/particle/LineBreakParticle'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotRowDecorations } from './PageRenderSnapshotRowDecorations'

/** Inline marker commands for separators, line breaks and page breaks. */
export abstract class PageRenderSnapshotInlineMarkerCommands extends PageRenderSnapshotRowDecorations {
  protected pushSeparatorCommand(
    commandList: IWorkerPaintCommand[],
    element: IRowElement,
    rowPosition: IElementPosition
  ) {
    const {
      scale,
      separator: { lineWidth, strokeStyle }
    } = this.draw.getRuntime().getOptions()
    const x = rowPosition.coordinate.leftTop[0]
    const y = Math.round(rowPosition.coordinate.leftTop[1])
    commandList.push({
      type: 'strokePath',
      segmentList: [
        {
          from: [x, y],
          to: [x + element.width! * scale, y]
        }
      ],
      strokeStyle: element.color || strokeStyle,
      lineWidth: lineWidth * scale,
      translateY: (lineWidth * scale) / 2,
      lineDash: element.dashArray
    })
  }

  /** 输出编辑态换行标记命令。 */
  protected pushLineBreakCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    rowPositionList: IElementPosition[],
    alpha: number
  ) {
    if (row.isWidthNotEnough || !row.elementList.length) return
    const element = row.elementList[row.elementList.length - 1]
    const rowPosition = rowPositionList[rowPositionList.length - 1]
    if (!rowPosition) return
    const {
      scale,
      lineBreak: { color, lineWidth }
    } = this.draw.getRuntime().getOptions()
    const x = rowPosition.coordinate.leftTop[0]
    const y = rowPosition.coordinate.leftTop[1] + row.height / 2
    const left = x + element.metrics.width
    const top = y - (LineBreakParticle.HEIGHT * scale) / 2
    commandList.push({
      type: 'strokePath',
      segmentList: [
        { from: [8 * scale, 0], to: [12 * scale, 0] },
        { from: [12 * scale, 0], to: [12 * scale, 6 * scale] },
        { from: [12 * scale, 6 * scale], to: [3 * scale, 6 * scale] },
        { from: [3 * scale, 6 * scale], to: [6 * scale, 3 * scale] },
        { from: [3 * scale, 6 * scale], to: [6 * scale, 9 * scale] }
      ],
      strokeStyle: color,
      lineWidth: lineWidth * scale,
      alpha,
      translateX: left,
      translateY: top
    })
  }

  /** 输出编辑态空格标记命令。 */
  protected pushSpaceMarkerCommands(
    commandList: IWorkerPaintCommand[],
    element: IRowElement,
    rowPosition: IElementPosition,
    alpha: number
  ) {
    const {
      scale,
      lineBreak: { color, lineWidth }
    } = this.draw.getRuntime().getOptions()
    const markerRadius = Math.max(1, Math.round(lineWidth * scale * 1.25))
    commandList.push({
      type: 'fillCircle',
      x: element.metrics.width / 2,
      y: rowPosition.lineHeight / 2,
      radius: markerRadius,
      fillStyle: color,
      alpha,
      translateX: rowPosition.coordinate.leftTop[0],
      translateY: rowPosition.coordinate.leftTop[1]
    })
  }

  /** 输出分页符辅助线与文案命令。 */
  protected pushPageBreakCommands(
    commandList: IWorkerPaintCommand[],
    element: IRowElement,
    rowPosition: IElementPosition,
    alpha: number
  ) {
    const {
      scale,
      defaultRowMargin,
      pageBreak: { font, fontSize, lineDash },
      defaultColor
    } = this.draw.getRuntime().getOptions()
    const x = rowPosition.coordinate.leftTop[0]
    const y = rowPosition.coordinate.leftTop[1]
    const size = fontSize * scale
    const commandFont = `${size}px ${font}`
    const displayName =
      this.draw.getComponents().i18n.t('pageBreak.displayName') || 'Page Break'
    const textMeasure = this.measureTextMetrics(displayName, commandFont)
    const elementWidth = element.width! * scale
    const offsetY =
      this.draw.getDefaultBasicRowMarginHeight() * defaultRowMargin
    const halfX = (elementWidth - textMeasure.width) / 2
    const lineY = y + offsetY
    commandList.push({
      type: 'strokePath',
      segmentList: [
        {
          from: [x, lineY],
          to: [x + halfX, lineY]
        },
        {
          from: [x + halfX + textMeasure.width, lineY],
          to: [x + elementWidth, lineY]
        }
      ],
      strokeStyle: defaultColor,
      lineWidth: 1,
      alpha,
      translateY: 0.5,
      lineDash
    })
    commandList.push({
      type: 'fillText',
      text: displayName,
      x: x + halfX,
      y: y + textMeasure.actualBoundingBoxAscent - size / 2,
      font: commandFont,
      fillStyle: defaultColor,
      alpha
    })
  }
}
