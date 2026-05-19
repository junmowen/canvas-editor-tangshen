import { ElementType } from '../../../dataset/enum/Element'
import { IElementPosition } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { Draw } from '../../draw/Draw'
import {
  getTableLayoutCellFragmentAliasKey,
  getTableLayoutCellPageKey,
  getTableLayoutFragmentCellKey,
  getTableLayoutLogicalCellKey,
  IBuildTableLayoutSnapshotRequest,
  ITableLayoutCellSlice,
  ITableLayoutFragmentCellBounds,
  ITableLayoutSliceRowBand,
  ITableLayoutSnapshot,
  TCellFragmentAliasKey,
  TCellPageKey,
  TFragmentTableCellKey,
  TLogicalTableCellKey
} from './TableLayoutSnapshotTypes'

interface ILogicalCellLocation {
  logicalTrId: string
  logicalTdId: string
  logicalTrIndex: number
  logicalTdIndex: number
}

interface ILogicalTableLookup {
  tableId: string
  tableIndex: number
  trIndexById: Map<string, number>
  tdLocationByTrId: Map<string, Map<string, ILogicalCellLocation>>
  tdLocationById: Map<string, ILogicalCellLocation>
}

/** 表格布局快照构建耗时统计，用于定位大表格分页索引构建瓶颈。 */
export interface ITableLayoutSnapshotBuildStats {
  /** 快照成功构建次数。 */
  buildCount: number
  /** 快照构建总耗时，单位毫秒。 */
  totalDuration: number
  /** 快照构建平均耗时，单位毫秒。 */
  averageDuration: number
  /** 单次快照构建最大耗时，单位毫秒。 */
  maxDuration: number
  /** 最近一次快照构建耗时，单位毫秒。 */
  lastDuration: number
  /** 最近一次构建的快照版本。 */
  lastVersion: number
  /** 最近一次构建的 cell slice 数量。 */
  lastSliceCount: number
  /** 最近一次构建覆盖的页数。 */
  lastPageCount: number
}

/**
 * 快照构建器。
 *
 * 职责：
 * 1. 从当前分页布局结果收集逻辑 cell -> fragment slice 映射；
 * 2. 一次性构建后续命中/导航/渲染需要的全部索引。
 */
export class TableLayoutSnapshotBuilder {
  /** Draw 实例，用于读取当前分页布局和原始表格数据。 */
  private readonly draw: Draw

  /** 快照成功构建次数。 */
  private buildCount = 0

  /** 快照构建累计耗时，单位毫秒。 */
  private totalDuration = 0

  /** 快照构建最大耗时，单位毫秒。 */
  private maxDuration = 0

  /** 最近一次快照构建耗时，单位毫秒。 */
  private lastDuration = 0

  /** 最近一次构建的快照版本。 */
  private lastVersion = 0

  /** 最近一次构建的 cell slice 数量。 */
  private lastSliceCount = 0

  /** 最近一次构建覆盖的页数。 */
  private lastPageCount = 0

  constructor(draw: Draw) {
    this.draw = draw
  }

  public build(
    payload: IBuildTableLayoutSnapshotRequest
  ): ITableLayoutSnapshot {
    // 统计构建耗时，帮助判断大表格卡顿来自索引构建还是后续渲染。
    const startTime = performance.now()
    const snapshot = this.buildSnapshot(payload)
    this.recordBuildStats(snapshot, performance.now() - startTime)
    return snapshot
  }

  /** 获取快照构建耗时统计。 */
  public getStats(): ITableLayoutSnapshotBuildStats {
    return {
      buildCount: this.buildCount,
      totalDuration: this.totalDuration,
      averageDuration:
        this.buildCount > 0 ? this.totalDuration / this.buildCount : 0,
      maxDuration: this.maxDuration,
      lastDuration: this.lastDuration,
      lastVersion: this.lastVersion,
      lastSliceCount: this.lastSliceCount,
      lastPageCount: this.lastPageCount
    }
  }

  /** 重置快照构建统计，不影响当前快照内容。 */
  public resetStats(): void {
    this.buildCount = 0
    this.totalDuration = 0
    this.maxDuration = 0
    this.lastDuration = 0
    this.lastVersion = 0
    this.lastSliceCount = 0
    this.lastPageCount = 0
  }

  /** 构建快照主体索引。 */
  private buildSnapshot(
    payload: IBuildTableLayoutSnapshotRequest
  ): ITableLayoutSnapshot {
    // build 阶段集中把所有索引算完，
    // 运行期只做查询，不再做分散 find/filter 推导。
    const sliceList = this.collectCellSlices()
    const fragmentPositionsByPageNo = this.collectFragmentPositionsByPageNo()
    const cellBoundsByFragmentTableId = this.collectFragmentCellBounds(
      fragmentPositionsByPageNo
    )
    const slicesByCellKey = new Map<TLogicalTableCellKey, ITableLayoutCellSlice[]>()
    const sliceStartIndexesByCellKey = new Map<TLogicalTableCellKey, number[]>()
    const slicesByCellPageKey = new Map<TCellPageKey, ITableLayoutCellSlice>()
    const slicesByFragmentCellKey = new Map<
      TFragmentTableCellKey,
      ITableLayoutCellSlice
    >()
    const slicesByLogicalFragmentCellKey = new Map<
      TFragmentTableCellKey,
      ITableLayoutCellSlice
    >()
    const slicesByCellFragmentAliasKey = new Map<
      TCellFragmentAliasKey,
      ITableLayoutCellSlice
    >()
    const slicesByPageNo = new Map<number, ITableLayoutCellSlice[]>()
    const logicalTableIdByFragmentTableId = new Map<string, string>()
    const logicalTableIndexByTableId = new Map<string, number>()

    sliceList.forEach(slice => {
      // 一次性填满“按逻辑 cell / fragment cell / pageNo”三组主索引，
      // 让不同域的调用方都能走稳定查询。
      const logicalSliceList = slicesByCellKey.get(slice.cellKey)
      if (logicalSliceList) {
        logicalSliceList.push(slice)
      } else {
        slicesByCellKey.set(slice.cellKey, [slice])
      }

      slicesByFragmentCellKey.set(slice.fragmentCellKey, slice)
      slicesByLogicalFragmentCellKey.set(
        getTableLayoutFragmentCellKey(
          slice.logicalTableId,
          slice.fragmentTrId,
          slice.fragmentTdId
        ),
        slice
      )
      slicesByCellFragmentAliasKey.set(
        getTableLayoutCellFragmentAliasKey(
          slice.cellKey,
          slice.fragmentTrId,
          slice.fragmentTdId
        ),
        slice
      )
      if (!slicesByCellPageKey.has(getTableLayoutCellPageKey(slice.cellKey, slice.pageNo))) {
        slicesByCellPageKey.set(
          getTableLayoutCellPageKey(slice.cellKey, slice.pageNo),
          slice
        )
      }

      const pageSliceList = slicesByPageNo.get(slice.pageNo)
      if (pageSliceList) {
        pageSliceList.push(slice)
      } else {
        slicesByPageNo.set(slice.pageNo, [slice])
      }

      if (!logicalTableIdByFragmentTableId.has(slice.fragmentTableId)) {
        logicalTableIdByFragmentTableId.set(
          slice.fragmentTableId,
          slice.logicalTableId
        )
      }
      if (!logicalTableIndexByTableId.has(slice.logicalTableId)) {
        logicalTableIndexByTableId.set(
          slice.logicalTableId,
          slice.logicalTableIndex
        )
      }
    })

    slicesByCellKey.forEach(cellSliceList => {
      cellSliceList.sort((a, b) => a.absoluteStart - b.absoluteStart)
      sliceStartIndexesByCellKey.set(
        cellSliceList[0].cellKey,
        cellSliceList.map(slice => slice.absoluteStart)
      )
    })

    return {
      version: payload.version,
      sliceList,
      slicesByCellKey,
      sliceStartIndexesByCellKey,
      slicesByCellPageKey,
      slicesByFragmentCellKey,
      slicesByLogicalFragmentCellKey,
      slicesByCellFragmentAliasKey,
      slicesByPageNo,
      fragmentPositionsByPageNo,
      cellBoundsByFragmentTableId,
      logicalTableIdByFragmentTableId,
      logicalTableIndexByTableId
    }
  }

  /** 记录一次成功构建后的耗时和规模。 */
  private recordBuildStats(
    snapshot: ITableLayoutSnapshot,
    duration: number
  ): void {
    this.buildCount++
    this.totalDuration += duration
    this.maxDuration = Math.max(this.maxDuration, duration)
    this.lastDuration = duration
    this.lastVersion = snapshot.version
    this.lastSliceCount = snapshot.sliceList.length
    this.lastPageCount = snapshot.slicesByPageNo.size
  }

  private collectFragmentPositionsByPageNo() {
    const fragmentPositionsByPageNo = new Map<number, IElementPosition[]>()
    const positionList = this.draw.getPosition().getLayoutMainPositionList()

    for (let index = 0; index < positionList.length; index++) {
      const position = positionList[index]
      if (position.element?.type !== ElementType.TABLE) {
        continue
      }
      const pagePositions = fragmentPositionsByPageNo.get(position.pageNo)
      if (pagePositions) {
        pagePositions.push(position)
      } else {
        fragmentPositionsByPageNo.set(position.pageNo, [position])
      }
    }

    return fragmentPositionsByPageNo
  }

  private collectFragmentCellBounds(
    fragmentPositionsByPageNo: Map<number, IElementPosition[]>
  ) {
    const cellBoundsByFragmentTableId = new Map<string, ITableLayoutFragmentCellBounds[]>()
    const { scale } = this.draw.getOptions()

    fragmentPositionsByPageNo.forEach(pagePositions => {
      for (let index = 0; index < pagePositions.length; index++) {
        const fragmentPosition = pagePositions[index]
        const activeFragment =
          fragmentPosition.tableFragment || fragmentPosition.element
        if (!activeFragment) {
          continue
        }
        const fragmentTableId =
          'tableId' in activeFragment ? activeFragment.tableId : activeFragment.id
        if (!fragmentTableId || !activeFragment.trList?.length) {
          continue
        }
        const {
          coordinate: {
            leftTop: [tableX, tableY]
          }
        } = fragmentPosition
        const cellBoundsList = cellBoundsByFragmentTableId.get(fragmentTableId) || []

        for (let trIndex = 0; trIndex < activeFragment.trList.length; trIndex++) {
          const tr = activeFragment.trList[trIndex]
          for (let tdIndex = 0; tdIndex < tr.tdList.length; tdIndex++) {
            const td = tr.tdList[tdIndex]
            if (!tr.id || !td.id) {
              continue
            }
            cellBoundsList.push({
              fragmentTableId,
              fragmentTrId: tr.id,
              fragmentTdId: td.id,
              pageNo: fragmentPosition.pageNo,
              trIndex,
              tdIndex,
              x: tableX + (td.x || 0) * scale,
              y: tableY + (td.y || 0) * scale,
              width: (td.width || 0) * scale,
              height: (td.height || 0) * scale
            })
          }
        }

        cellBoundsByFragmentTableId.set(fragmentTableId, cellBoundsList)
      }
    })

    return cellBoundsByFragmentTableId
  }

  private collectCellSlices(): ITableLayoutCellSlice[] {
    const logicalTableLookupMap = this.buildLogicalTableLookupMap()
    const fragmentList = this.collectFragmentList()
    const cellAbsoluteOffsetMap = new Map<TLogicalTableCellKey, number>()
    const sliceList: ITableLayoutCellSlice[] = []

    fragmentList.forEach(fragment => {
      const logicalTableLookup = logicalTableLookupMap.get(fragment.logicalTableId)
      if (!logicalTableLookup || !fragment.trList?.length) {
        return
      }

      for (let fragmentTrIndex = 0; fragmentTrIndex < fragment.trList.length; fragmentTrIndex++) {
        const fragmentTr = fragment.trList[fragmentTrIndex]
        if (!fragmentTr?.id) continue

        for (
          let fragmentTdIndex = 0;
          fragmentTdIndex < fragmentTr.tdList.length;
          fragmentTdIndex++
        ) {
          const fragmentTd = fragmentTr.tdList[fragmentTdIndex]
          if (!fragmentTd?.id) continue

          const logicalCellLocation = this.resolveLogicalCellLocation(
            logicalTableLookup,
            fragmentTr,
            fragmentTd,
            fragmentTdIndex
          )
          if (!logicalCellLocation) {
            continue
          }

          const cellKey = getTableLayoutLogicalCellKey(
            logicalTableLookup.tableId,
            logicalCellLocation.logicalTrId,
            logicalCellLocation.logicalTdId
          )
          const absoluteStart = cellAbsoluteOffsetMap.get(cellKey) || 0
          const absoluteEnd = absoluteStart + fragmentTd.value.length
          fragmentTd.absoluteStart = absoluteStart
          fragmentTd.absoluteEnd = absoluteEnd
          const fragmentPositionList = fragmentTd.positionList || []
          const { firstVisibleOffset, rowBands } =
            this.buildSlicePositionMetadata(fragmentPositionList)

          sliceList.push({
            cellKey,
            fragmentCellKey: getTableLayoutFragmentCellKey(
              fragment.tableId,
              fragmentTr.id,
              fragmentTd.id
            ),
            logicalTableId: logicalTableLookup.tableId,
            logicalTableIndex: logicalTableLookup.tableIndex,
            logicalTrId: logicalCellLocation.logicalTrId,
            logicalTdId: logicalCellLocation.logicalTdId,
            logicalTrIndex: logicalCellLocation.logicalTrIndex,
            logicalTdIndex: logicalCellLocation.logicalTdIndex,
            fragmentTableId: fragment.tableId,
            fragmentTrId: fragmentTr.id,
            fragmentTdId: fragmentTd.id,
            fragmentTrIndex,
            fragmentTdIndex,
            pageNo: fragmentTd.positionList?.[0]?.pageNo ?? 0,
            absoluteStart,
            absoluteEnd,
            rowList: fragmentTd.rowList || [],
            positionList: fragmentPositionList,
            firstVisibleOffset,
            rowBands
          })

          cellAbsoluteOffsetMap.set(cellKey, absoluteEnd)
        }
      }
    })

    return sliceList.sort((a, b) => {
      if (a.logicalTableIndex !== b.logicalTableIndex) {
        return a.logicalTableIndex - b.logicalTableIndex
      }
      if (a.absoluteStart !== b.absoluteStart) {
        return a.absoluteStart - b.absoluteStart
      }
      return a.pageNo - b.pageNo
    })
  }

  private buildSlicePositionMetadata(positionList: IElementPosition[]) {
    let firstVisibleOffset: number | null = null
    const rowBands: ITableLayoutSliceRowBand[] = []

    for (let offset = 0; offset < positionList.length; offset++) {
      const position = positionList[offset]
      const width =
        position.coordinate.rightTop[0] - position.coordinate.leftTop[0]
      if (firstVisibleOffset === null && width > 0) {
        firstVisibleOffset = offset
      }

      const currentBand = rowBands[rowBands.length - 1]
      const top = position.coordinate.leftTop[1]
      const bottom = position.coordinate.leftBottom[1]
      if (!currentBand || currentBand.rowNo !== position.rowNo) {
        rowBands.push({
          rowNo: position.rowNo,
          top,
          bottom,
          startOffset: offset,
          endOffset: offset
        })
      } else {
        currentBand.bottom = Math.max(currentBand.bottom, bottom)
        currentBand.endOffset = offset
      }
    }

    return {
      firstVisibleOffset,
      rowBands
    }
  }

  private collectFragmentList(): ITableFragmentDescriptor[] {
    const fragmentMap = new Map<string, ITableFragmentDescriptor>()
    const pageRowList = this.draw.getPageRowList()

    for (let pageNo = 0; pageNo < pageRowList.length; pageNo++) {
      const rowList = pageRowList[pageNo] || []
      for (let rowIndex = 0; rowIndex < rowList.length; rowIndex++) {
        const fragment = rowList[rowIndex].tableFragment
        if (!fragment?.tableId || fragmentMap.has(fragment.tableId)) {
          continue
        }
        fragmentMap.set(fragment.tableId, fragment)
      }
    }

    return [...fragmentMap.values()].sort((a, b) => {
      if (a.logicalTableIndex !== b.logicalTableIndex) {
        return a.logicalTableIndex - b.logicalTableIndex
      }
      return a.fragmentOrder - b.fragmentOrder
    })
  }

  private buildLogicalTableLookupMap() {
    const logicalTableLookupMap = new Map<string, ILogicalTableLookup>()
    const elementList = this.draw.getOriginalMainElementList()

    for (let tableIndex = 0; tableIndex < elementList.length; tableIndex++) {
      const element = elementList[tableIndex]
      if (element.type !== ElementType.TABLE || !element.id || !element.trList?.length) {
        continue
      }

      const trIndexById = new Map<string, number>()
      const tdLocationByTrId = new Map<string, Map<string, ILogicalCellLocation>>()
      const tdLocationById = new Map<string, ILogicalCellLocation>()

      for (let trIndex = 0; trIndex < element.trList.length; trIndex++) {
        const tr = element.trList[trIndex]
        if (!tr?.id) continue
        trIndexById.set(tr.id, trIndex)

        const tdLocationMap = new Map<string, ILogicalCellLocation>()
        for (let tdIndex = 0; tdIndex < tr.tdList.length; tdIndex++) {
          const td = tr.tdList[tdIndex]
          if (!td?.id) continue
          const logicalCellLocation: ILogicalCellLocation = {
            logicalTrId: tr.id,
            logicalTdId: td.id,
            logicalTrIndex: trIndex,
            logicalTdIndex: tdIndex
          }
          tdLocationMap.set(td.id, logicalCellLocation)
          tdLocationById.set(td.id, logicalCellLocation)
        }
        tdLocationByTrId.set(tr.id, tdLocationMap)
      }

      logicalTableLookupMap.set(element.id, {
        tableId: element.id,
        tableIndex,
        trIndexById,
        tdLocationByTrId,
        tdLocationById
      })
    }

    return logicalTableLookupMap
  }

  private resolveLogicalCellLocation(
    logicalTableLookup: ILogicalTableLookup,
    fragmentTr: NonNullable<ITableFragmentDescriptor['trList']>[number],
    fragmentTd: NonNullable<
      NonNullable<ITableFragmentDescriptor['trList']>[number]['tdList']
    >[number],
    fragmentTdIndex: number
  ): ILogicalCellLocation | null {
    const logicalTrId =
      fragmentTd.cellOriginTrId || fragmentTr.originId || fragmentTr.id
    const logicalTdId = fragmentTd.originId || fragmentTd.id
    if (!logicalTrId || !logicalTdId) {
      return null
    }

    const directLocation =
      logicalTableLookup.tdLocationByTrId
        .get(logicalTrId)
        ?.get(logicalTdId) || null
    if (directLocation) {
      return directLocation
    }

    const fallbackLocation = logicalTableLookup.tdLocationById.get(logicalTdId)
    if (fallbackLocation) {
      return fallbackLocation
    }

    const fallbackTrIndex = logicalTableLookup.trIndexById.get(logicalTrId)
    if (fallbackTrIndex === undefined) {
      return null
    }

    return (
      [...(logicalTableLookup.tdLocationByTrId.get(logicalTrId)?.values() || [])][
        fragmentTdIndex
      ] || null
    )
  }
}
