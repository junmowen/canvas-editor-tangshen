
import { TEXTLIKE_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { METRICS_BASIS_TEXT } from '../../../dataset/constant/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { TextDecorationStyle } from '../../../dataset/enum/Text'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import {
  IWorkerPaintCommand,
  IWorkerStrokeSegment
} from './WorkerRenderProtocol'
import { PageRenderSnapshotRowBackgroundCommands } from './PageRenderSnapshotRowBackgroundCommands'

/** Underline, wavy underline and strikeout command generation. */
export abstract class PageRenderSnapshotTextDecorationCommands extends PageRenderSnapshotRowBackgroundCommands {
  protected pushTextDecorationCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    element: IRowElement,
    rowPosition: IElementPosition | undefined,
    alpha: number
  ) {
    if (!rowPosition) return
    const {
      coordinate: {
        leftTop: [x, y]
      },
      ascent: offsetY
    } = rowPosition
    const metrics = element.metrics
    const isHyperlinkDefaultUnderline =
      element.type === ElementType.HYPERLINK && element.underline !== false
    if (
      element.underline ||
      element.control?.underline ||
      isHyperlinkDefaultUnderline
    ) {
      const rowMargin =
        this.draw.getServices().metricsService.getElementRowMargin(element)
      const offsetLineX = element.left || 0
      const offsetLineY =
        element.type === ElementType.SUBSCRIPT
          ? this.resolveInlineTextOffsetY(element)
          : 0
      const underlineColor = element.control?.underline
        ? this.draw.getRuntime().getOptions().underlineColor
        : this.resolveTextPaintStyle(element).fillStyle
      this.pushUnderlineCommands(
        commandList,
        x - offsetLineX,
        y + row.height - rowMargin + offsetLineY,
        metrics.width + offsetLineX,
        underlineColor,
        element.textDecoration?.style,
        alpha
      )
    }
    if (
      element.strikeout &&
      (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type))
    ) {
      const { scale, strikeoutColor } = this.draw.getRuntime().getOptions()
      const standardMetrics = this.measureTextMetrics(
        METRICS_BASIS_TEXT,
        this.draw.getElementFont(element)
      )
      const strikeY =
        y +
        offsetY +
        standardMetrics.actualBoundingBoxDescent * scale -
        metrics.height / 2 +
        this.resolveInlineTextOffsetY(element) +
        0.5
      commandList.push({
        type: 'strokePath',
        segmentList: [
          {
            from: [x, strikeY],
            to: [x + metrics.width, strikeY]
          }
        ],
        strokeStyle: strikeoutColor,
        lineWidth: scale,
        alpha
      })
    }
  }

  /** 输出不同样式的下划线命令。 */
  protected pushUnderlineCommands(
    commandList: IWorkerPaintCommand[],
    x: number,
    y: number,
    width: number,
    color: string | undefined,
    style: TextDecorationStyle | undefined,
    alpha: number
  ) {
    if (width <= 0) return
    const { scale, underlineColor } = this.draw.getRuntime().getOptions()
    const lineY = Math.floor(y + 2 * scale) + 0.5
    const strokeStyle = color || underlineColor
    if (style === TextDecorationStyle.WAVY) {
      commandList.push({
        type: 'strokePath',
        segmentList: this.createWavyUnderlineSegments(x, lineY, width),
        strokeStyle,
        lineWidth: scale,
        alpha
      })
      return
    }
    const segmentList: IWorkerStrokeSegment[] = [
      {
        from: [x, lineY],
        to: [x + width, lineY]
      }
    ]
    if (style === TextDecorationStyle.DOUBLE) {
      segmentList.push({
        from: [x, lineY + 3 * scale],
        to: [x + width, lineY + 3 * scale]
      })
    }
    commandList.push({
      type: 'strokePath',
      segmentList,
      strokeStyle,
      lineWidth: scale,
      alpha,
      lineDash:
        style === TextDecorationStyle.DASHED
          ? [3, 1]
          : style === TextDecorationStyle.DOTTED
            ? [1, 1]
            : undefined
    })
  }

  /** 生成波浪下划线的折线段。 */
  protected createWavyUnderlineSegments(
    startX: number,
    startY: number,
    width: number
  ): IWorkerStrokeSegment[] {
    const { scale } = this.draw.getRuntime().getOptions()
    const amplitude = 1.2 * scale
    const frequency = 1 / scale
    const baselineY = startY + 2 * amplitude
    const segmentList: IWorkerStrokeSegment[] = []
    const end = Math.max(1, Math.ceil(width))
    let prevPoint: [number, number] = [startX, baselineY]
    for (let i = 1; i <= end; i++) {
      const point: [number, number] = [
        startX + Math.min(i, width),
        baselineY + amplitude * Math.sin(frequency * i)
      ]
      segmentList.push({
        from: prevPoint,
        to: point
      })
      prevPoint = point
    }
    return segmentList
  }
}
