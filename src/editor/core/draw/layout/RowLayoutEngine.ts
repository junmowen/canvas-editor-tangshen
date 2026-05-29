import { PUNCTUATION_LIST, ZERO } from '../../../dataset/constant/Common'
import { WordBreak } from '../../../dataset/enum/Editor'
import { IComputeRowListPayload } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { deleteSurroundElementList } from '../../../utils/element'
import { isBlockElement } from '../../modules/block/layout/BlockElementLayout'
import { shouldBreakBeforeColumnCheckable } from '../../modules/control/layout/CheckableControlElementLayout'
import {
  consumeMinWidthControlLayout,
  resolveValueStartIndentOffset
} from '../../modules/control/layout/ControlRowLayoutPolicy'
import { isInlineImageElement } from '../../modules/image/layout/InlineImageElementLayout'
import { shouldUseImageOffset } from '../../modules/image/position/ImagePositionPolicy'
import { isPageBreakElement } from '../../modules/page-break/layout/PageBreakElementLayout'
import {
  isPlainTextElement,
  shouldApplyRowFlexSpacing,
  shouldBreakAtZeroParagraphElement
} from '../../modules/paragraph/layout/ParagraphRowLayoutPolicy'
import { isSeparatorElement } from '../../modules/separator/layout/SeparatorElementLayout'
import { TableLayoutEngine } from '../../modules/table/layout/engine/TableLayoutEngine'
import {
  isInlineTableElement,
  shouldBreakAtTableBoundary
} from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'
import { InlineElementLayout } from './InlineElementLayout'

/** 行偏移snapshot类型，用于约束内部流程中传递的数据结构。 */
type IRowOffsetSnapshot = Pick<
  IRow,
  'offsetX' | 'rowFlexOffsetX' | 'rightOffsetX' | 'isList' | 'listIndex'
>

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
    const rowList = this.createInitialRowList(elementList)

    let x = startX
    let y = startY
    let pageNo = 0
    let listIndex = 0
    const initialListState = this.createInitialListIndexState({
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
      const curRowOffsetSnapshot = this.createRowOffsetSnapshot(curRow)
      this.applyRowOffset({
        row: curRow,
        element,
        isParagraphFirstContentElement,
        listStyleOffsetX,
        scale
      })
      const availableWidth = this.getRowAvailableWidth(innerWidth, curRow)
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
          tdPadding: this.draw.getOptions().table.tdPadding
        }) ||
        this.inlineElementLayout.measure({
          ctx,
          element,
          rowList,
          availableWidth,
          rowMargin,
          scale,
          defaultSize,
          defaultTabWidth
        })

      const ascent =
        shouldUseImageOffset(element)
          ? metrics.height + rowMargin
          : metrics.boundingBoxAscent + rowMargin
      const height =
        rowMargin +
        metrics.boundingBoxAscent +
        metrics.boundingBoxDescent +
        rowMargin
      
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
      const isInlineTable = isInlineTableElement(element)
      const isPreInlineTable = isInlineTableElement(preElement)

      const isCodeblockElement =
        element.extension === 'codeblock' ||
        (typeof element.extension === 'object' &&
          element.extension !== null &&
          /** codeblock开关，用于控制当前流程的判断分支。 */
          (element.extension as { codeblock?: boolean }).codeblock === true)
      const wordBreak = isCodeblockElement
        ? WordBreak.BREAK_ALL
        : this.draw.getOptions().wordBreak

      if (wordBreak === WordBreak.BREAK_WORD) {
        if (
          isPlainTextElement(preElement) &&
          isPlainTextElement(element)
        ) {
          const word = `${preElement?.value || ''}${element.value}`
          if (this.draw.getWordLikeReg().test(word)) {
            const { width } = this.draw
              .getTextParticle()
              .measureWord(ctx, elementList, i)
            const wordWidth = width * scale
            if (wordWidth <= availableWidth) {
              curRowWidth += wordWidth
            }
          }
        }
      }

      if (element.listId) {
        if (element.listId !== listId) {
          listIndexMap.clear()
        }
        if (element.value === ZERO && !element.listWrap) {
          const level = element.listLevel || 0
          const indexKey = `${element.listId}:${level}`
          listIndex = listIndexMap.get(indexKey) || 0
          listIndexMap.set(indexKey, listIndex + 1)
          for (const key of [...listIndexMap.keys()]) {
            const [, keyLevel] = key.split(':')
            if (Number(keyLevel) > level) {
              listIndexMap.delete(key)
            }
          }
        }
      }
      listId = element.listId

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

      const isForceBreak =
        isSeparatorElement(element) ||
        shouldBreakAtTableBoundary({
          element,
          preElement,
          isInlineTable,
          isPreInlineTable
        }) ||
        isBlockElement(preElement) ||
        isBlockElement(element) ||
        isInlineImageElement(preElement) ||
        isInlineImageElement(element) ||
        preElement?.listId !== element.listId ||
        (preElement?.areaId !== element.areaId && !element.area?.hide) ||
        shouldBreakBeforeColumnCheckable({ element, preElement }) ||
        (i !== 0 && shouldBreakAtZeroParagraphElement(element))
      const isHangingPunctuation =
        !isFromTable &&
        wordBreak === WordBreak.BREAK_WORD &&
        PUNCTUATION_LIST.includes(element.value) &&
        curRow.width <= availableWidth
      const isWidthNotEnough =
        curRowWidth > availableWidth && !isHangingPunctuation
      const isWrap = isForceBreak || isWidthNotEnough

      if (isWrap) {
        this.restoreRowOffsetSnapshot(curRow, curRowOffsetSnapshot)
        const row: IRow = {
          width: metrics.width,
          height,
          startIndex: i,
          elementList: [rowElement],
          ascent,
          rowIndex: curRow.rowIndex + 1,
          rowFlex: elementList[i]?.rowFlex || elementList[i + 1]?.rowFlex,
          isPageBreak: isPageBreakElement(element)
        }
        this.applyWrappedRowOffset({
          row,
          element,
          listStyleOffsetX,
          scale
        })

        const valueStartOffsetX = resolveValueStartIndentOffset({
          draw: this.draw,
          row: curRow,
          rowElement
        })
        if (valueStartOffsetX !== null) {
          row.offsetX = valueStartOffsetX
        }

        if (element.listId) {
          row.isList = true
          row.offsetX = listStyleOffsetX
          row.rowFlexOffsetX = listStyleOffsetX
          row.listIndex = listIndex
        }

        row.offsetY =
          !isFromTable &&
          element.area?.top &&
          element.areaId !== elementList[i - 1]?.areaId
            ? element.area.top * scale
            : 0
        rowList.push(row)
      } else {
        curRow.width += metrics.width
        if (
          i === 0 &&
          (isBlockElement(elementList[1]) || !!elementList[1]?.areaId)
        ) {
          curRow.height = defaultBasicRowMarginHeight
          curRow.ascent = defaultBasicRowMarginHeight
        } else if (curRow.height < height) {
          curRow.height = height
          curRow.ascent = ascent
        }
        curRow.elementList.push(rowElement)
      }

      if (isWrap || i === elementList.length - 1) {
        curRow.isWidthNotEnough = isWidthNotEnough && !isForceBreak
        if (shouldApplyRowFlexSpacing({ row: curRow, preElement })) {
          const rowElementList =
            curRow.elementList[0]?.value === ZERO
              ? curRow.elementList.slice(1)
              : curRow.elementList
          const gap =
            (availableWidth - curRow.width) / (rowElementList.length - 1)
          for (let e = 0; e < rowElementList.length - 1; e++) {
            const el = rowElementList[e]
            el.metrics.width += gap
          }
          curRow.width = availableWidth
        }
      }

      if (isWrap) {
        x = startX
        y += curRow.height
        if (
          isPagingPageMode &&
          !isFromTable &&
          pageHeight &&
          (y - startY + mainOuterHeight + height > pageHeight ||
            isPageBreakElement(element))
        ) {
          y = startY
          deleteSurroundElementList(surroundElementList, pageNo)
          pageNo += 1
        }
        rowElement.left = 0
        const nextRow = rowList[rowList.length - 1]

        rowElementRect.x = x
        rowElementRect.y = y
        rowElementRect.width = metrics.width
        rowElementRect.height = height
        const nextRowAvailableWidth = this.getRowAvailableWidth(
          innerWidth,
          nextRow
        )
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
    return rowList
  }

  /** 创建布局计算用的初始行列表。 */
  private createInitialRowList(elementList: IElement[]) {
    const rowList: IRow[] = []
    if (elementList.length) {
      rowList.push({
        width: 0,
        height: 0,
        ascent: 0,
        elementList: [],
        startIndex: 0,
        rowIndex: 0,
        rowFlex: elementList?.[0]?.rowFlex || elementList?.[1]?.rowFlex
      })
    }
    return rowList
  }

  private normalizeIndent(value: number | undefined, scale: number) {
    return Math.max(0, value || 0) * scale
  }

  private getParagraphOffsetX(
    element: IElement,
    isParagraphFirstContentElement: boolean,
    scale: number
  ) {
    if (element.listId) return 0
    const left = this.normalizeIndent(element.rowIndentLeft, scale)
    const firstLine = isParagraphFirstContentElement
      ? this.normalizeIndent(element.rowIndent, scale)
      : 0
    const hanging = !isParagraphFirstContentElement
      ? this.normalizeIndent(element.rowHangingIndent, scale)
      : 0
    return left + firstLine + hanging
  }

  private getParagraphRightIndent(element: IElement, scale: number) {
    if (element.listId) return 0
    return this.normalizeIndent(element.rowIndentRight, scale)
  }

  private applyRowOffset(payload: {
    /** 行布局对象，保存当前行的元素和坐标信息。 */
    row: IRow
    /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
    element: IElement
    isParagraphFirstContentElement: boolean
    /** 列表样式偏移x数值，用于当前布局、统计或索引计算。 */
    listStyleOffsetX: number
    /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
    scale: number
  }) {
    const { row, element, isParagraphFirstContentElement, listStyleOffsetX, scale } =
      payload
    if (element.listId) {
      if (!row.offsetX) {
        row.offsetX = listStyleOffsetX
        row.rowFlexOffsetX = listStyleOffsetX
      }
      return
    }
    const paragraphOffsetX = this.getParagraphOffsetX(
      element,
      isParagraphFirstContentElement,
      scale
    )
    const paragraphRightIndent = this.getParagraphRightIndent(element, scale)
    if (paragraphOffsetX && row.offsetX === undefined) {
      row.offsetX = paragraphOffsetX
    }
    if (
      (paragraphOffsetX || paragraphRightIndent) &&
      row.rowFlexOffsetX === undefined
    ) {
      row.rowFlexOffsetX = paragraphOffsetX
    }
    if (paragraphRightIndent && row.rightOffsetX === undefined) {
      row.rightOffsetX = paragraphRightIndent
    }
  }

  private applyWrappedRowOffset(payload: {
    /** 行布局对象，保存当前行的元素和坐标信息。 */
    row: IRow
    /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
    element: IElement
    /** 列表样式偏移x数值，用于当前布局、统计或索引计算。 */
    listStyleOffsetX: number
    /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
    scale: number
  }) {
    const { row, element, listStyleOffsetX, scale } = payload
    this.applyRowOffset({
      row,
      element,
      isParagraphFirstContentElement: false,
      listStyleOffsetX,
      scale
    })
  }

  private createRowOffsetSnapshot(row: IRow) {
    return {
      offsetX: row.offsetX,
      rowFlexOffsetX: row.rowFlexOffsetX,
      rightOffsetX: row.rightOffsetX,
      isList: row.isList,
      listIndex: row.listIndex
    }
  }

  /** 恢复 Row Offset Snapshot 对应的快照状态。 */
  private restoreRowOffsetSnapshot(
    row: IRow,
    snapshot: IRowOffsetSnapshot
  ) {
    row.offsetX = snapshot.offsetX
    row.rowFlexOffsetX = snapshot.rowFlexOffsetX
    row.rightOffsetX = snapshot.rightOffsetX
    row.isList = snapshot.isList
    row.listIndex = snapshot.listIndex
  }

  private getRowAvailableWidth(innerWidth: number, row: IRow) {
    return Math.max(0, innerWidth - (row.offsetX || 0) - (row.rightOffsetX || 0))
  }

  /**
   * 局部排版主文档切片时，恢复切片前的有序列表计数。
   *
   * 完整排版会从 0 开始扫描整篇正文；chunk / 单行 patch 只传入当前片段，
   * 如果不预置前序计数，跨页列表在输入后会从 1 重新编号。
   */
  private createInitialListIndexState(payload: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 来源起始索引，用于定位对应元素、行或片段。 */
    sourceStartIndex: number
    /** 是否来源于表格，用于选择表格内专用排版路径。 */
    isFromTable: boolean
  }): {
    /** 列表id，用于关联对应业务对象。 */
    listId?: string
    /** 列表索引map，用于按键快速查找对应数据。 */
    listIndexMap: Map<string, number>
  } {
    const listIndexMap = new Map<string, number>()
    if (payload.isFromTable || payload.sourceStartIndex <= 0) {
      return { listIndexMap }
    }
    const firstElement = payload.elementList[0]
    if (!firstElement?.listId) {
      return { listIndexMap }
    }
    const sourceElementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const listId = firstElement.listId
    let listStartIndex = payload.sourceStartIndex
    while (listStartIndex > 0) {
      const prevElement = sourceElementList[listStartIndex - 1]
      if (!prevElement || prevElement.listId !== listId) {
        break
      }
      listStartIndex--
    }
    for (let index = listStartIndex; index < payload.sourceStartIndex; index++) {
      const element = sourceElementList[index]
      if (element.value === ZERO && !element.listWrap) {
        const level = element.listLevel || 0
        const indexKey = `${element.listId}:${level}`
        listIndexMap.set(indexKey, (listIndexMap.get(indexKey) || 0) + 1)
        for (const key of [...listIndexMap.keys()]) {
          const [, keyLevel] = key.split(':')
          if (Number(keyLevel) > level) {
            listIndexMap.delete(key)
          }
        }
      }
    }
    return {
      listId,
      listIndexMap
    }
  }
}
