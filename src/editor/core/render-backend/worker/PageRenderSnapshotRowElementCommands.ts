import { EditorMode } from '../../../dataset/enum/Editor'
import { ZERO } from '../../../dataset/constant/Common'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { isCheckboxHitElement, isRadioHitElement } from '../../modules/control/hittest/ControlHitTest'
import { ElementType } from '../../../dataset/enum/Element'
import { isChartGraphicElement } from '../../modules/chart-graphics/layout/ChartGraphicElementLayout'
import { pushChartGraphicWorkerSnapshotCommands } from '../../modules/chart-graphics/render/ChartGraphicWorkerSnapshotPolicy'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../../modules/formula/debug/FormulaDebugLogger'
import { isFormulaTextElement } from '../../modules/formula/layout/FormulaTextElementLayout'
import { resolveFormulaDisplayText } from '../../modules/formula/model/FormulaTextModel'
import { isImageElement } from '../../modules/image/layout/InlineImageElementLayout'
import { isPageBreakElement } from '../../modules/page-break/layout/PageBreakElementLayout'
import { isTabElement } from '../../modules/paragraph/layout/TabElementLayout'
import { isSeparatorElement } from '../../modules/separator/layout/SeparatorElementLayout'
import { isTableElement } from '../../modules/table/layout/TableRowLayoutPolicy'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotListCommands } from './PageRenderSnapshotListCommands'

/** 行文本state契约，用于约束内部流程中传递的数据结构。 */
interface IRowTextState {
  /** 文本内容，用于剪贴板、输入或公式节点。 */
  text: string
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font: string
  /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
  fillStyle: string
}

/** 控件边框state契约，用于约束内部流程中传递的数据结构。 */
interface IControlBorderState {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/** push行元素command调用载荷，聚合执行该操作所需的输入数据。 */
interface IPushRowElementCommandPayload {
  /** 命令列表，保存需要按顺序执行的编辑命令。 */
  commandList: IWorkerPaintCommand[]
  textDecorationCommandList: IWorkerPaintCommand[]
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IDrawPagePayload['rowList'][number]
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IRowElement
  /** pre元素，用于定位或修改对应文档节点。 */
  preElement: IRowElement | undefined
  /** 行位置，用于描述布局或命中的空间范围。 */
  rowPosition: IElementPosition | undefined
  textState: IRowTextState
  controlBorderState: IControlBorderState
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha: number
}

/** Dispatches one row element to the matching worker command producer. */
export abstract class PageRenderSnapshotRowElementCommands extends PageRenderSnapshotListCommands {
  /** 写入行元素commands，追加后续渲染需要的命令数据。 */
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
    if (isChartGraphicElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        pushChartGraphicWorkerSnapshotCommands({
          commandList,
          element,
          rowPosition,
          alpha,
          scale: this.draw.getRuntime().getOptions().scale
        })
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (element.value === ZERO) {
      this.flushRowTextState(commandList, textState, alpha)
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (isSeparatorElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushSeparatorCommand(commandList, element, rowPosition)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (isPageBreakElement(element)) {
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
    if (isTabElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushBarTabStopCommand(commandList, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (isImageElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition && !this.isFloatingImage(element)) {
        this.pushImageCommand(commandList, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (isCheckboxHitElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushCheckboxCommands(commandList, row, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (isRadioHitElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      if (rowPosition) {
        this.pushRadioCommands(commandList, row, element, rowPosition, alpha)
      }
      this.recordDecoratedNonTextElement(payload)
      return
    }
    if (isTableElement(element)) {
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
    if (isFormulaTextElement(element)) {
      this.flushRowTextState(commandList, textState, alpha)
      this.pushFormulaTextCommand(payload)
      this.recordDecoratedNonTextElement(payload)
      return
    }
    this.pushTextElementCommand(payload)
  }

  /** 写入公式文本控件 command，确保 worker 渲染不再退化成普通 LaTeX 展示文本。 */
  private pushFormulaTextCommand(payload: IPushRowElementCommandPayload) {
    const { commandList, element, rowPosition, alpha } = payload
    if (!rowPosition) return
    const formulaRenderElement = {
      ...element,
      type: ElementType.TEXT
    }
    const { font, fillStyle } = this.resolveTextPaintStyle(formulaRenderElement)
    const latex = element.formula?.latex ?? element.value
    const displayText = resolveFormulaDisplayText(latex)
    const debug = isFormulaDebugEnabled()
    if (debug) {
      logFormulaDebug('worker-command', {
        id: element.id,
        latex,
        displayText,
        x: roundFormulaDebugNumber(rowPosition.coordinate.leftTop[0]),
        baselineY: roundFormulaDebugNumber(
          rowPosition.coordinate.leftTop[1] + rowPosition.ascent
        ),
        lineTop: roundFormulaDebugNumber(rowPosition.coordinate.leftTop[1]),
        lineBottom: roundFormulaDebugNumber(rowPosition.coordinate.leftBottom[1]),
        lineHeight: roundFormulaDebugNumber(rowPosition.lineHeight),
        metricsWidth: roundFormulaDebugNumber(element.metrics?.width),
        metricsHeight: roundFormulaDebugNumber(element.metrics?.height),
        metricsAscent: roundFormulaDebugNumber(
          element.metrics?.boundingBoxAscent
        ),
        metricsDescent: roundFormulaDebugNumber(
          element.metrics?.boundingBoxDescent
        ),
        font,
        fillStyle
      })
    }
    commandList.push({
      type: 'formulaText',
      latex,
      displayText,
      x: rowPosition.coordinate.leftTop[0],
      y: rowPosition.coordinate.leftTop[1] + rowPosition.ascent,
      font,
      defaultSize:
        element.actualSize ||
        element.size ||
        this.draw.getRuntime().getOptions().defaultSize,
      metricsWidth: element.metrics?.width,
      metricsAscent: element.metrics?.boundingBoxAscent,
      metricsDescent: element.metrics?.boundingBoxDescent,
      fillStyle,
      placeholderText: element.formula?.placeholderText,
      placeholderColor: element.formula?.placeholderColor,
      alpha,
      debug
    })
  }

  /** 记录decoratednon文本元素，把当前命中结果写入缓存或统计。 */
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
      !this.draw.getRuntime().getOptions().lineBreak.disabled &&
      this.draw.getMode() !== EditorMode.CLEAN &&
      this.draw.getMode() !== EditorMode.PRINT
    ) {
      this.pushSpaceMarkerCommands(commandList, element, rowPosition, alpha)
    }
  }

  /** 写入文本元素command，追加后续渲染需要的命令数据。 */
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
    const renderElement = element
    const { font: nextFont, fillStyle: nextFillStyle } =
      this.resolveTextPaintStyle(renderElement)
    if (!rowPosition) {
      this.flushRowTextState(commandList, textState, alpha)
      this.recordDecoratedNonTextElement(payload)
      return
    }
    const nextX = rowPosition.coordinate.leftTop[0]
    const nextY =
      rowPosition.coordinate.leftTop[1] +
      rowPosition.ascent +
      this.resolveInlineTextOffsetY(renderElement)
    const isStandaloneText =
      isFormulaTextElement(element) || this.shouldDrawStandaloneText(renderElement)
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
        renderElement.value,
        nextX,
        nextY,
        nextFont,
        nextFillStyle,
        alpha
      )
    } else {
      textState.text += renderElement.value
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
    if (
      rowPosition &&
      (element.value === ' ' || element.value === '\u00A0') &&
      !this.draw.getRuntime().getOptions().lineBreak.disabled &&
      this.draw.getMode() !== EditorMode.CLEAN &&
      this.draw.getMode() !== EditorMode.PRINT
    ) {
      this.pushSpaceMarkerCommands(commandList, element, rowPosition, alpha)
    }
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
