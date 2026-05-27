import { ZERO } from '../../../../dataset/constant/Common'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { DeepRequired } from '../../../../interface/Common'
import {
  IControlHighlight,
  IControlHighlightRule
} from '../../../../interface/Control'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { ISearchResult } from '../../../../interface/Search'
import { Draw } from '../../Draw'
import { Control } from '../Control'
import { findMatchedControlIdentity } from '../controlMatch'
import { resolveControlBlockEndIndex } from '../controlScan'
import { walkControlElementList } from '../controlTraversal'

type IHighlightMatchResult = (ISearchResult & IControlHighlightRule)[]

interface IControlRenderMatch {
  searchMatch: ISearchResult & IControlHighlightRule
  position: IElementPosition
}

export class ControlSearch {
  private draw: Draw
  private control: Control
  private options: DeepRequired<IEditorOption>
  private highlightList: IControlHighlight[]
  private highlightMatchResult: IHighlightMatchResult
  private highlightMatchPageMap: Map<number, IControlRenderMatch[]>

  constructor(control: Control) {
    this.draw = control.getDraw()
    this.control = control
    this.options = this.draw.getOptions()

    this.highlightList = []
    this.highlightMatchResult = []
    this.highlightMatchPageMap = new Map()
  }

  // 获取控件设置高亮信息
  public getControlHighlight(elementList: IElement[], index: number) {
    const {
      control: {
        activeBackgroundColor,
        disabledBackgroundColor,
        existValueBackgroundColor,
        noValueBackgroundColor
      }
    } = this.options
    const element = elementList[index]
    const isPrintMode = this.draw.isPrintMode()
    const activeControlElement = this.control.getActiveControl()?.getElement()
    // 颜色配置：元素 > 控件激活 > 控件禁用 > 控件存在值 > 控件不存在值
    let isActiveControlHighlight = false
    let isDisabledControlHighlight = false
    let isExitsValueControlHighlight = false
    let isNoValueControlHighlight = false
    if (!element.highlight) {
      // 控件激活时高亮色
      isActiveControlHighlight =
        !isPrintMode &&
        !!activeBackgroundColor &&
        !!activeControlElement &&
        element.controlId === activeControlElement.controlId &&
        !this.control.getIsRangeInPostfix()
    }
    if (!isActiveControlHighlight) {
      // 控件禁用时高亮色
      isDisabledControlHighlight =
        !isPrintMode && !!disabledBackgroundColor && !!element.control?.disabled
    }
    if (!isDisabledControlHighlight) {
      // 控件存在值时高亮色
      isExitsValueControlHighlight =
        !isPrintMode &&
        !!existValueBackgroundColor &&
        !!element.controlId &&
        this.control.getIsExistValueByElementListIndex(elementList, index)
    }
    if (!isExitsValueControlHighlight) {
      // 控件不存在值时高亮色
      isNoValueControlHighlight =
        !isPrintMode &&
        !!noValueBackgroundColor &&
        !!element.controlId &&
        !this.control.getIsExistValueByElementListIndex(elementList, index)
    }
    return (
      (isActiveControlHighlight ? activeBackgroundColor : '') ||
      (isDisabledControlHighlight ? disabledBackgroundColor : '') ||
      (isExitsValueControlHighlight ? existValueBackgroundColor : '') ||
      (isNoValueControlHighlight ? noValueBackgroundColor : '')
    )
  }

  public getHighlightMatchResult(): IHighlightMatchResult {
    return this.highlightMatchResult
  }

  public getHighlightList(): IControlHighlight[] {
    return this.highlightList
  }

  public setHighlightList(payload: IControlHighlight[]) {
    this.highlightList = payload
    if (!payload.length) {
      this.highlightMatchResult = []
      this.highlightMatchPageMap.clear()
    }
  }

  public computeHighlightList() {
    const search = this.draw.getSearch()
    const computeHighlight = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        visitor: ({
          element,
          elementList,
          cursorIndex,
          tableContext
        }): number | void => {
          const highlight = findMatchedControlIdentity({
            element,
            optionList: this.highlightList
          })
          if (!highlight) return
          // 搜索后控件结束索引
          const startIndex = cursorIndex
          const newEndIndex = resolveControlBlockEndIndex({
            elementList,
            startIndex,
            controlId: element.controlId!
          })
          // 高亮信息
          const controlElementList = elementList
            .slice(startIndex, newEndIndex)
            .map(element =>
              element.controlComponent === ControlComponent.VALUE
                ? element
                : { value: ZERO }
            )
          const { ruleList } = highlight
          for (let r = 0; r < ruleList.length; r++) {
            const rule = ruleList[r]
            const searchResult = search.getMatchList(
              rule.keyword,
              controlElementList
            )
            this.highlightMatchResult.push(
              ...searchResult.map(result => ({
                ...result,
                ...rule,
                ...tableContext,
                index: result.index + startIndex // 实际索引
              }))
            )
          }
          return newEndIndex
        }
      })
    }
    this.highlightMatchResult = []
    computeHighlight(this.draw.getObjectResolver().getOriginalMainElementList())
    this._rebuildHighlightPageMap()
  }

  public renderHighlightList(ctx: CanvasRenderingContext2D, pageIndex: number) {
    if (!this.highlightMatchResult?.length) return
    const { searchMatchAlpha, searchMatchColor } = this.options
    const pageMatchList = this.highlightMatchPageMap.get(pageIndex) || []
    ctx.save()
    for (let s = 0; s < pageMatchList.length; s++) {
      const { searchMatch, position } = pageMatchList[s]
      const {
        coordinate: { leftTop, leftBottom, rightTop },
      } = position
      ctx.fillStyle = searchMatch.backgroundColor || searchMatchColor
      ctx.globalAlpha = searchMatch.alpha || searchMatchAlpha
      const x = leftTop[0]
      const y = leftTop[1]
      const width = rightTop[0] - leftTop[0]
      const height = leftBottom[1] - leftTop[1]
      ctx.fillRect(x, y, width, height)
    }
    ctx.restore()
  }

  private _getPositionByHighlightMatch(
    searchMatch: ISearchResult & IControlHighlightRule
  ): IElementPosition | null {
    const positionList = this.draw.getCoordinate().getOriginalPositionList()
    if (searchMatch.tableId) {
      const { tableIndex, trIndex, tdIndex, index } = searchMatch
      const tableTd = this.draw.getTargetResolver().resolveOriginalTableTdByIndex({
        tableIndex: tableIndex!,
        trIndex: trIndex!,
        tdIndex: tdIndex!
      })
      return tableTd?.td.positionList?.[index] || null
    }
    return positionList[searchMatch.index] || null
  }

  private _rebuildHighlightPageMap() {
    this.highlightMatchPageMap.clear()
    for (let i = 0; i < this.highlightMatchResult.length; i++) {
      const searchMatch = this.highlightMatchResult[i]
      const position = this._getPositionByHighlightMatch(searchMatch)
      if (!position) continue
      const pageMatchList = this.highlightMatchPageMap.get(position.pageNo) || []
      pageMatchList.push({
        searchMatch,
        position
      })
      this.highlightMatchPageMap.set(position.pageNo, pageMatchList)
    }
  }
}
