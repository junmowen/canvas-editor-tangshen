import { ElementType } from '../../../dataset/enum/Element'
import { EditorMode } from '../../../dataset/enum/Editor'
import { ControlComponent } from '../../../dataset/enum/Control'
import { ZERO } from '../../../dataset/constant/Common'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotInlineCommands } from './PageRenderSnapshotInlineCommands'

interface IRowTextState {
  text: string
  x: number
  y: number
  font: string
  fillStyle: string
}

interface IControlBorderState {
  x: number
  y: number
  width: number
  height: number
}

interface IPushRowElementCommandPayload {
  commandList: IWorkerPaintCommand[]
  textDecorationCommandList: IWorkerPaintCommand[]
  row: IDrawPagePayload['rowList'][number]
  element: IRowElement
  preElement: IRowElement | undefined
  rowPosition: IElementPosition | undefined
  textState: IRowTextState
  controlBorderState: IControlBorderState
  alpha: number
}

/** Dispatches one row element to the matching worker command producer. */
export abstract class PageRenderSnapshotRowElementCommands extends PageRenderSnapshotInlineCommands {
  protected pushRowElementCommands(payload: IPushRowElementCommandPayload) {
    const {
      commandList,
      row,
      element,
      preElement,
      rowPosition,
      textState,
      controlBorderState,
      alpha
    } = payload
    if (this.shouldSkipHiddenElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      this.recordControlBorderCommand(
        commandList,
        controlBorderState,
        row,
        element,
        preElement,
        rowPosition,
        alpha
      )
      return
    }
    if (element.value === ZERO) {
      this.flushRowTextState(commandList, textState, alpha)
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (element.type === ElementType.SEPARATOR) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushSeparatorCommand(commandList, element, rowPosition)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (element.type === ElementType.PAGE_BREAK) {
      this.flushRowTextState(commandList, textState, alpha)
      if (
        rowPosition &&
        this.draw.getMode() !== EditorMode.CLEAN &&
        this.draw.getMode() !== EditorMode.PRINT
      ) {
        this.pushPageBreakCommands(commandList, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (element.type === ElementType.TAB) {
      this.flushRowTextState(commandList, textState, alpha)
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (element.type === ElementType.IMAGE) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition && !this.isFloatingImage(element)) {
        this.pushImageCommand(commandList, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (element.type === ElementType.LATEX) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushLaTexCommand(commandList, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (
      element.type === ElementType.CHECKBOX ||
      element.controlComponent === ControlComponent.CHECKBOX
    ) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushCheckboxCommands(commandList, row, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (
      element.type === ElementType.RADIO ||
      element.controlComponent === ControlComponent.RADIO
    ) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushRadioCommands(commandList, row, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (element.type === ElementType.TABLE) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushTableCommands(
          commandList,
          (row.tableFragment || element) as IElement | ITableFragmentDescriptor,
          rowPosition,
          alpha
        )
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    this.pushTextElementCommand(payload)
  }

  private recordDecoratedNonTextElement(payload: IPushRowElementCommandPayload) {
    const {
      commandList,
      textDecorationCommandList,
      row,
      element,
      preElement,
      rowPosition,
      controlBorderState,
      alpha
    } = payload
    this.recordControlBorderCommand(
      commandList,
      controlBorderState,
      row,
      element,
      preElement,
      rowPosition,
      alpha
    )
    this.pushTextDecorationCommands(
      textDecorationCommandList,
      row,
      element,
      rowPosition,
      alpha
    )
    if (
      rowPosition &&
      (element.value === ' ' || element.value === '\u00A0') &&
      this.draw.getMode() !== EditorMode.CLEAN &&
      this.draw.getMode() !== EditorMode.PRINT
    ) {
      this.pushSpaceMarkerCommands(commandList, element, rowPosition, alpha)
    }
  }

  private pushTextElementCommand(payload: IPushRowElementCommandPayload) {
    const {
      commandList,
      textDecorationCommandList,
      row,
      element,
      preElement,
      rowPosition,
      textState,
      controlBorderState,
      alpha
    } = payload
    const { font: nextFont, fillStyle: nextFillStyle } =
      this.resolveTextPaintStyle(element)
    if (!rowPosition) {
      this.flushRowTextState(commandList, textState, alpha)
      this.recordDecoratedNonTextElement(payload)
      return
    }
    const nextX = rowPosition.coordinate.leftTop[0]
    const nextY =
      rowPosition.coordinate.leftTop[1] +
      rowPosition.ascent +
      this.resolveInlineTextOffsetY(element)
    const isStandaloneText = this.shouldDrawStandaloneText(element)
    if (!textState.text) {
      textState.x = nextX
      textState.y = nextY
      textState.font = nextFont
      textState.fillStyle = nextFillStyle
    } else if (
      isStandaloneText ||
      nextFont !== textState.font ||
      nextFillStyle !== textState.fillStyle ||
      nextY !== textState.y
    ) {
      this.flushRowTextState(commandList, textState, alpha)
      textState.x = nextX
      textState.y = nextY
      textState.font = nextFont
      textState.fillStyle = nextFillStyle
    }
    if (isStandaloneText) {
      this.flushTextCommand(
        commandList,
        element.value,
        nextX,
        nextY,
        nextFont,
        nextFillStyle,
        alpha
      )
    } else {
      textState.text += element.value
    }
    this.recordControlBorderCommand(
      commandList,
      controlBorderState,
      row,
      element,
      preElement,
      rowPosition,
      alpha
    )
    this.pushTextDecorationCommands(
      textDecorationCommandList,
      row,
      element,
      rowPosition,
      alpha
    )
  }

  protected flushRowTextState(
    commandList: IWorkerPaintCommand[],
    textState: IRowTextState,
    alpha: number
  ) {
    this.flushTextCommand(
      commandList,
      textState.text,
      textState.x,
      textState.y,
      textState.font,
      textState.fillStyle,
      alpha
    )
    textState.text = ''
  }
}
