import { ZERO } from '../../../dataset/constant/Common'
import { WordBreak } from '../../../dataset/enum/Editor'
import { IComputeRowListPayload } from '../../../interface/Draw'
import { IRowElement } from '../../../interface/Row'
import { deleteSurroundElementList } from '../../../utils/elementLayout'
import { isFormulaTextElement } from '../../modules/formula/layout/FormulaTextElementLayout'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../../modules/formula/debug/FormulaDebugLogger'
import {
  consumeMinWidthControlLayout
} from '../../modules/control/layout/ControlRowLayoutPolicy'
import { isPageBreakElement } from '../../modules/page-break/layout/PageBreakElementLayout'
import { resolveRowLayoutCandidateWidth } from './RowLayoutCandidateWidthPolicy'
import { TableLayoutEngine } from '../../modules/table/layout/engine/TableLayoutEngine'
import type { Draw } from '../Draw'
import { InlineElementLayout } from './InlineElementLayout'
import {
  applyParagraphSpacing,
  resolveLineHeightMetrics
} from './RowLayoutMetricsPolicy'
import {
  applyRowOffset,
  createRowOffsetSnapshot,
  getRowAvailableWidth,
  restoreRowOffsetSnapshot
} from './RowLayoutOffsetPolicy'
import {
  createInitialListIndexState,
} from './RowLayoutStatePolicy'
import { resolveRowLayoutBreakDecision } from './RowLayoutBreakPolicy'
import {
  appendRowElementToCurrentRow,
  createInitialRowList,
  createWrappedRow,
  finalizeRowWidthState
} from './RowLayoutRowBuilder'
import { updateRowLayoutListIndex } from './RowLayoutListPolicy'

/**
 * 行布局引擎。
 *
 * 负责把元素列表测量并折算为行列表，是文本、控件与表格共用的核心布局入口。
 */
export class RowLayoutEngine {
  /** 行内元素布局器。 */
  private inlineElementLayout: InlineElementLayout
  /** 表格布局引擎。 */
  private tableLayoutEngine: TableLayoutEngine

  /** 初始化 RowLayoutEngine 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {
    this.inlineElementLayout = new InlineElementLayout(draw)
    this.tableLayoutEngine = new TableLayoutEngine(
      draw,
      this.computeRowList.bind(this)
    )
  }

  /** 获取表格布局引擎实例。 */
  public getTableLayoutEngine() {
    return this.tableLayoutEngine
  }

  /**
   * 计算元素列表对应的行布局结果。
   */
  public computeRowList(payload: IComputeRowListPayload) {
    const {
      innerWidth,
      elementList,
      isPagingPageMode = false,
      isFromTable = false,
      startX = 0,
      startY = 0,
      pageHeight = 0,
      mainOuterHeight = 0,
      startPageNo = 0,
      surroundElementList = [],
      sourceStartIndex = 0
    } = payload
    const {
      defaultSize,
      defaultRowMargin,
      scale,
      defaultTabWidth
    } = this.draw.getOptions()
    const defaultBasicRowMarginHeight =
      this.draw.getDefaultBasicRowMarginHeight()
    // 行布局测量同样复用后端的 MEASURE surface，减少临时 canvas 申请。
    const ctx = this.draw.getPageCanvasHost().getMeasureContext()
    const listStyleMap = this.draw.getListParticle().computeListStyle(
      ctx,
      elementList
    )
    const rowList = createInitialRowList(elementList)

    let x = startX
    let y = startY
    let pageNo = 0
    let currentMainOuterHeight = mainOuterHeight
    let listIndex = 0
    const initialListState = createInitialListIndexState({
      draw: this.draw,
      elementList,
      sourceStartIndex,
      isFromTable
    })
    let listId = initialListState.listId
    const listIndexMap = initialListState.listIndexMap
    let controlRealWidth = 0
    const rowElementRect = { x: 0, y: 0, width: 0, height: 0 }

    for (let i = 0; i < elementList.length; i++) {
      const curRow = rowList[rowList.length - 1]
      const element = elementList[i]
      const listStyleKey = this.draw.getListParticle().getListStyleKey(element)
      const rowMargin =
        defaultBasicRowMarginHeight * (element.rowMargin ?? defaultRowMargin)
      const isParagraphFirstContentElement =
        (curRow.elementList.length === 0 && curRow.startIndex === i) ||
        (curRow.elementList.length === 1 &&
          curRow.elementList[0]?.value === ZERO &&
          curRow.startIndex === i - 1)
      const listStyleOffsetX = listStyleKey
        ? listStyleMap.get(listStyleKey) || 0
        : 0
      const curRowOffsetSnapshot = createRowOffsetSnapshot(curRow)
      applyRowOffset({
        row: curRow,
        element,
        isParagraphFirstContentElement,
        listStyleOffsetX,
        scale
      })
      const availableWidth = getRowAvailableWidth({
        draw: this.draw,
        innerWidth,
        row: curRow,
        pageNo: startPageNo + pageNo
      })
      const isStartElement = curRow.elementList.length === 1

      // 首元素需要先吸收行级 offsetY，再继续做统一测量。
      y += isStartElement ? curRow.offsetY || 0 : 0

      // 表格与普通行内元素统一在这里完成测量，避免后续行布局逻辑分叉。
      const metrics =
        this.tableLayoutEngine.measureIfTable({
          element,
          elementList,
          index: i,
          rowMargin,
          isPagingPageMode,
          scale,
          availableWidth,
          tdPadding: this.draw.getOptions().table.tdPadding
        }) ||
        this.inlineElementLayout.measure({
          ctx,
          element,
          elementList,
          index: i,
          rowList,
          availableWidth,
          rowMargin,
          scale,
          defaultSize,
          defaultTabWidth
        })

      const lineHeightMetrics = resolveLineHeightMetrics({
        element,
        metrics,
        rowMargin,
        scale
      })
      const ascent = lineHeightMetrics.ascent
      const height = lineHeightMetrics.height
      
      const rowElement = element as IRowElement
      rowElement.metrics = metrics
      rowElement.left = 0
      rowElement.style = this.draw.getElementFont(element, scale)

      controlRealWidth = consumeMinWidthControlLayout({
        draw: this.draw,
        row: curRow,
        rowElement,
        availableWidth,
        controlRealWidth
      })

      const preElement = elementList[i - 1]
      let curRowWidth = curRow.width + metrics.width

      const isCodeblockElement =
        element.extension === 'codeblock' ||
        (typeof element.extension === 'object' &&
          element.extension !== null &&
          /** codeblock开关，用于控制当前流程的判断分支。 */
          (element.extension as { codeblock?: boolean }).codeblock === true)
      const wordBreak = isCodeblockElement
        ? WordBreak.BREAK_ALL
        : this.draw.getOptions().wordBreak

      const candidateWidth = resolveRowLayoutCandidateWidth({
        draw: this.draw,
        ctx,
        elementList,
        index: i,
        element,
        preElement,
        curRow,
        baseCurRowWidth: curRowWidth,
        metricsWidth: metrics.width,
        availableWidth,
        scale,
        wordBreak
      })
      curRowWidth = candidateWidth.curRowWidth
      const cjkLatinSpacing = candidateWidth.cjkLatinSpacing

      const nextListState = updateRowLayoutListIndex({
        element,
        currentListId: listId,
        listIndex,
        listIndexMap
      })
      listId = nextListState.listId
      listIndex = nextListState.listIndex

      rowElementRect.x = x
      rowElementRect.y = y
      rowElementRect.width = metrics.width
      rowElementRect.height = height

      const surroundPosition = this.draw.getCoordinate().setSurroundPosition({
        pageNo,
        rowElement,
        row: curRow,
        rowElementRect,
        availableWidth,
        surroundElementList
      })
      x = surroundPosition.x
      curRowWidth += surroundPosition.rowIncreaseWidth
      x += metrics.width

      const breakDecision = resolveRowLayoutBreakDecision({
        draw: this.draw,
        elementList,
        index: i,
        element,
        preElement,
        curRow,
        curRowWidth,
        availableWidth,
        isFromTable,
        wordBreak
      })
      const {
        shouldBreakAtFormulaBoundary,
        isForceBreak,
        isWidthNotEnough,
        isWrap
      } = breakDecision
      if (
        isFormulaDebugEnabled() &&
        (isFormulaTextElement(element) || isFormulaTextElement(preElement))
      ) {
        logFormulaDebug('row-layout-decision', {
          index: i,
          elementId: element.id,
          elementType: element.type,
          elementValue: element.value,
          elementLatex: element.formula?.latex,
          preElementId: preElement?.id,
          preElementType: preElement?.type,
          preElementValue: preElement?.value,
          preElementLatex: preElement?.formula?.latex,
          curRowStartIndex: curRow.startIndex,
          curRowElementCount: curRow.elementList.length,
          curRowWidthBefore: roundFormulaDebugNumber(curRow.width),
          curRowWidthWithElement: roundFormulaDebugNumber(curRowWidth),
          availableWidth: roundFormulaDebugNumber(availableWidth),
          x: roundFormulaDebugNumber(x),
          y: roundFormulaDebugNumber(y),
          metricsWidth: roundFormulaDebugNumber(metrics.width),
          metricsHeight: roundFormulaDebugNumber(metrics.height),
          rowHeight: roundFormulaDebugNumber(height),
          ascent: roundFormulaDebugNumber(ascent),
          shouldBreakAtFormulaBoundary,
          isForceBreak,
          isWidthNotEnough,
          isWrap
        })
      }

      if (isWrap) {
        restoreRowOffsetSnapshot(curRow, curRowOffsetSnapshot)
        const row = createWrappedRow({
          draw: this.draw,
          curRow,
          rowElement,
          element,
          elementList,
          elementIndex: i,
          metricsWidth: metrics.width,
          height,
          ascent,
          listStyleOffsetX,
          listIndex,
          scale,
          isFromTable
        })
        rowList.push(row)
      } else {
        appendRowElementToCurrentRow({
          row: curRow,
          rowElement,
          elementList,
          elementIndex: i,
          metricsWidth: metrics.width,
          height,
          ascent,
          cjkLatinSpacing,
          defaultBasicRowMarginHeight
        })
      }

      if (isWrap || i === elementList.length - 1) {
        finalizeRowWidthState({
          row: curRow,
          preElement,
          availableWidth,
          isWidthNotEnough,
          isForceBreak
        })
      }

      if (isWrap) {
        x = startX
        y += curRow.height
        if (
          isPagingPageMode &&
          !isFromTable &&
          pageHeight &&
          (y - startY + currentMainOuterHeight + height > pageHeight ||
            isPageBreakElement(element))
        ) {
          y = startY
          deleteSurroundElementList(surroundElementList, pageNo)
          pageNo += 1
          // 分页测量进入下一页时同步切换真实页码高度，避免镜像页边距或装订线仍沿用首页。
          currentMainOuterHeight = this.draw.getMainOuterHeight(
            startPageNo + pageNo
          )
        }
        rowElement.left = 0
        const nextRow = rowList[rowList.length - 1]

        rowElementRect.x = x
        rowElementRect.y = y
        rowElementRect.width = metrics.width
        rowElementRect.height = height
        const nextRowAvailableWidth = getRowAvailableWidth({
          draw: this.draw,
          innerWidth,
          row: nextRow,
          pageNo: startPageNo + pageNo
        })
        const surroundPosition = this.draw.getCoordinate().setSurroundPosition({
          pageNo,
          rowElement,
          row: nextRow,
          rowElementRect,
          availableWidth: nextRowAvailableWidth,
          surroundElementList
        })
        x = surroundPosition.x
        x += metrics.width
      }
    }
    applyParagraphSpacing(rowList, scale)
    return rowList
  }

}
