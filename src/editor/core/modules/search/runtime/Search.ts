import { ZERO } from '../../../../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../../../../dataset/constant/Element'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { EditorContext } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import {
  ISearchOption,
  IReplaceOption,
  ISearchResult,
  ISearchResultRestArgs
} from '../../../../interface/Search'
import { getUUID, isNumber } from '../../../../utils'
import { Draw } from '../../../draw/Draw'
import type { DrawCoordinateService } from '../../../draw/coordinate/DrawCoordinateService'
import type { IDrawResolvedTableTd } from '../../../draw/data/DrawTargetResolverTypes'
import { forEachTableCell } from '../../table/utils/TableCellTraversal'

/** navigateinfo契约，用于约束内部流程中传递的数据结构。 */
export interface INavigateInfo {
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 当前缓存数量，用于衡量资源池占用。 */
  count: number
}

/** 搜索渲染match契约，用于约束内部流程中传递的数据结构。 */
interface ISearchRenderMatch {
  /** 搜索索引，用于定位对应元素、行或片段。 */
  searchIndex: number
  /** 搜索匹配结果，用于定位命中的控件或文本。 */
  searchMatch: ISearchResult
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: IElementPosition
}

/** 搜索元素列表分组契约，用于约束内部流程中传递的数据结构。 */
interface ISearchElementListGroup {
  type: EditorContext
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
}

/** 搜索元素match调用载荷，聚合执行该操作所需的输入数据。 */
interface ISearchElementMatchPayload {
  /** 搜索关键字，用于匹配文档内容或控件值。 */
  keyword: string
  /** 正则表达式，用于匹配文本或格式规则。 */
  reg: RegExp | null
  type: EditorContext
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 操作配置项，用于调整当前流程的可选行为。 */
  options: ISearchOption
  restArgs?: ISearchResultRestArgs
}

/** 搜索replaceapply调用载荷，聚合执行该操作所需的输入数据。 */
interface ISearchReplaceApplyPayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement | undefined
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** replacement文本，用于标识、展示或匹配当前对象。 */
  replacement: string
  match: ISearchResult
  /** 当前分组id，用于关联对应业务对象。 */
  currentGroupId: string
}

interface ISearchReplaceApplyResult {
  /** diffcount，用于统计当前场景的发生次数。 */
  diffCount: number
  /** 是否首个match，用于控制当前流程的判断分支。 */
  isFirstMatch: boolean
  /** 是否更新分组标识，用于搜索替换后保持高亮分组一致。 */
  isUpdateGroupId: boolean
}

export class Search {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: Required<IEditorOption>
  /** 坐标服务，用于读取元素位置、浮动元素和光标坐标。 */
  private coordinate: DrawCoordinateService
  /** 当前搜索关键词，用于高亮匹配和跳转定位。 */
  private searchKeyword: string | null
  private searchNavigateIndex: number | null
  private searchMatchList: ISearchResult[]
  private searchMatchPageMap: Map<number, ISearchRenderMatch[]>
  private searchMatchPageNoList: Array<number | null>
  private searchRenderPageNoList: number[]

  /** 初始化 Search 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.coordinate = draw.getCoordinate()
    this.searchNavigateIndex = null
    this.searchKeyword = null
    this.searchMatchList = []
    this.searchMatchPageMap = new Map()
    this.searchMatchPageNoList = []
    this.searchRenderPageNoList = []
  }

  public getSearchKeyword(): string | null {
    return this.searchKeyword
  }

  public setSearchKeyword(payload: string | null) {
    this.searchKeyword = payload
    this.searchNavigateIndex = null
    this.searchMatchPageMap.clear()
    this.searchMatchPageNoList = []
    this.searchRenderPageNoList = []
    if (!payload) {
      this.searchMatchList = []
    }
  }

  public searchNavigatePre(): number | null {
    if (!this.searchMatchList.length || !this.searchKeyword) return null
    const prevPageNoList = this._getSearchNavigatePageNoList()
    if (this.searchNavigateIndex === null) {
      this.searchNavigateIndex = 0
    } else {
      let index = this.searchNavigateIndex - 1
      let isExistPre = false
      const searchNavigateId =
        this.searchMatchList[this.searchNavigateIndex].groupId
      while (index >= 0) {
        const match = this.searchMatchList[index]
        if (searchNavigateId !== match.groupId) {
          isExistPre = true
          this.searchNavigateIndex = index - (this.searchKeyword.length - 1)
          break
        }
        index--
      }
      if (!isExistPre) {
        const lastSearchMatch =
          this.searchMatchList[this.searchMatchList.length - 1]
        if (lastSearchMatch.groupId === searchNavigateId) return null
        this.searchNavigateIndex =
          this.searchMatchList.length - 1 - (this.searchKeyword.length - 1)
      }
    }
    this._setSearchRenderPageNoList(prevPageNoList)
    return this.searchNavigateIndex
  }

  public searchNavigateNext(): number | null {
    if (!this.searchMatchList.length || !this.searchKeyword) return null
    const prevPageNoList = this._getSearchNavigatePageNoList()
    if (this.searchNavigateIndex === null) {
      this.searchNavigateIndex = 0
    } else {
      let index = this.searchNavigateIndex + 1
      let isExistNext = false
      const searchNavigateId =
        this.searchMatchList[this.searchNavigateIndex].groupId
      while (index < this.searchMatchList.length) {
        const match = this.searchMatchList[index]
        if (searchNavigateId !== match.groupId) {
          isExistNext = true
          this.searchNavigateIndex = index
          break
        }
        index++
      }
      if (!isExistNext) {
        const firstSearchMatch = this.searchMatchList[0]
        if (firstSearchMatch.groupId === searchNavigateId) return null
        this.searchNavigateIndex = 0
      }
    }
    this._setSearchRenderPageNoList(prevPageNoList)
    return this.searchNavigateIndex
  }

  public searchNavigateScrollIntoView(position: IElementPosition) {
    const {
      coordinate: { leftTop, leftBottom, rightTop },
      pageNo
    } = position
    const preY = this.draw.getPageCanvasHost().getPageTop(pageNo)
    // 创建定位锚点
    const anchor = document.createElement('div')
    anchor.style.position = 'absolute'
    // 扩大搜索词尺寸，使可视范围更广
    const ANCHOR_OVERFLOW_SIZE = 50
    anchor.style.width = `${rightTop[0] - leftTop[0] + ANCHOR_OVERFLOW_SIZE}px`
    anchor.style.height = `${
      leftBottom[1] - leftTop[1] + ANCHOR_OVERFLOW_SIZE
    }px`
    anchor.style.left = `${leftTop[0]}px`
    anchor.style.top = `${leftTop[1] + preY}px`
    this.draw.getPageCanvasHost().getContainer().append(anchor)
    // 移动到可视范围
    anchor.scrollIntoView(false)
    anchor.remove()
  }

  public getSearchNavigateIndexList() {
    if (this.searchNavigateIndex === null || !this.searchKeyword) return []
    return new Array(this.searchKeyword.length)
      .fill(this.searchNavigateIndex)
      .map((navigate, index) => navigate + index)
  }

  public getSearchMatchList(): ISearchResult[] {
    return this.searchMatchList
  }

  public consumeSearchRenderPageNoList(): number[] {
    const pageNoList = [...this.searchRenderPageNoList]
    this.searchRenderPageNoList = []
    return pageNoList
  }

  public getSearchNavigateInfo(): null | INavigateInfo {
    if (!this.searchKeyword || !this.searchMatchList.length) return null
    const index =
      this.searchNavigateIndex !== null
        ? this.searchNavigateIndex / this.searchKeyword.length + 1
        : 0
    let count = 0
    let groupId = null
    for (let s = 0; s < this.searchMatchList.length; s++) {
      const match = this.searchMatchList[s]
      if (groupId === match.groupId) continue
      groupId = match.groupId
      count += 1
    }
    return {
      index,
      count
    }
  }

  public getMatchList(
    payload: string,
    originalElementList: IElement[],
    options: ISearchOption = {}
  ): ISearchResult[] {
    const keyword = options.isIgnoreCase === false ? payload : payload.toLocaleLowerCase()
    const searchMatchList: ISearchResult[] = []
    const reg = options.isRegEnable
      ? new RegExp(payload, options.isIgnoreCase === false ? 'g' : 'gi')
      : null
    const elementListGroup = this.createSearchElementListGroup(originalElementList)
    for (let e = 0; e < elementListGroup.length; e++) {
      const group = elementListGroup[e]
      searchMatchList.push(
        ...this.collectSearchElementListGroupMatchList({
          keyword,
          reg,
          group,
          options
        })
      )
    }
    return searchMatchList
  }

  /** 收集 Search Element List Group Match List 对应的候选数据。 */
  private collectSearchElementListGroupMatchList(payload: {
    /** 搜索关键字，用于匹配文档内容或控件值。 */
    keyword: string
    /** 正则表达式，用于匹配文本或格式规则。 */
    reg: RegExp | null
    /** 分组配置，用于关联同组元素或控件。 */
    group: ISearchElementListGroup
    /** 操作配置项，用于调整当前流程的可选行为。 */
    options: ISearchOption
  }): ISearchResult[] {
    const { keyword, reg, group, options } = payload
    if (group.type === EditorContext.TABLE) {
      return this.collectSearchTableMatchList({
        keyword,
        reg,
        group,
        options
      })
    }
    return this.collectSearchElementMatchList({
      keyword,
      reg,
      type: group.type,
      elementList: group.elementList,
      options,
      restArgs: {
        startIndex: group.index
      }
    })
  }

  /** 收集 Search Table Match List 对应的候选数据。 */
  private collectSearchTableMatchList(payload: {
    /** 搜索关键字，用于匹配文档内容或控件值。 */
    keyword: string
    /** 正则表达式，用于匹配文本或格式规则。 */
    reg: RegExp | null
    /** 分组配置，用于关联同组元素或控件。 */
    group: ISearchElementListGroup
    /** 操作配置项，用于调整当前流程的可选行为。 */
    options: ISearchOption
  }): ISearchResult[] {
    const { keyword, reg, group, options } = payload
    const tableElement = group.elementList[0]
    const searchMatchList: ISearchResult[] = []
    forEachTableCell({
      tableElement,
      tableIndex: group.index,
      visitor: ({ td, trIndex, tdIndex }) => {
        const restArgs: ISearchResultRestArgs = {
          tableId: tableElement.id,
          tableIndex: group.index,
          trIndex,
          tdIndex,
          tdId: td.id
        }
        searchMatchList.push(
          ...this.collectSearchElementMatchList({
            keyword,
            reg,
            type: group.type,
            elementList: td.value,
            options,
            restArgs
          })
        )
      }
    })
    return searchMatchList
  }

  /** 收集 Search Element Match List 对应的候选数据。 */
  private collectSearchElementMatchList(
    payload: ISearchElementMatchPayload
  ): ISearchResult[] {
    const { keyword, reg, type, elementList, options, restArgs } = payload
    const searchMatchList: ISearchResult[] = []
    if (!keyword) return searchMatchList
    const rawText = elementList
      .map(e =>
        !e.type ||
        (TEXTLIKE_ELEMENT_TYPE.includes(e.type) &&
          e.controlComponent !== ControlComponent.CHECKBOX &&
          !e.hide &&
          !e.control?.hide &&
          !e.area?.hide)
          ? e.value
          : ZERO
      )
      .filter(Boolean)
      .join('')
    const text =
      options.isIgnoreCase === false ? rawText : rawText.toLocaleLowerCase()
    const matchStartIndexList = []
    if (reg) {
      for (const match of text.matchAll(reg)) {
        if (match.index === undefined) continue
        matchStartIndexList.push({
          index: match.index,
          length: match[0].length
        })
      }
    } else {
      let index = text.indexOf(keyword)
      while (index !== -1) {
        matchStartIndexList.push({
          index,
          length: keyword.length
        })
        index = text.indexOf(keyword, index + keyword.length)
      }
    }
    for (let m = 0; m < matchStartIndexList.length; m++) {
      const matchStart = matchStartIndexList[m]
      const groupId = getUUID()
      for (let i = 0; i < matchStart.length; i++) {
        const index = matchStart.index + i + (restArgs?.startIndex || 0)
        searchMatchList.push({
          type,
          index,
          groupId,
          ...restArgs
        })
      }
    }
    return searchMatchList
  }

  private createSearchElementListGroup(
    originalElementList: IElement[]
  ): ISearchElementListGroup[] {
    // 初始化 element List Group 列表。
    const elementListGroup: ISearchElementListGroup[] = []
    const originalElementListLength = originalElementList.length
    // 查找表格所在位置
    const tableIndexList: number[] = []
    for (let e = 0; e < originalElementListLength; e++) {
      const element = originalElementList[e]
      if (element.type === ElementType.TABLE) {
        tableIndexList.push(e)
      }
    }
    let i = 0
    let elementIndex = 0
    while (elementIndex < originalElementListLength - 1) {
      const endIndex = tableIndexList.length
        ? tableIndexList[i]
        : originalElementListLength
      const pageElement = originalElementList.slice(elementIndex, endIndex)
      if (pageElement.length) {
        elementListGroup.push({
          index: elementIndex,
          type: EditorContext.PAGE,
          elementList: pageElement
        })
      }
      const tableElement = originalElementList[endIndex]
      if (tableElement) {
        elementListGroup.push({
          index: endIndex,
          type: EditorContext.TABLE,
          elementList: [tableElement]
        })
      }
      elementIndex = endIndex + 1
      i++
    }
    return elementListGroup
  }

  /** 计算当前项，产出布局或业务规则需要的中间结果。 */
  public compute(payload: string, options: ISearchOption = {}) {
    const matchList = this.getMatchList(
      payload,
      this.draw.getObjectResolver().getOriginalElementList(),
      options
    )
    this.searchMatchList = this.filterMatchListBySelection(matchList, options)
    this._rebuildSearchMatchPageMap()
  }

  private filterMatchListBySelection(
    matchList: ISearchResult[],
    options: ISearchOption
  ): ISearchResult[] {
    if (!options.isLimitSelection) return matchList
    const range = this.draw.getRange().getEditBoundaryRange()
    const { startIndex, endIndex, tableId, startTrIndex, startTdIndex } = range
    if (startIndex === endIndex) return matchList
    return matchList.filter(match => {
      if (tableId) {
        return (
          match.tableId === tableId &&
          match.trIndex === startTrIndex &&
          match.tdIndex === startTdIndex &&
          match.index >= startIndex &&
          match.index < endIndex
        )
      }
      return (
        match.type === EditorContext.PAGE &&
        match.index >= startIndex &&
        match.index < endIndex
      )
    })
  }

  public render(ctx: CanvasRenderingContext2D, pageIndex: number) {
    if (
      !this.searchMatchList ||
      !this.searchMatchList.length ||
      !this.searchKeyword
    ) {
      return
    }
    const { searchMatchAlpha, searchMatchColor, searchNavigateMatchColor } =
      this.options
    const searchMatchIndexSet = new Set(this.getSearchNavigateIndexList())
    const pageMatchList = this.searchMatchPageMap.get(pageIndex) || []
    ctx.save()
    ctx.globalAlpha = searchMatchAlpha
    for (let s = 0; s < pageMatchList.length; s++) {
      const { searchIndex, searchMatch, position } = pageMatchList[s]
      const {
        coordinate: { leftTop, leftBottom, rightTop },
      } = position
      // 高亮并定位当前搜索词
      if (searchMatchIndexSet.has(searchIndex)) {
        ctx.fillStyle = searchNavigateMatchColor
        // 是否是第一个字符，则移动到可视范围
        const preSearchMatch = this.searchMatchList[searchIndex - 1]
        if (!preSearchMatch || preSearchMatch.groupId !== searchMatch.groupId) {
          this.searchNavigateScrollIntoView(position)
        }
      } else {
        ctx.fillStyle = searchMatchColor
      }
      const x = leftTop[0]
      const y = leftTop[1]
      const width = rightTop[0] - leftTop[0]
      const height = leftBottom[1] - leftTop[1]
      ctx.fillRect(x, y, width, height)
    }
    ctx.restore()
  }

  /** 获取位置by搜索match，向调用方返回当前状态或计算结果。 */
  private _getPositionBySearchMatch(
    searchMatch: ISearchResult,
    positionList: IElementPosition[]
  ): IElementPosition | null {
    if (searchMatch.type === EditorContext.TABLE) {
      const tableTd = this.resolveSearchMatchTableTd(searchMatch)
      return tableTd?.td.positionList?.[searchMatch.index] || null
    }
    return positionList[searchMatch.index] || null
  }

  /** 获取搜索navigate页面no列表，向调用方返回当前状态或计算结果。 */
  private _getSearchNavigatePageNoList(): number[] {
    const searchMatchIndexList = this.getSearchNavigateIndexList()
    if (!searchMatchIndexList.length) return []
    const pageNoSet = new Set<number>()
    for (let i = 0; i < searchMatchIndexList.length; i++) {
      const pageNo = this.searchMatchPageNoList[searchMatchIndexList[i]]
      if (pageNo !== null && pageNo !== undefined) {
        pageNoSet.add(pageNo)
      }
    }
    return Array.from(pageNoSet)
  }

  /** 更新搜索渲染页面no列表，同步内部状态并触发必要的界面刷新。 */
  private _setSearchRenderPageNoList(prevPageNoList: number[]) {
    const nextPageNoList = this._getSearchNavigatePageNoList()
    this.searchRenderPageNoList = Array.from(
      new Set([...prevPageNoList, ...nextPageNoList])
    ).sort((a, b) => a - b)
  }

  private _rebuildSearchMatchPageMap() {
    this.searchMatchPageMap.clear()
    this.searchMatchPageNoList = new Array(this.searchMatchList.length).fill(null)
    const positionList = this.coordinate.getOriginalPositionList()
    for (let i = 0; i < this.searchMatchList.length; i++) {
      const searchMatch = this.searchMatchList[i]
      const position = this._getPositionBySearchMatch(
        searchMatch,
        positionList
      )
      if (!position) {
        continue
      }
      this.searchMatchPageNoList[i] = position.pageNo
      const pageMatchList = this.searchMatchPageMap.get(position.pageNo) || []
      pageMatchList.push({
        searchIndex: i,
        searchMatch,
        position
      })
      this.searchMatchPageMap.set(position.pageNo, pageMatchList)
    }
  }

  private groupSearchMatchListByGroupId(
    matchList: ISearchResult[]
  ): ISearchResult[][] {
    // 初始化 match Group 列表。
    const matchGroup: ISearchResult[][] = []
    matchList.forEach(match => {
      const last = matchGroup[matchGroup.length - 1]
      if (!last || last[0].groupId !== match.groupId) {
        matchGroup.push([match])
      } else {
        last.push(match)
      }
    })
    return matchGroup
  }

  private resolveReplaceMatchList(option?: IReplaceOption): ISearchResult[] {
    const matchList = this.getSearchMatchList()
    const replaceIndex = option?.index
    if (!isNumber(replaceIndex)) return matchList
    return this.groupSearchMatchListByGroupId(matchList)[replaceIndex] || []
  }

  private resolveSearchTableElementList(
    match: ISearchResult,
    tableIndexOffset: number
  ): IElement[] {
    const tableTd = this.resolveSearchMatchTableTd(match, tableIndexOffset)
    return tableTd?.td.value || []
  }

  private setSearchReplacePosition(
    firstMatch: ISearchResult,
    firstIndex: number
  ) {
    if (firstMatch.type === EditorContext.TABLE) {
      const tableTd = this.resolveSearchMatchTableTd(firstMatch)
      this.draw.getCoordinate().setPositionContext({
        isTable: true,
        index: firstMatch.tableIndex,
        trIndex: firstMatch.trIndex,
        tdIndex: firstMatch.tdIndex,
        tdId: tableTd?.td.id,
        trId: tableTd?.tr.id,
        tableId: tableTd?.table.id
      })
    } else {
      this.draw.getCoordinate().setPositionContext({
        isTable: false
      })
    }
    this.draw.getRange().setRange(firstIndex, firstIndex)
    // 重新渲染
    this.draw.render({
      curIndex: firstIndex
    })
  }

  private resolveSearchMatchTableTd(
    match: ISearchResult,
    tableIndexOffset = 0
  ): IDrawResolvedTableTd | null {
    const { tableIndex, trIndex, tdIndex } = match
    if (
      tableIndex === undefined ||
      trIndex === undefined ||
      tdIndex === undefined
    ) {
      return null
    }
    return this.draw.getTargetResolver().resolveOriginalTableTdByIndex({
      tableIndex: tableIndex + tableIndexOffset,
      trIndex,
      tdIndex
    })
  }

  private getIsSearchReplaceElementDisabled(
    element: IElement | undefined,
    isDesignMode: boolean
  ): boolean {
    return (
      !isDesignMode &&
      !!(element?.control?.deletable === false ||
        element?.control?.disabled ||
        element?.title?.deletable === false ||
        element?.title?.disabled)
    )
  }

  private getIsSearchReplacePageElementDisabled(
    element: IElement | undefined,
    isDesignMode: boolean
  ): boolean {
    return (
      this.getIsSearchReplaceElementDisabled(element, isDesignMode) ||
      (element?.type === ElementType.CONTROL &&
        element.controlComponent !== ControlComponent.VALUE)
    )
  }

  private applySearchReplaceToElementList(
    payload: ISearchReplaceApplyPayload
  ): ISearchReplaceApplyResult | null {
    const {
      elementList,
      element,
      index,
      replacement,
      match,
      currentGroupId
    } = payload
    if (replacement === '') {
      this.draw.spliceElementList(elementList, index, 1)
      return {
        diffCount: -1,
        isFirstMatch: true,
        isUpdateGroupId: false
      }
    }
    if (currentGroupId === match.groupId) {
      this.draw.spliceElementList(elementList, index, 1)
      return {
        diffCount: -1,
        isFirstMatch: false,
        isUpdateGroupId: false
      }
    }
    if (!element) return null
    let diffCount = 0
    for (let p = 0; p < replacement.length; p++) {
      const value = replacement[p]
      if (p === 0) {
        element.value = value
      } else {
        this.draw.spliceElementList(elementList, index + p, 0, [
          {
            ...element,
            value
          }
        ])
        diffCount++
      }
    }
    return {
      diffCount,
      isFirstMatch: true,
      isUpdateGroupId: true
    }
  }

  public replace(payload: string, option?: IReplaceOption) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    if (payload === undefined || payload === null) return
    const matchList = this.resolveReplaceMatchList(option)
    if (!matchList?.length) return
    const isDesignMode = this.draw.isDesignMode()
    // 匹配index变化的差值
    let pageDiffCount = 0
    let tableDiffCount = 0
    // 匹配搜索词的组标识
    let curGroupId = ''
    // 表格上下文
    let curTdId = ''
    // 搜索值 > 替换值：增加元素；搜索值 < 替换值：减少元素
    let firstMatchIndex = -1
    const elementList = this.draw.getObjectResolver().getOriginalElementList()
    for (let m = 0; m < matchList.length; m++) {
      const match = matchList[m]
      if (match.type === EditorContext.TABLE) {
        const { index, tdId } = match
        if (curTdId && tdId !== curTdId) {
          tableDiffCount = 0
        }
        curTdId = tdId!
        const tableElementList = this.resolveSearchTableElementList(
          match,
          pageDiffCount
        )
        // 表格内元素
        const curIndex = index + tableDiffCount
        const tableElement = tableElementList[curIndex]
        // 非设计模式下设置元素不可删除 || 控件结构元素 => 禁止替换
        if (this.getIsSearchReplaceElementDisabled(tableElement, isDesignMode)) {
          continue
        }
        const replaceResult = this.applySearchReplaceToElementList({
          elementList: tableElementList,
          element: tableElement,
          index: curIndex,
          replacement: payload,
          match,
          currentGroupId: curGroupId
        })
        if (!replaceResult) continue
        tableDiffCount += replaceResult.diffCount
        if (replaceResult.isFirstMatch && !~firstMatchIndex) {
          firstMatchIndex = m
        }
        if (!replaceResult.isUpdateGroupId) continue
      } else {
        const curIndex = match.index + pageDiffCount
        const element = elementList[curIndex]
        // 非设计模式下设置元素不可删除 || 控件结构元素 => 禁止替换
        if (
          this.getIsSearchReplacePageElementDisabled(element, isDesignMode)
        ) {
          continue
        }
        const replaceResult = this.applySearchReplaceToElementList({
          elementList,
          element,
          index: curIndex,
          replacement: payload,
          match,
          currentGroupId: curGroupId
        })
        if (!replaceResult) continue
        pageDiffCount += replaceResult.diffCount
        if (replaceResult.isFirstMatch && !~firstMatchIndex) {
          firstMatchIndex = m
        }
        if (!replaceResult.isUpdateGroupId) continue
      }
      curGroupId = match.groupId
    }
    if (!~firstMatchIndex) return
    // 定位-首个被匹配关键词后
    const firstMatch = matchList[firstMatchIndex]
    const firstIndex = firstMatch.index + (payload.length - 1)
    this.setSearchReplacePosition(firstMatch, firstIndex)
  }
}
