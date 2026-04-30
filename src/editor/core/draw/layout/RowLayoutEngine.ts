import { ZERO } from '../../../dataset/constant/Common'
import { FlexDirection, ImageDisplay } from '../../../dataset/enum/Common'
import {
  ControlComponent,
  ControlIndentation
} from '../../../dataset/enum/Control'
import { ElementType } from '../../../dataset/enum/Element'
import { WordBreak } from '../../../dataset/enum/Editor'
import { RowFlex } from '../../../dataset/enum/Row'
import { IComputeRowListPayload } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { deleteSurroundElementList, getIsBlockElement } from '../../../utils/element'
import type { Draw } from '../Draw'
import { InlineElementLayout } from './InlineElementLayout'
import { TableLayoutEngine } from './TableLayoutEngine'

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
      surroundElementList = []
    } = payload
    const {
      defaultSize,
      defaultRowMargin,
      scale,
      defaultTabWidth
    } = this.draw.getOptions()
    const defaultBasicRowMarginHeight =
      this.draw.getDefaultBasicRowMarginHeight()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const listStyleMap = this.draw.getListParticle().computeListStyle(
      ctx,
      elementList
    )
    const rowList = this.createInitialRowList(elementList)

    let x = startX
    let y = startY
    let pageNo = 0
    let listId: string | undefined
    let listIndex = 0
    const listIndexMap = new Map<string, number>()
    let controlRealWidth = 0

    for (let i = 0; i < elementList.length; i++) {
      const curRow = rowList[rowList.length - 1]
      const element = elementList[i]
      const listStyleKey = this.draw.getListParticle().getListStyleKey(element)
      const rowMargin =
        defaultBasicRowMarginHeight * (element.rowMargin ?? defaultRowMargin)
      const offsetX =
        curRow.offsetX ||
        (listStyleKey && listStyleMap.get(listStyleKey)) ||
        0
      if (element.listId && !curRow.offsetX) {
        curRow.offsetX = offsetX
      }
      const availableWidth = innerWidth - offsetX
      const isStartElement = curRow.elementList.length === 1

      // 首元素需要先吸收行级 offsetY，再继续做统一测量。
      y += isStartElement ? curRow.offsetY || 0 : 0

      // 表格与普通行内元素统一在这里完成测量，避免后续行布局逻辑分叉。
      const metrics =
        element.type === ElementType.TABLE
          ? this.tableLayoutEngine.measure({
              element,
              elementList,
              index: i,
              rowMargin,
              isPagingPageMode,
              scale,
              tdPadding: this.draw.getOptions().table.tdPadding
            })
          : this.inlineElementLayout.measure({
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
        !element.hide &&
        ((element.imgDisplay !== ImageDisplay.INLINE &&
          element.type === ElementType.IMAGE) ||
          element.type === ElementType.LATEX)
          ? metrics.height + rowMargin
          : metrics.boundingBoxAscent + rowMargin
      const height =
        rowMargin +
        metrics.boundingBoxAscent +
        metrics.boundingBoxDescent +
        rowMargin
      const rowElement: IRowElement = Object.assign(element, {
        metrics,
        left: 0,
        style: this.draw.getElementFont(element, scale)
      })

      if (rowElement.control?.minWidth) {
        if (rowElement.controlComponent) {
          controlRealWidth += metrics.width
        }
        if (rowElement.controlComponent === ControlComponent.POSTFIX) {
          this.draw.getControl().setMinWidthControlInfo({
            row: curRow,
            rowElement,
            availableWidth,
            controlRealWidth
          })
          controlRealWidth = 0
        }
      }

      const preElement = elementList[i - 1]
      let nextElement = elementList[i + 1]
      let curRowWidth = curRow.width + metrics.width
      const isInlineTable = element.type === ElementType.TABLE && element.tableDisplay === 'inline'
      const isPreInlineTable =
        preElement?.type === ElementType.TABLE && preElement.tableDisplay === 'inline'

      if (this.draw.getOptions().wordBreak === WordBreak.BREAK_WORD) {
        if (
          (!preElement?.type || preElement?.type === ElementType.TEXT) &&
          (!element.type || element.type === ElementType.TEXT)
        ) {
          const word = `${preElement?.value || ''}${element.value}`
          if (this.draw.getWordLikeReg().test(word)) {
            const { width, endElement } = this.draw
              .getTextParticle()
              .measureWord(ctx, elementList, i)
            const wordWidth = width * scale
            if (wordWidth <= availableWidth) {
              curRowWidth += wordWidth
              nextElement = endElement
            }
          }
          const punctuationWidth = this.draw
            .getTextParticle()
            .measurePunctuationWidth(ctx, nextElement)
          curRowWidth += punctuationWidth * scale
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

      const surroundPosition = this.draw.getPosition().setSurroundPosition({
        pageNo,
        rowElement,
        row: curRow,
        rowElementRect: {
          x,
          y,
          height,
          width: metrics.width
        },
        availableWidth,
        surroundElementList
      })
      x = surroundPosition.x
      curRowWidth += surroundPosition.rowIncreaseWidth
      x += metrics.width

      const isForceBreak =
        element.type === ElementType.SEPARATOR ||
        (element.type === ElementType.TABLE && !isInlineTable) ||
        (preElement?.type === ElementType.TABLE && !isPreInlineTable) ||
        preElement?.type === ElementType.BLOCK ||
        element.type === ElementType.BLOCK ||
        preElement?.imgDisplay === ImageDisplay.INLINE ||
        element.imgDisplay === ImageDisplay.INLINE ||
        preElement?.listId !== element.listId ||
        (preElement?.areaId !== element.areaId && !element.area?.hide) ||
        (element.control?.flexDirection === FlexDirection.COLUMN &&
          (element.controlComponent === ControlComponent.CHECKBOX ||
            element.controlComponent === ControlComponent.RADIO) &&
          preElement?.controlComponent === ControlComponent.VALUE) ||
        (i !== 0 && element.value === ZERO && !element.area?.hide)
      const isWidthNotEnough = curRowWidth > availableWidth
      const isWrap = isForceBreak || isWidthNotEnough

      if (isWrap) {
        const row: IRow = {
          width: metrics.width,
          height,
          startIndex: i,
          elementList: [rowElement],
          ascent,
          rowIndex: curRow.rowIndex + 1,
          rowFlex: elementList[i]?.rowFlex || elementList[i + 1]?.rowFlex,
          isPageBreak: element.type === ElementType.PAGE_BREAK
        }

        if (
          rowElement.controlComponent !== ControlComponent.PREFIX &&
          rowElement.control?.indentation === ControlIndentation.VALUE_START
        ) {
          const preStartIndex = curRow.elementList.findIndex(
            el =>
              el.controlId === rowElement.controlId &&
              el.controlComponent !== ControlComponent.PREFIX
          )
          if (~preStartIndex) {
            const preRowPositionList = this.draw.getPosition().computeRowPosition({
              row: curRow,
              innerWidth: this.draw.getInnerWidth()
            })
            const valueStartPosition = preRowPositionList[preStartIndex]
            if (valueStartPosition) {
              row.offsetX = valueStartPosition.coordinate.leftTop[0]
            }
          }
        }

        if (element.listId) {
          row.isList = true
          row.offsetX = listStyleKey ? listStyleMap.get(listStyleKey) : 0
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
          (getIsBlockElement(elementList[1]) || !!elementList[1]?.areaId)
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
        if (
          !curRow.isSurround &&
          (preElement?.rowFlex === RowFlex.JUSTIFY ||
            (preElement?.rowFlex === RowFlex.ALIGNMENT &&
              curRow.isWidthNotEnough))
        ) {
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
            element.type === ElementType.PAGE_BREAK)
        ) {
          y = startY
          deleteSurroundElementList(surroundElementList, pageNo)
          pageNo += 1
        }
        rowElement.left = 0
        const nextRow = rowList[rowList.length - 1]
        const surroundPosition = this.draw.getPosition().setSurroundPosition({
          pageNo,
          rowElement,
          row: nextRow,
          rowElementRect: {
            x,
            y,
            height,
            width: metrics.width
          },
          availableWidth,
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
}
