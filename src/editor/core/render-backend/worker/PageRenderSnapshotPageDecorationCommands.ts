
import { EditorMode } from '../../../dataset/enum/Editor'
import { LineNumberType } from '../../../dataset/enum/LineNumber'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotAreaCommands } from './PageRenderSnapshotAreaCommands'

/** Page margin, line number, page border and badge commands. */
export abstract class PageRenderSnapshotPageDecorationCommands extends PageRenderSnapshotAreaCommands {
  protected buildMarginCommands(pageNo = 0): IWorkerPaintCommand[] {
    if (this.draw.getMode() === EditorMode.PRINT) return []
    const options = this.draw.getRuntime().getOptions()
    const marginIndicatorSize =
      this.draw.getServices().metricsService.getMarginIndicatorSize()
    // Worker 快照和主线程 Canvas2D 使用同一页码边距，保证镜像页边距/装订线下四角指示器一致。
    const margins = this.draw.getMargins(pageNo)
    const width = this.draw.getWidth()
    const height = this.draw.getHeight()
    // 初始化 left Top Point 列表。
    const leftTopPoint: [number, number] = [margins[3], margins[0]]
    // 初始化 right Top Point 列表。
    const rightTopPoint: [number, number] = [width - margins[1], margins[0]]
    // 初始化 left Bottom Point 列表。
    const leftBottomPoint: [number, number] = [margins[3], height - margins[2]]
    // 初始化 right Bottom Point 列表。
    const rightBottomPoint: [number, number] = [
      width - margins[1],
      height - margins[2]
    ]
    return [
      {
        type: 'strokePath',
        strokeStyle: options.marginIndicatorColor,
        lineWidth: 1,
        translateX: 0.5,
        translateY: 0.5,
        segmentList: [
          {
            from: [leftTopPoint[0] - marginIndicatorSize, leftTopPoint[1]],
            to: leftTopPoint
          },
          {
            from: leftTopPoint,
            to: [leftTopPoint[0], leftTopPoint[1] - marginIndicatorSize]
          },
          {
            from: [rightTopPoint[0] + marginIndicatorSize, rightTopPoint[1]],
            to: rightTopPoint
          },
          {
            from: rightTopPoint,
            to: [rightTopPoint[0], rightTopPoint[1] - marginIndicatorSize]
          },
          {
            from: [leftBottomPoint[0] - marginIndicatorSize, leftBottomPoint[1]],
            to: leftBottomPoint
          },
          {
            from: leftBottomPoint,
            to: [leftBottomPoint[0], leftBottomPoint[1] + marginIndicatorSize]
          },
          {
            from: [
              rightBottomPoint[0] + marginIndicatorSize,
              rightBottomPoint[1]
            ],
            to: rightBottomPoint
          },
          {
            from: rightBottomPoint,
            to: [rightBottomPoint[0], rightBottomPoint[1] + marginIndicatorSize]
          }
        ]
      }
    ]
  }

  /** 生成行号命令。 */
  protected buildLineNumberCommands(
    payload: IDrawPagePayload
  ): IWorkerPaintCommand[] {
    const options = this.draw.getRuntime().getOptions()
    if (options.lineNumber.disabled) return []
    const {
      scale,
      lineNumber: { color, size, font, right, type }
    } = options
    const commandList: IWorkerPaintCommand[] = []
    const pagePositionList =
      this.draw.getCoordinate().getMainPositionListByPage(payload.pageNo)
    const commandFont = `${size * scale}px ${font}`
    let rowPositionOffset = 0
    for (let i = 0; i < payload.rowList.length; i++) {
      const row = payload.rowList[i]
      const rowPosition = pagePositionList[rowPositionOffset]
      rowPositionOffset += row.elementList.length
      if (!rowPosition) continue
      const seq = type === LineNumberType.PAGE ? i + 1 : row.rowIndex + 1
      const text = `${seq}`
      const metrics = this.measureTextMetrics(text, commandFont)
      // 行号位置跟随当前页左边距，worker 快照和主线程绘制保持一致。
      const x =
        this.draw.getMargins(payload.pageNo)[3] -
        (metrics.width + right) * scale
      const y =
        rowPosition.coordinate.leftBottom[1] -
        metrics.actualBoundingBoxAscent * scale
      commandList.push({
        type: 'fillText',
        text,
        x,
        y,
        font: commandFont,
        fillStyle: color
      })
    }
    return commandList
  }

  /** 生成页边框命令。 */
  protected buildPageBorderCommands(pageNo = 0): IWorkerPaintCommand[] {
    const options = this.draw.getRuntime().getOptions()
    if (options.pageBorder.disabled) return []
    const {
      scale,
      pageBorder: { color, lineWidth, padding }
    } = options
    // 页边框按目标页读取镜像页边距和装订线，避免非当前页快照横向错位。
    const margins = this.draw.getMargins(pageNo)
    const x = margins[3] - padding[3] * scale
    const y =
      margins[0] +
      this.draw.getHeader().getExtraHeight() -
      padding[0] * scale
    const width =
      this.draw.getInnerWidth(pageNo) + (padding[1] + padding[3]) * scale
    const height =
      this.draw.getHeight() -
      y -
      this.draw.getFooter().getExtraHeight() -
      margins[2] +
      padding[2] * scale
    return [
      {
        type: 'strokeRect',
        rect: {
          x,
          y,
          width,
          height
        },
        strokeStyle: color,
        lineWidth: lineWidth * scale,
        translateX: 0.5,
        translateY: 0.5
      }
    ]
  }


  protected buildBadgeCommands(payload: IDrawPagePayload): IWorkerPaintCommand[] {
    return this.draw.getBadge().getRenderableBadgeList(payload.pageNo).map(item => ({
      type: 'drawImage',
      src: item.value,
      rect: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
      }
    }))
  }
}
