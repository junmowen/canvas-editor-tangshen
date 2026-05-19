
import { ZERO } from '../../../dataset/constant/Common'
import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotInlineMediaCommands } from './PageRenderSnapshotInlineMediaCommands'

/** Inline checkbox and radio command generation. */
export abstract class PageRenderSnapshotInlineControlCommands extends PageRenderSnapshotInlineMediaCommands {
  protected pushCheckboxCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    element: IRowElement,
    rowPosition: IElementPosition,
    alpha: number
  ) {
    const {
      scale,
      checkbox: { gap, lineWidth, fillStyle, strokeStyle }
    } = this.draw.getRuntime().getOptions()
    const x = rowPosition.coordinate.leftTop[0]
    const y = rowPosition.coordinate.leftTop[1] + rowPosition.ascent
    const adjustedY = this.resolveControlY(row, element, y, 'checkbox')
    const left = Math.round(x + gap * scale)
    const top = Math.round(adjustedY - element.metrics.height + lineWidth)
    const width = element.metrics.width - gap * 2 * scale
    const height = element.metrics.height
    if (element.checkbox?.value) {
      commandList.push({
        type: 'strokeRect',
        rect: {
          x: left,
          y: top,
          width,
          height
        },
        strokeStyle: fillStyle,
        lineWidth,
        alpha,
        translateX: 0.5,
        translateY: 0.5
      })
      commandList.push({
        type: 'fillRect',
        rect: {
          x: left,
          y: top,
          width,
          height
        },
        fillStyle,
        alpha
      })
      commandList.push({
        type: 'strokePath',
        segmentList: [
          {
            from: [left + 2 * scale, top + height / 2],
            to: [left + width / 2, top + height - 3 * scale]
          },
          {
            from: [left + width / 2, top + height - 3 * scale],
            to: [left + width - 2 * scale, top + 3 * scale]
          }
        ],
        strokeStyle,
        lineWidth: lineWidth * 2 * scale,
        alpha,
        translateX: 0.5,
        translateY: 0.5
      })
      return
    }
    commandList.push({
      type: 'strokeRect',
      rect: {
        x: left,
        y: top,
        width,
        height
      },
      strokeStyle: fillStyle,
      lineWidth,
      alpha,
      translateX: 0.5,
      translateY: 0.5
    })
  }

  /** 输出单选框命令。 */
  protected pushRadioCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    element: IRowElement,
    rowPosition: IElementPosition,
    alpha: number
  ) {
    const {
      scale,
      radio: { gap, lineWidth, fillStyle, strokeStyle }
    } = this.draw.getRuntime().getOptions()
    const x = rowPosition.coordinate.leftTop[0]
    const y = rowPosition.coordinate.leftTop[1] + rowPosition.ascent
    const adjustedY = this.resolveControlY(row, element, y, 'radio')
    const left = Math.round(x + gap * scale)
    const top = Math.round(adjustedY - element.metrics.height + lineWidth)
    const width = element.metrics.width - gap * 2 * scale
    const height = element.metrics.height
    commandList.push({
      type: 'strokeCircle',
      x: left + width / 2,
      y: top + height / 2,
      radius: width / 2,
      strokeStyle: element.radio?.value ? fillStyle : strokeStyle,
      lineWidth,
      alpha,
      translateX: 0.5,
      translateY: 0.5
    })
    if (element.radio?.value) {
      commandList.push({
        type: 'fillCircle',
        x: left + width / 2,
        y: top + height / 2,
        radius: width / 3,
        fillStyle,
        alpha,
        translateX: 0.5,
        translateY: 0.5
      })
    }
  }

  /** 根据控件垂直对齐设置微调 y 坐标。 */
  protected resolveControlY(
    row: IDrawPagePayload['rowList'][number],
    element: IRowElement,
    y: number,
    type: 'checkbox' | 'radio'
  ): number {
    const verticalAlign = this.draw.getRuntime().getOptions()[type].verticalAlign
    if (
      verticalAlign !== VerticalAlign.TOP &&
      verticalAlign !== VerticalAlign.MIDDLE
    ) {
      return y
    }
    const index = row.elementList.indexOf(element)
    let nextIndex = index + 1
    let nextElement: IRowElement | null = null
    while (nextIndex < row.elementList.length) {
      const candidate = row.elementList[nextIndex]
      if (candidate.value !== ZERO && candidate.value !== '\u00A0') {
        nextElement = candidate
        break
      }
      nextIndex++
    }
    if (!nextElement) {
      return y
    }
    const textHeight =
      nextElement.metrics.boundingBoxAscent +
      nextElement.metrics.boundingBoxDescent
    if (textHeight <= element.metrics.height) {
      return y
    }
    if (verticalAlign === VerticalAlign.TOP) {
      return y - (nextElement.metrics.boundingBoxAscent - element.metrics.height)
    }
    return y - (textHeight - element.metrics.height) / 2
  }
}
