import { CommandAdaptSearch } from './CommandAdaptSearch'
import { ZERO } from '../../dataset/constant/Common'
import { DeepRequired } from '../../interface/Common'
import { IGetImageOption, IGetValueOption } from '../../interface/Draw'
import {
  IEditorHTML,
  IEditorOption,
  IEditorResult,
  IEditorText
} from '../../interface/Editor'
import { IElement, IElementPosition } from '../../interface/Element'
import { IRange, RangeContext, RangeRect } from '../../interface/Range'
import { ISearchResultContext } from '../../interface/Search'
import { deepClone } from '../../utils'
import {
  createDomFromElementList,
  pickElementAttr,
  getTextFromElementList,
  zipElementList
} from '../../utils/element'
import { IGetAreaValueOption, IGetAreaValueResult } from '../../interface/Area'

/**
 * 查询命令适配模块，负责文档数据、选区上下文、关键词上下文等只读结果获取。
 */
export class CommandAdaptQuery extends CommandAdaptSearch {
  /** 导出当前文档图片数据。 */
  public getImage(payload?: IGetImageOption): Promise<string[]> {
    return this.draw.getDataURL(payload)
  }

  /** 获取当前编辑器运行配置。 */
  public getOptions(): DeepRequired<IEditorOption> {
    return this.options
  }

  /** 同步获取当前文档结构数据。 */
  public getValue(options?: IGetValueOption): IEditorResult {
    return this.draw.getValue(options)
  }

  /** 异步获取当前文档结构数据。 */
  public getValueAsync(options?: IGetValueOption): Promise<IEditorResult> {
    return this.workerManager.getValue(options)
  }

  /** 获取指定区域的结构化内容。 */
  public getAreaValue(
    options?: IGetAreaValueOption
  ): IGetAreaValueResult | null {
    return this.draw.getArea().getAreaValue(options)
  }

  /** 获取当前文档的 HTML 内容。 */
  public getHTML(): IEditorHTML {
    this.draw.flushAsyncInsertTransaction('command-get-html')
    const options = this.options
    const headerElementList = this.draw.getHeaderElementList()
    const mainElementList = this.draw.getOriginalMainElementList()
    const footerElementList = this.draw.getFooterElementList()
    return {
      header: createDomFromElementList(headerElementList, options).innerHTML,
      main: createDomFromElementList(mainElementList, options).innerHTML,
      footer: createDomFromElementList(footerElementList, options).innerHTML
    }
  }

  /** 获取当前文档的纯文本内容。 */
  public getText(): IEditorText {
    this.draw.flushAsyncInsertTransaction('command-get-text')
    const headerElementList = this.draw.getHeaderElementList()
    const mainElementList = this.draw.getOriginalMainElementList()
    const footerElementList = this.draw.getFooterElementList()
    return {
      header: getTextFromElementList(headerElementList),
      main: getTextFromElementList(mainElementList),
      footer: getTextFromElementList(footerElementList)
    }
  }

  /** 获取当前文档字数统计。 */
  public getWordCount(): Promise<number> {
    return this.workerManager.getWordCount()
  }

  /** 获取当前选区对应的纯文本。 */
  public getRangeText(): string {
    return this.range.toString()
  }

  /** 解析选区上下文的边界元素。 */
  private resolveRangeContextBoundaryElements(payload: {
    isCollapsed: boolean
    startIndex: number
    endIndex: number
    elementList: IElement[]
    selectedElementList: IElement[]
  }) {
    // 统一解析 rangeContext 的首尾元素来源。
    // 闭合光标和非闭合选区在“首尾元素取谁”上不同，
    // 但最终都在这里收成同一套输出。
    const { isCollapsed, startIndex, endIndex, elementList, selectedElementList } =
      payload
    const startSourceElement =
      (isCollapsed ? elementList[startIndex] : selectedElementList[0]) ||
      elementList[startIndex] ||
      null
    const endSourceElement =
      (isCollapsed
        ? elementList[endIndex]
        : selectedElementList[selectedElementList.length - 1]) ||
      elementList[Math.max(0, endIndex - 1)] ||
      elementList[endIndex] ||
      null
    if (!startSourceElement || !endSourceElement) {
      return null
    }
    return {
      startElement: pickElementAttr(startSourceElement, {
        extraPickAttrs: ['id', 'controlComponent']
      }),
      endElement: pickElementAttr(endSourceElement, {
        extraPickAttrs: ['id', 'controlComponent']
      })
    }
  }

  /** 解析选区上下文的起止位置信息。 */
  private resolveRangeContextPositions(payload: {
    isCollapsed: boolean
    startIndex: number
    endIndex: number
    cursorPosition: IElementPosition | null
  }) {
    // 统一解析 rangeContext 里的首尾位置和选区位置列表。
    // 这样 getRangeContext 主体只做编排，不再铺开大量 fallback 分支。
    const { isCollapsed, startIndex, endIndex, cursorPosition } = payload
    const positionList = this.position.getPositionList()
    const selectionContentRange = this.range.getSelectionContentRange()
    const selectionPositionList = selectionContentRange
      ? positionList.slice(
          selectionContentRange.startIndex,
          selectionContentRange.endIndex + 1
        )
      : null
    const endSelectionPosition =
      selectionPositionList?.[selectionPositionList.length - 1]
    const startPosition =
      (isCollapsed
        ? cursorPosition || positionList[endIndex]
        : selectionPositionList?.[0]) ||
      positionList[startIndex] ||
      positionList[Math.max(0, endIndex - 1)] ||
      positionList[0]
    const endPosition =
      (isCollapsed
        ? cursorPosition || positionList[endIndex]
        : endSelectionPosition) ||
      positionList[Math.max(0, endIndex - 1)] ||
      positionList[endIndex] ||
      positionList[positionList.length - 1]
    if (!startPosition || !endPosition) {
      return null
    }
    return {
      positionList,
      selectionPositionList,
      startPosition,
      endPosition
    }
  }

  /** 生成选区上下文的页面矩形信息。 */
  private createRangeContextRects(payload: {
    selectionPositionList: IElementPosition[] | null
    cursorPosition: IElementPosition | null
    endIndex: number
  }): RangeRect[] | null {
    // rangeRects 是公开上下文里最容易膨胀的一块：
    // 非闭合选区按行聚合，闭合光标退化成 0 宽矩形。
    const { selectionPositionList, cursorPosition, endIndex } = payload
    const rangeRects: RangeRect[] = []
    const height = this.draw.getOriginalHeight()
    const pageGap = this.draw.getOriginalPageGap()
    if (selectionPositionList) {
      let currentRowNo: number | null = null
      let currentX = 0
      let rangeRect: RangeRect | null = null
      for (let p = 0; p < selectionPositionList.length; p++) {
        const {
          rowNo,
          pageNo,
          coordinate: { leftTop, rightTop },
          lineHeight
        } = selectionPositionList[p]
        if (currentRowNo === null || currentRowNo !== rowNo) {
          if (rangeRect) {
            rangeRects.push(rangeRect)
          }
          rangeRect = {
            x: leftTop[0],
            y: leftTop[1] + pageNo * (height + pageGap),
            width: rightTop[0] - leftTop[0],
            height: lineHeight
          }
          currentRowNo = rowNo
          currentX = leftTop[0]
        } else {
          rangeRect!.width = rightTop[0] - currentX
        }
        if (p === selectionPositionList.length - 1 && rangeRect) {
          rangeRects.push(rangeRect)
        }
      }
      return rangeRects
    }

    const positionList = this.position.getPositionList()
    const position = cursorPosition || positionList[endIndex]
    if (!position) {
      return null
    }
    const {
      coordinate: { rightTop },
      pageNo,
      lineHeight
    } = position
    rangeRects.push({
      x: rightTop[0],
      y: rightTop[1] + pageNo * (height + pageGap),
      width: 0,
      height: lineHeight
    })
    return rangeRects
  }

  /** 解析选区上下文所属标题信息。 */
  private resolveRangeContextTitleInfo(payload: {
    elementList: IElement[]
    positionList: IElementPosition[]
    isCollapsed: boolean
    startIndex: number
  }) {
    // 标题上下文按“向前回溯到当前标题块起点”的方式解析，
    // 不把这段扫描逻辑继续留在 getRangeContext 主体里。
    const { elementList, positionList, isCollapsed, startIndex } = payload
    let titleId: string | null = null
    let titleStartPageNo: number | null = null
    let scanIndex = isCollapsed ? startIndex - 1 : startIndex
    while (scanIndex >= 0) {
      const curElement = elementList[scanIndex]
      const preElement = elementList[scanIndex - 1]
      if (curElement.titleId && curElement.titleId !== preElement?.titleId) {
        titleId = curElement.titleId
        titleStartPageNo = positionList[scanIndex]?.pageNo ?? null
        break
      }
      scanIndex--
    }
    return {
      titleId,
      titleStartPageNo
    }
  }

  /** 获取当前选区的完整上下文信息。 */
  public getRangeContext(): RangeContext | null {
    // 公开 rangeContext 是命令层的综合视图：
    // 它把公开 range、cursor、row/col、rect、table/title context 统一组装成一个稳定输出。
    const range = this.getRange()
    const { startIndex, endIndex } = range
    if (!~startIndex && !~endIndex) return null
    const isCollapsed = startIndex === endIndex
    const selectionText = this.getRangeText()
    const cursorPosition = this.getCursorPosition()
    const selectedElementList = this.range.getSelectionElementList() || []
    const selectionElementList = zipElementList(selectedElementList)
    const elementList = this.draw.getElementList()
    const boundaryElements = this.resolveRangeContextBoundaryElements({
      isCollapsed,
      startIndex,
      endIndex,
      elementList,
      selectedElementList
    })
    if (!boundaryElements) return null
    const { startElement, endElement } = boundaryElements
    const rowList = this.draw.getRowList()
    const resolvedPositions = this.resolveRangeContextPositions({
      isCollapsed,
      startIndex,
      endIndex,
      cursorPosition
    })
    if (!resolvedPositions) return null
    const { positionList, selectionPositionList, startPosition, endPosition } =
      resolvedPositions
    const startPageNo = startPosition.pageNo
    const endPageNo = endPosition.pageNo
    const startRowNo = startPosition.rowIndex
    const endRowNo = endPosition.rowIndex
    const startParagraphNo =
      this.range.getRangeParagraphInfo()?.startIndex ?? startIndex
    const startRow = rowList[startRowNo] || rowList[0]
    const endRow = rowList[endRowNo] || rowList[rowList.length - 1]
    if (!startRow || !endRow) return null
    let startColNo = 0
    let endColNo = 0
    // 以光标显示位置为准
    startColNo =
      startRow.elementList[0]?.value === ZERO
        ? startPosition.index! - startRow.startIndex
        : startPosition.index! - startRow.startIndex + 1
    // 光标闭合时列位置相同
    if (startPosition === endPosition) {
      endColNo = startColNo
    } else {
      endColNo =
        endRow.elementList[0]?.value === ZERO
          ? endPosition.index! - endRow.startIndex
          : endPosition.index! - endRow.startIndex + 1
    }
    const rangeRects = this.createRangeContextRects({
      selectionPositionList,
      cursorPosition,
      endIndex
    })
    if (!rangeRects) return null
    const zone = this.draw.getZone().getZone()
    const { isTable, trIndex, tdIndex, index } =
      this.position.getPositionContext()
    let tableElement: IElement | null = null
    if (isTable) {
      const originalElementList = this.draw.getOriginalElementList()
      const originTableElement = originalElementList[index!] || null
      if (originTableElement) {
        tableElement = zipElementList([originTableElement])[0]
      }
    }
    const { titleId, titleStartPageNo } = this.resolveRangeContextTitleInfo({
      elementList,
      positionList,
      isCollapsed,
      startIndex
    })
    return deepClone<RangeContext>({
      isCollapsed,
      startElement,
      endElement,
      startPageNo,
      endPageNo,
      startRowNo,
      endRowNo,
      startParagraphNo,
      startColNo,
      endColNo,
      rangeRects,
      zone,
      isTable,
      trIndex: trIndex ?? null,
      tdIndex: tdIndex ?? null,
      tableElement,
      selectionText,
      selectionElementList,
      titleId,
      titleStartPageNo
    })
  }

  /** 获取当前选区所在行信息。 */
  public getRangeRow(): IElement[] | null {
    const rowElementList = this.range.getRangeRowElementList()
    return rowElementList ? zipElementList(rowElementList) : null
  }

  /** 获取当前选区所在段落信息。 */
  public getRangeParagraph(): IElement[] | null {
    const paragraphElementList = this.range.getRangeParagraphInfo()?.elementList
    return paragraphElementList ? zipElementList(paragraphElementList) : null
  }

  /** 获取关键词在文档中的选区列表。 */
  public getKeywordRangeList(payload: string): IRange[] {
    return this.range.getKeywordRangeList(payload)
  }

  /** 获取关键词命中的上下文片段。 */
  public getKeywordContext(payload: string): ISearchResultContext[] | null {
    const rangeList = this.getKeywordRangeList(payload)
    if (!rangeList.length) return null
    const searchResultContextList: ISearchResultContext[] = []
    const positionList = this.position.getLayoutMainPositionList()
    const elementList = this.draw.getOriginalMainElementList()
    for (let r = 0; r < rangeList.length; r++) {
      const range = rangeList[r]
      const { startIndex, endIndex, tableId, startTrIndex, startTdIndex } =
        range
      let keywordPositionList: IElementPosition[] = positionList
      if (range.tableId) {
        const tableElement = elementList.find(el => el.id === tableId)
        if (tableElement) {
          keywordPositionList =
            tableElement.trList?.[startTrIndex!]?.tdList?.[startTdIndex!]
              ?.positionList || []
        }
      }
      // 获取关键词始末位置
      const startPosition = deepClone(keywordPositionList[startIndex])
      const endPosition = deepClone(keywordPositionList[endIndex])
      searchResultContextList.push({
        range,
        startPosition,
        endPosition
      })
    }
    return searchResultContextList
  }
}
