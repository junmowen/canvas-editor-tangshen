
import { EditorMode } from '../../../dataset/enum/Editor'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElementPosition } from '../../../interface/Element'
import {
  resolveWorkerSnapshotFloatingImageRect,
  type TWorkerSnapshotImageLayer
} from '../../modules/image/render/WorkerSnapshotImageRenderPolicy'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotRowElementCommands } from './PageRenderSnapshotRowElementCommands'

/** Main body row command orchestration. */
export abstract class PageRenderSnapshotRowCommands extends PageRenderSnapshotRowElementCommands {
  protected buildMainTextCommands(payload: IDrawPagePayload): IWorkerPaintCommand[] {
    const commandList: IWorkerPaintCommand[] = []
    const pagePositionList =
      this.draw.getCoordinate().getMainPositionListByPage(payload.pageNo)
    this.buildRowTextCommands(
      commandList,
      payload.rowList,
      pagePositionList,
      1,
      {
        drawLineBreak: !this.draw.getRuntime().getOptions().lineBreak.disabled
      }
    )
    return commandList
  }

  protected buildRowTextCommands(
    commandList: IWorkerPaintCommand[],
    rowList: IDrawPagePayload['rowList'],
    positionList: IElementPosition[],
    alpha: number,
    options: {
      /** 绘制行break开关，用于控制当前流程的判断分支。 */
      drawLineBreak?: boolean
    } = {}
  ) {
    const shouldDrawLineBreak =
      options.drawLineBreak !== false &&
      this.draw.getMode() !== EditorMode.CLEAN &&
      this.draw.getMode() !== EditorMode.PRINT
    let rowPositionOffset = 0
    for (let i = 0; i < rowList.length; i++) {
      const row = rowList[i]
      const rowPositionList = positionList.slice(
        rowPositionOffset,
        rowPositionOffset + row.elementList.length
      )
      rowPositionOffset += row.elementList.length
      if (row.tableFragment) {
        this.pushTableFragmentCellTopBorderCommands(
          commandList,
          row,
          rowPositionList,
          alpha
        )
      }
      this.pushRowHighlightCommands(commandList, row, rowPositionList, alpha)
      const textDecorationCommandList: IWorkerPaintCommand[] = []
      const groupCommandList: IWorkerPaintCommand[] = []
      const textState = {
        text: '',
        x: 0,
        y: 0,
        font: '',
        fillStyle: ''
      }
      const rowStartPosition = rowPositionList[0]
      const controlBorderState = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
      for (let j = 0; j < row.elementList.length; j++) {
        const element = row.elementList[j]
        const preElement = row.elementList[j - 1]
        const rowPosition = rowPositionList[j]
        this.pushRowElementCommands({
            commandList,
            textDecorationCommandList,
            row,
            element,
            preElement,
            rowPosition,
            textState,
            controlBorderState,
            alpha
          })
      }
      this.flushRowTextState(commandList, textState, alpha)
      this.flushControlBorderCommand(commandList, controlBorderState, alpha)
      if (shouldDrawLineBreak) {
        this.pushLineBreakCommands(commandList, row, rowPositionList, alpha)
      }
      if (row.isList && rowStartPosition) {
        this.pushListMarkerCommands(commandList, row, rowStartPosition, alpha)
      }
      commandList.push(...textDecorationCommandList)
      this.pushRowGroupCommands(groupCommandList, row, rowPositionList, alpha)
      commandList.push(...groupCommandList)
    }
  }


  protected buildFloatingImageCommands(
    pageNo: number,
    imageLayerList: TWorkerSnapshotImageLayer[]
  ): IWorkerPaintCommand[] {
    const { scale } = this.draw.getRuntime().getOptions()
    const commandList: IWorkerPaintCommand[] = []
    const floatPositionList = this.draw.getCoordinate().getFloatPositionList()
    for (let i = 0; i < floatPositionList.length; i++) {
      const floatPosition = floatPositionList[i]
      const element = floatPosition.element
      const rect = resolveWorkerSnapshotFloatingImageRect({
        pageNo,
        floatPosition,
        imageLayerList,
        scale
      })
      if (rect) {
        commandList.push({
          type: 'drawImage',
          src: element.value,
          rect
        })
      }
    }
    return commandList
  }
}
