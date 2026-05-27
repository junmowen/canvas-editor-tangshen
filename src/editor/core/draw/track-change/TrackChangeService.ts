import { ZERO } from '../../../dataset/constant/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { ISetTrackChangeOption } from '../../../interface/Command'
import {
  IElement,
  IElementPosition,
  ITrackChange,
  TrackChangeType
} from '../../../interface/Element'
import { deepClone, getUUID } from '../../../utils'
import { forEachTableCell } from '../../table/utils/TableCellTraversal'
import type { Draw } from '../Draw'
export interface ITrackChangeRecord {
  /** 同一次修订操作的唯一标识。 */
  id: string
  /** 修订类型。 */
  type: TrackChangeType
  /** 修订作者。 */
  author?: string
  /** 修订时间戳。 */
  timestamp: number
  /** 当前修订批次包含的元素快照。 */
  elementList: IElement[]
  /** 当前修订批次在文档中的可视矩形，用于审阅面板绘制关联线。 */
  rectList: ITrackChangeRect[]
}

export interface ITrackChangeRect {
  /** 页码，从 0 开始。 */
  pageNo: number
  /** 相对编辑器页面容器左上角的横坐标。 */
  x: number
  /** 相对编辑器页面容器左上角的纵坐标。 */
  y: number
  /** 矩形宽度。 */
  width: number
  /** 矩形高度。 */
  height: number
}

/**
 * 修订留痕服务。
 *
 * 负责把编辑行为转成元素级 `trackChange` 标记：
 * - 插入：新元素保留在正文中，并标记为 insert。
 * - 删除：原元素不立即移除，而是标记为 delete。
 * - 接受：插入痕迹去标记，删除痕迹真正移除。
 * - 拒绝：插入痕迹真正移除，删除痕迹去标记。
 */
export class TrackChangeService {
  /** 连续输入或连续删除停顿超过该时间后，视为一次编辑动作结束。 */
  private static readonly EDIT_SESSION_IDLE_MS = 800
  private activeTrackChange: ITrackChange | null = null
  private activeTrackChangeTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly draw: Draw) {}

  /** 当前是否开启修订留痕。 */
  public isEnabled(): boolean {
    return !!this.draw.getRuntime().getOptions().trackChange.enabled
  }

  /** 更新留痕开关和作者，不触发重排。 */
  public setOptions(payload: ISetTrackChangeOption) {
    const option = this.draw.getRuntime().getOptions().trackChange
    if (payload.enabled !== undefined && payload.enabled !== option.enabled) {
      this.endEditSession()
    }
    if (payload.enabled !== undefined) {
      option.enabled = payload.enabled
    }
    if (payload.author !== undefined) {
      option.author = payload.author
    }
  }

  /** 给新插入的元素批量打上插入痕迹。 */
  public markInsertList(elementList: IElement[]) {
    if (!this.isEnabled()) return
    const trackChange = this.getEditSessionTrackChange('insert')
    elementList.forEach(element => {
      if (element.value !== ZERO && !element.trackChange) {
        this.markElementAndChildren(element, trackChange)
      }
    })
  }

  /** 将删除操作转成删除痕迹；删除未接受的插入内容时直接移除。 */
  public applyDelete(
    elementList: IElement[],
    start: number,
    deleteCount: number
  ): number {
    if (!this.isEnabled() || deleteCount <= 0) return 0
    const trackChange = this.getEditSessionTrackChange('delete')
    const end = Math.min(elementList.length, start + deleteCount)
    let markedCount = 0
    for (
      let index = start;
      index < elementList.length &&
      (index < end || (deleteCount === 1 && markedCount < 1));
      index++
    ) {
      const element = elementList[index]
      if (!this.canMarkDelete(element)) continue
      if (element.trackChange?.type === 'insert') {
        elementList.splice(index, 1)
        index--
        markedCount++
        continue
      }
      this.markElementAndChildren(element, trackChange)
      markedCount++
    }
    return markedCount
  }

  /** 接受指定修订批次。 */
  public acceptChange(id: string) {
    this.endEditSession()
    const isChanged = this.resolveChange(id, true)
    if (isChanged) {
      this.draw.syncEditor2DocumentTree()
    }
    return isChanged
  }

  /** 拒绝指定修订批次。 */
  public rejectChange(id: string) {
    this.endEditSession()
    const isChanged = this.resolveChange(id, false)
    if (isChanged) {
      this.draw.syncEditor2DocumentTree()
    }
    return isChanged
  }

  /** 接受所有修订。 */
  public acceptAll() {
    this.endEditSession()
    this.resolveAll(true)
    this.draw.syncEditor2DocumentTree()
  }

  /** 拒绝所有修订。 */
  public rejectAll() {
    this.endEditSession()
    this.resolveAll(false)
    this.draw.syncEditor2DocumentTree()
  }

  private getTrackChangeElementSource() {
    const objectResolver = this.draw.getObjectResolver()
    const { header, main, footer } = objectResolver.getOriginalEditorData()
    return {
      headerElementList: header,
      originalMainElementList: main,
      layoutMainElementList: objectResolver.getLayoutMainElementList(),
      footerElementList: footer
    }
  }

  private getTrackChangeRecordElementList(): IElement[][] {
    const {
      headerElementList,
      originalMainElementList,
      layoutMainElementList,
      footerElementList
    } = this.getTrackChangeElementSource()
    return [
      headerElementList,
      originalMainElementList,
      layoutMainElementList,
      footerElementList
    ]
  }

  private getTrackChangeRectElementList(): IElement[][] {
    const {
      headerElementList,
      originalMainElementList,
      layoutMainElementList,
      footerElementList
    } = this.getTrackChangeElementSource()
    return [
      headerElementList,
      layoutMainElementList,
      originalMainElementList,
      footerElementList
    ]
  }

  /** 聚合当前文档中的修订批次，供外部审阅面板使用。 */
  public getRecordList(): ITrackChangeRecord[] {
    const recordMap = new Map<string, ITrackChangeRecord>()
    const trackChangeMap = new Map<string, ITrackChange>()
    const collectedElementKeySet = new Set<string>()
    const elementTrackChangeIdMap = new Map<string, string>()
    this.getTrackChangeRecordElementList().forEach(elementList => {
      this.collectRecordList(
        elementList,
        recordMap,
        collectedElementKeySet,
        elementTrackChangeIdMap,
        trackChangeMap
      )
    })
    this.collectRecordListFromPositionList(
      this.draw.getHeader().getPositionList(),
      recordMap,
      collectedElementKeySet,
      elementTrackChangeIdMap,
      trackChangeMap
    )
    this.collectRecordListFromPositionList(
      this.draw.getCoordinate().getLayoutMainPositionList(),
      recordMap,
      collectedElementKeySet,
      elementTrackChangeIdMap,
      trackChangeMap
    )
    this.collectRecordListFromPositionList(
      this.draw.getFooter().getPositionList(),
      recordMap,
      collectedElementKeySet,
      elementTrackChangeIdMap,
      trackChangeMap
    )
    this.collectRecordRectList(
      recordMap,
      elementTrackChangeIdMap,
      trackChangeMap
    )
    const recordList = Array.from(recordMap.values())
    const {
      headerElementList,
      originalMainElementList,
      layoutMainElementList,
      footerElementList
    } = this.getTrackChangeElementSource()
    console.log('[track-change] record list summary', {
      headerCount: headerElementList.length,
      mainCount: originalMainElementList.length,
      layoutCount: layoutMainElementList.length,
      footerCount: footerElementList.length,
      recordCount: recordMap.size,
      tableRecordCount: recordList.filter(record =>
        record.elementList.some(element => element.type === ElementType.TABLE)
      ).length,
      emptyRectRecordCount: recordList.filter(record => !record.rectList.length)
        .length,
      records: recordList.map(record => ({
        id: record.id,
        type: record.type,
        author: record.author || '',
        elementCount: record.elementList.length,
        rectCount: record.rectList.length,
        firstElementType: record.elementList[0]?.type || '',
        firstElementValue: record.elementList[0]?.value || ''
      }))
    })
    return recordList
  }

  /** 主动结束当前连续编辑动作。 */
  public endEditSession() {
    if (this.activeTrackChangeTimer !== null) {
      clearTimeout(this.activeTrackChangeTimer)
      this.activeTrackChangeTimer = null
    }
    this.activeTrackChange = null
  }

  /** 按接受/拒绝规则处理所有修订。 */
  private resolveAll(isAccept: boolean) {
    this.getTrackChangeRecordElementList().forEach(elementList => {
      this.resolveElementList(elementList, isAccept)
    })
  }

  /** 按 id 查找并处理指定修订。 */
  private resolveChange(id: string, isAccept: boolean) {
    const match = (element: IElement) => element.trackChange?.id === id
    let isChanged = false
    this.getTrackChangeRecordElementList().forEach(elementList => {
      if (this.resolveElementList(elementList, isAccept, match)) {
        isChanged = true
      }
    })
    return isChanged
  }

  /** 在元素列表中执行接受/拒绝，并递归处理表格单元格和虚拟子列表。 */
  private resolveElementList(
    elementList: IElement[],
    isAccept: boolean,
    match: (element: IElement) => boolean = element => !!element.trackChange
  ): boolean {
    let isChanged = false
    for (let index = elementList.length - 1; index >= 0; index--) {
      const element = elementList[index]
      const change = element.trackChange
      if (change && match(element)) {
        if (
          (isAccept && change.type === 'delete') ||
          (!isAccept && change.type === 'insert')
        ) {
          elementList.splice(index, 1)
        } else {
          delete element.trackChange
        }
        isChanged = true
        continue
      }
      if (element.type === ElementType.TABLE && element.trList) {
        forEachTableCell({
          tableElement: element,
          tableIndex: index,
          visitor: ({ td }) => {
            if (this.resolveElementList(td.value, isAccept, match)) {
              isChanged = true
            }
          }
        })
      }
      if (element.valueList?.length) {
        if (this.resolveElementList(element.valueList, isAccept, match)) {
          isChanged = true
        }
      }
    }
    return isChanged
  }

  /** 递归收集修订批次。 */
  private collectRecordList(
    elementList: IElement[],
    recordMap: Map<string, ITrackChangeRecord>,
    collectedElementKeySet: Set<string>,
    elementTrackChangeIdMap: Map<string, string>,
    trackChangeMap: Map<string, ITrackChange>
  ) {
    elementList.forEach((element, elementIndex) => {
      const change = element.trackChange
      if (element.type === ElementType.TABLE || element.valueList?.length) {
        console.log('[track-change] collect element', {
          elementType: element.type,
          elementId: element.id,
          elementValue: element.value || '',
          hasTrackChange: !!change,
          changeId: change?.id || '',
          changeType: change?.type || '',
          childCount: element.valueList?.length || 0,
          tableRowCount: element.type === ElementType.TABLE ? element.trList?.length || 0 : 0
        })
      }
      if (change) {
        const record =
          recordMap.get(change.id) ||
          recordMap
            .set(change.id, {
              id: change.id,
              type: change.type,
              author: change.author,
              timestamp: change.timestamp,
              elementList: [],
              rectList: []
            })
            .get(change.id)!
        const elementKey = [
          change.id,
          element.id,
          element.value,
          element.type,
          element.pagingId,
          element.pagingIndex
        ].join(':')
        if (!collectedElementKeySet.has(elementKey)) {
          collectedElementKeySet.add(elementKey)
          record.elementList.push(deepClone(element))
          if (element.id) {
            elementTrackChangeIdMap.set(element.id, change.id)
          }
          trackChangeMap.set(change.id, change)
        }
      }
      if (element.type === ElementType.TABLE && element.trList) {
        forEachTableCell({
          tableElement: element,
          tableIndex: elementIndex,
          visitor: ({ td }) => {
            this.collectRecordList(
              td.value,
              recordMap,
              collectedElementKeySet,
              elementTrackChangeIdMap,
              trackChangeMap
            )
            this.collectRecordListFromPositionList(
              td.positionList || [],
              recordMap,
              collectedElementKeySet,
              elementTrackChangeIdMap,
              trackChangeMap
            )
          }
        })
      }
      if (element.valueList?.length) {
        this.collectRecordList(
          element.valueList,
          recordMap,
          collectedElementKeySet,
          elementTrackChangeIdMap,
          trackChangeMap
        )
      }
    })
  }

  /** 直接按布局位置补充修订批次，兜住表格分页片段等元素树不完整的情况。 */
  private collectRecordListFromPositionList(
    positionList: IElementPosition[],
    recordMap: Map<string, ITrackChangeRecord>,
    collectedElementKeySet: Set<string>,
    elementTrackChangeIdMap: Map<string, string>,
    trackChangeMap: Map<string, ITrackChange>
  ) {
    positionList.forEach(position => {
      const change = this.resolvePositionTrackChange(
        position,
        elementTrackChangeIdMap,
        trackChangeMap
      )
      if (!change) return
      console.log('[track-change] position hit', {
        pageNo: position.pageNo,
        index: position.index,
        rowIndex: position.rowIndex,
        rowNo: position.rowNo,
        value: position.value,
        elementType: position.element?.type || '',
        changeId: change.id,
        changeType: change.type,
        tableFragment: !!position.tableFragment,
        tableId:
          position.tableFragment?.tableId || position.element?.tableId || '',
        coordinate: position.coordinate
      })
      const record =
        recordMap.get(change.id) ||
        recordMap
          .set(change.id, {
            id: change.id,
            type: change.type,
            author: change.author,
            timestamp: change.timestamp,
            elementList: [],
            rectList: []
          })
          .get(change.id)!
      const element = position.element!
      const elementKey = [
        change.id,
        element.id,
        element.value,
        element.type,
        element.pagingId,
        element.pagingIndex
      ].join(':')
      if (!collectedElementKeySet.has(elementKey)) {
        collectedElementKeySet.add(elementKey)
        record.elementList.push(deepClone(element))
      }
    })
  }

  /** 收集当前修订在正文坐标系下的可视矩形，供外部 UI 画关联虚线。 */
  private collectRecordRectList(
    recordMap: Map<string, ITrackChangeRecord>,
    elementTrackChangeIdMap: Map<string, string>,
    trackChangeMap: Map<string, ITrackChange>
  ) {
    const collectedRectKeySet = new Set<string>()
    this.collectPositionRectList(
      this.draw.getHeader().getPositionList(),
      recordMap,
      collectedRectKeySet,
      elementTrackChangeIdMap,
      trackChangeMap
    )
    this.collectPositionRectList(
      this.draw.getCoordinate().getLayoutMainPositionList(),
      recordMap,
      collectedRectKeySet,
      elementTrackChangeIdMap,
      trackChangeMap
    )
    this.collectPositionRectList(
      this.draw.getFooter().getPositionList(),
      recordMap,
      collectedRectKeySet,
      elementTrackChangeIdMap,
      trackChangeMap
    )
    this.collectPageTableFragmentRectList(recordMap, collectedRectKeySet)
    this.getTrackChangeRectElementList().forEach(elementList => {
      this.collectElementPositionRectList(
        elementList,
        recordMap,
        collectedRectKeySet,
        elementTrackChangeIdMap,
        trackChangeMap
      )
    })
  }

  /** 把一组已布局位置转成审阅卡片可连接的矩形。 */
  private collectPositionRectList(
    positionList: IElementPosition[],
    recordMap: Map<string, ITrackChangeRecord>,
    collectedRectKeySet: Set<string>,
    elementTrackChangeIdMap: Map<string, string>,
    trackChangeMap: Map<string, ITrackChange>
  ) {
    positionList.forEach(position => {
      const change = this.resolvePositionTrackChange(
        position,
        elementTrackChangeIdMap,
        trackChangeMap
      )
      if (!change) return
      const record = recordMap.get(change.id)
      if (!record) return
      const rect = this.createTrackChangeRect(position)
      const rectKey = [
        change.id,
        rect.pageNo,
        rect.x,
        rect.y,
        rect.width,
        rect.height
      ].join(':')
      if (collectedRectKeySet.has(rectKey)) return
      collectedRectKeySet.add(rectKey)
      record.rectList.push(rect)
    })
  }

  /** 递归收集表格单元格和嵌套 valueList 中的布局位置。 */
  private collectElementPositionRectList(
    elementList: IElement[],
    recordMap: Map<string, ITrackChangeRecord>,
    collectedRectKeySet: Set<string>,
    elementTrackChangeIdMap: Map<string, string>,
    trackChangeMap: Map<string, ITrackChange>
  ) {
    elementList.forEach((element, elementIndex) => {
      if (element.type === ElementType.TABLE && element.trList) {
        forEachTableCell({
          tableElement: element,
          tableIndex: elementIndex,
          visitor: ({ td }) => {
            this.collectPositionRectList(
              td.positionList || [],
              recordMap,
              collectedRectKeySet,
              elementTrackChangeIdMap,
              trackChangeMap
            )
            this.collectTableCellFallbackRectList(
              td.value || [],
              td.positionList || [],
              recordMap,
              collectedRectKeySet
            )
            this.collectElementPositionRectList(
              td.value || [],
              recordMap,
              collectedRectKeySet,
              elementTrackChangeIdMap,
              trackChangeMap
            )
          }
        })
      }
      if (element.valueList?.length) {
        this.collectElementPositionRectList(
          element.valueList,
          recordMap,
          collectedRectKeySet,
          elementTrackChangeIdMap,
          trackChangeMap
        )
      }
    })
  }

  /** 表格 position 使用布局中间元素时，按单元格内容反推修订矩形。 */
  private collectTableCellFallbackRectList(
    cellElementList: IElement[],
    positionList: IElementPosition[],
    recordMap: Map<string, ITrackChangeRecord>,
    collectedRectKeySet: Set<string>
  ) {
    if (!cellElementList.length || !positionList.length) return
    const changeIdSet = new Set<string>()
    this.collectElementTrackChangeIdSet(cellElementList, changeIdSet)
    changeIdSet.forEach(changeId => {
      const record = recordMap.get(changeId)
      if (!record) return
      let addedCount = 0
      positionList.forEach(position => {
        const rect = this.createTrackChangeRect(position)
        const rectKey = [
          changeId,
          rect.pageNo,
          rect.x,
          rect.y,
          rect.width,
          rect.height
        ].join(':')
        if (collectedRectKeySet.has(rectKey)) return
        collectedRectKeySet.add(rectKey)
        record.rectList.push(rect)
        addedCount++
      })
      if (addedCount) {
        console.log('[track-change] table cell fallback rect', {
          changeId,
          positionCount: positionList.length,
          addedCount,
          firstRect: record.rectList[record.rectList.length - addedCount]
        })
      }
    })
  }

  /** 递归收集元素树中的修订批次 id。 */
  private collectElementTrackChangeIdSet(
    elementList: IElement[],
    changeIdSet: Set<string>
  ) {
    elementList.forEach((element, elementIndex) => {
      if (element.trackChange) {
        changeIdSet.add(element.trackChange.id)
      }
      if (element.type === ElementType.TABLE && element.trList) {
        forEachTableCell({
          tableElement: element,
          tableIndex: elementIndex,
          visitor: ({ td }) => {
            this.collectElementTrackChangeIdSet(td.value || [], changeIdSet)
          }
        })
      }
      if (element.valueList?.length) {
        this.collectElementTrackChangeIdSet(element.valueList, changeIdSet)
      }
    })
  }

  /** 从实际分页表格片段的渲染行中收集修订矩形，保证表格内卡片定位使用真实页码。 */
  private collectPageTableFragmentRectList(
    recordMap: Map<string, ITrackChangeRecord>,
    collectedRectKeySet: Set<string>
  ) {
    this.draw.getPageRowList().forEach((rowList, pageNo) => {
      rowList.forEach(row => {
        const tableFragment = row.tableFragment
        if (!tableFragment?.trList?.length) return
        tableFragment.trList.forEach(tr => {
          tr.tdList.forEach(td => {
            const positionList = td.positionList || []
            if (!td.rowList?.length || !positionList.length) return
            let positionIndex = 0
            td.rowList.forEach(tdRow => {
              tdRow.elementList.forEach(element => {
                const position = positionList[positionIndex]
                positionIndex++
                const change = element.trackChange
                if (!change || !position) return
                const record = recordMap.get(change.id)
                if (!record) return
                const rect = this.createTrackChangeRect(position, pageNo)
                const rectKey = [
                  change.id,
                  rect.pageNo,
                  rect.x,
                  rect.y,
                  rect.width,
                  rect.height
                ].join(':')
                if (collectedRectKeySet.has(rectKey)) return
                collectedRectKeySet.add(rectKey)
                record.rectList.push(rect)
                console.log('[track-change] table fragment row rect', {
                  changeId: change.id,
                  pageNo,
                  value: element.value,
                  rect
                })
              })
            })
          })
        })
      })
    })
  }

  /** 从 position 或元素 id 回查对应的修订元信息。 */
  private resolvePositionTrackChange(
    position: IElementPosition,
    elementTrackChangeIdMap: Map<string, string>,
    trackChangeMap: Map<string, ITrackChange>
  ): ITrackChange | null {
    if (position.element?.trackChange) {
      return position.element.trackChange
    }
    const elementId = position.element?.id
    const changeId = elementId && elementTrackChangeIdMap.get(elementId)
    if (!changeId) return null
    const change = trackChangeMap.get(changeId)
    if (change) {
      console.log('[track-change] position resolved by element id', {
        elementId,
        changeId,
        elementType: position.element?.type || '',
        pageNo: position.pageNo,
        rowNo: position.rowNo
      })
    }
    return change || null
  }

  /** 把元素位置归一到编辑器页面容器坐标，页间距和连页高度由 PageCanvasHost 提供。 */
  private createTrackChangeRect(
    position: IElementPosition,
    pageNo: number = position.pageNo
  ): ITrackChangeRect {
    const pageCanvasHost = this.draw.getPageCanvasHost()
    const { leftTop, rightBottom } = position.coordinate
    return {
      pageNo,
      x: leftTop[0],
      y: pageCanvasHost.getPageTop(pageNo) + leftTop[1],
      width: Math.max(1, rightBottom[0] - leftTop[0]),
      height: Math.max(1, rightBottom[1] - leftTop[1])
    }
  }

  /** 判断当前元素能否被标记为删除痕迹。 */
  private canMarkDelete(element: IElement | undefined): element is IElement {
    if (!element || element.value === ZERO) return false
    if (element.hide || element.control?.hide || element.area?.hide) return false
    if (element.trackChange?.type === 'delete') return false
    return true
  }

  /** 给元素及其子内容写入同一个修订批次标记。 */
  private markElementAndChildren(element: IElement, trackChange: ITrackChange) {
    element.trackChange = { ...trackChange }
    if (element.type === ElementType.TABLE && element.trList) {
      forEachTableCell({
        tableElement: element,
        tableIndex: -1,
        visitor: ({ td }) => {
          td.value.forEach(tdElement => {
            if (tdElement.value !== ZERO) {
              this.markElementAndChildren(tdElement, trackChange)
            }
          })
        }
      })
    }
    element.valueList?.forEach(child => {
      if (child.value !== ZERO) {
        this.markElementAndChildren(child, trackChange)
      }
    })
  }

  /** 创建一次修订批次的元信息。 */
  private createTrackChange(type: TrackChangeType): ITrackChange {
    const option = this.draw.getRuntime().getOptions().trackChange
    return {
      id: getUUID(),
      type,
      author: option.author || undefined,
      timestamp: Date.now(),
      color: type === 'insert' ? option.insertColor : option.deleteColor
    }
  }

  /** 获取当前连续编辑动作的修订信息，同类型连续编辑会复用同一个批次 id。 */
  private getEditSessionTrackChange(type: TrackChangeType): ITrackChange {
    if (!this.activeTrackChange || this.activeTrackChange.type !== type) {
      this.endEditSession()
      this.activeTrackChange = this.createTrackChange(type)
    }
    this.scheduleEditSessionEnd()
    return this.activeTrackChange
  }

  /** 用户停止连续输入/删除一小段时间后，关闭当前批次。 */
  private scheduleEditSessionEnd() {
    if (this.activeTrackChangeTimer !== null) {
      clearTimeout(this.activeTrackChangeTimer)
    }
    this.activeTrackChangeTimer = setTimeout(() => {
      this.endEditSession()
    }, TrackChangeService.EDIT_SESSION_IDLE_MS)
  }
}
