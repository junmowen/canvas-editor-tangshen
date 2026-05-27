import { ITd } from '../../../interface/table/Td'
import { getTableLayoutLogicalCellKey } from '../../table/layout/TableLayoutSnapshotTypes'
import type { Draw } from '../Draw'
import { forEachTableCell } from '../../table/utils/TableCellTraversal'
import {
  ITableCellChunk,
  ITableCellChunkIndexStats
} from './ChunkDataTypes'
import { TableCellChunkBuilder } from './TableCellChunkBuilder'
import { TableCellChunkStats } from './TableCellChunkStats'

/** 表格单元格子 chunk 索引，负责维护 td 局部索引空间的父子 chunk 边界。 */
export class TableCellChunkIndex {
  /** 关联的 Draw 聚合根。 */
  constructor(private readonly draw: Draw) {}

  /** 每个逻辑 cell 对应的子 chunk 列表。 */
  private readonly chunkListByCellKey = new Map<string, ITableCellChunk[]>()
  /** 表格单元格子 chunk 构建器。 */
  private readonly builder = new TableCellChunkBuilder()
  /** 表格单元格子 chunk 统计状态。 */
  private readonly stats = new TableCellChunkStats()

  /** 重建所有表格单元格子 chunk，完整 layout 后调用。 */
  public rebuild(reason = 'manual') {
    const startTime = performance.now()
    this.chunkListByCellKey.clear()
    const snapshotChunkCount = this.rebuildFromTableSnapshot()
    if (snapshotChunkCount > 0) {
      this.stats.finishRebuild({
        reason,
        startTime
      })
      return
    }
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    for (let tableIndex = 0; tableIndex < elementList.length; tableIndex++) {
      const table = elementList[tableIndex]
      if (!table?.id || !table.trList?.length) {
        continue
      }
      const tableId = table.id
      forEachTableCell({
        tableElement: table,
        tableIndex,
        visitor: ({ tr, td, trIndex, tdIndex }) => {
          if (!tr?.id || !td?.id) {
            return
          }
          this.chunkListByCellKey.set(
            getTableLayoutLogicalCellKey(tableId, tr.id, td.id),
            this.builder.createCellChunkList({
              tableId,
              tableIndex,
              trId: tr.id,
              tdId: td.id,
              trIndex,
              tdIndex,
              td
            })
          )
        }
      })
    }
    this.stats.finishRebuild({
      reason,
      startTime
    })
  }

  /** 标记当前表格上下文命中的子 chunk，输入态先建立父子 chunk 脏范围。 */
  public markDirtyByCurrentContext(index: number | undefined): ITableCellChunk | null {
    const tdContext = this.resolveCurrentTdContext()
    if (!tdContext || index === undefined || index < 0) {
      this.stats.recordMiss()
      return null
    }
    let chunk = this.getChunkByCellAndIndex(tdContext.cellKey, index)
    if (!chunk) {
      // 局部 table-cell patch 后 td.rowList 可能已经被当前 fragment 改写，按最新 td 重新建一次该 cell 子 chunk。
      this.rebuild('table-cell-dirty-miss-rebuild')
      chunk = this.getChunkByCellAndIndex(tdContext.cellKey, index)
    }
    this.stats.recordDirtyLookup({
      cellKey: tdContext.cellKey,
      index,
      chunk
    })
    if (chunk) {
      chunk.dirty = true
    }
    return chunk
  }

  /** 根据逻辑 cell 和 td 局部索引读取子 chunk。 */
  public getChunkByCellAndIndex(
    cellKey: string,
    index: number
  ): ITableCellChunk | null {
    if (!this.chunkListByCellKey.size) {
      this.rebuild('lookup-miss-rebuild')
    }
    const chunkList = this.chunkListByCellKey.get(cellKey) || []
    const lastChunk = chunkList[chunkList.length - 1]
    if (lastChunk && index === lastChunk.endIndex + 1) {
      // 单元格尾部追加时，编辑锚点会落在旧内容后一位，应归属最后一个子 chunk。
      return lastChunk
    }
    let left = 0
    let right = chunkList.length - 1
    while (left <= right) {
      const middle = Math.floor((left + right) / 2)
      const chunk = chunkList[middle]
      if (index < chunk.startIndex) {
        right = middle - 1
      } else if (index > chunk.endIndex) {
        left = middle + 1
      } else {
        return chunk
      }
    }
    return null
  }

  /** 按已解析出的逻辑 cellKey 标记子 chunk，供 table-cell patch 直接使用。 */
  public markDirtyByCellKey(cellKey: string, index: number | undefined) {
    if (index === undefined || index < 0) {
      this.stats.recordMiss()
      return null
    }
    let chunk = this.getChunkByCellAndIndex(cellKey, index)
    if (!chunk) {
      // 当前 fragment patch 可能改变了 td 行切分，命中失败时按最新布局重建一次。
      this.rebuild('table-cell-key-dirty-miss-rebuild')
      chunk = this.getChunkByCellAndIndex(cellKey, index)
    }
    if (!chunk) {
      const chunkList = this.chunkListByCellKey.get(cellKey) || []
      chunk = chunkList[chunkList.length - 1] || null
    }
    this.stats.recordDirtyLookup({
      cellKey,
      index,
      chunk
    })
    if (chunk) {
      chunk.dirty = true
    }
    return chunk
  }

  /** 清理所有子 chunk 脏标记，完整表格布局提交后调用。 */
  public clearDirty() {
    this.chunkListByCellKey.forEach(chunkList => {
      chunkList.forEach(chunk => {
        chunk.dirty = false
      })
    })
  }

  /** 获取表格子 chunk 统计。 */
  public getStats(): ITableCellChunkIndexStats {
    return this.stats.getStats(this.chunkListByCellKey)
  }

  /** 重置统计和索引，用于测试基线清理。 */
  public resetStats() {
    this.chunkListByCellKey.clear()
    this.stats.reset()
  }

  /** 优先按分页后的表格快照创建父 fragment -> td 子 chunk 关系。 */
  private rebuildFromTableSnapshot() {
    const snapshot = this.draw.getRuntime().getTableLayoutSnapshot()
    if (!snapshot?.sliceList.length) {
      return 0
    }
    snapshot.sliceList.forEach(slice => {
      const chunkList = this.chunkListByCellKey.get(slice.cellKey) || []
      this.builder.appendSliceChunks({
        chunkList,
        slice
      })
      this.chunkListByCellKey.set(slice.cellKey, chunkList)
    })
    let chunkCount = 0
    this.chunkListByCellKey.forEach(chunkList => {
      chunkCount += chunkList.length
    })
    return chunkCount
  }

  /** 从当前 positionContext 解析逻辑 td，作为子 chunk 的父域。 */
  private resolveCurrentTdContext(): {
    cellKey: string
    td: ITd
  } | null {
    const positionContext = this.draw.getCoordinate().getPositionContext()
    if (
      !positionContext.isTable ||
      positionContext.index === undefined ||
      positionContext.trIndex === undefined ||
      positionContext.tdIndex === undefined
    ) {
      return null
    }
    const tableCell = this.draw.getTargetResolver().resolveActiveLogicalTableTd({
      positionContext
    })
    const table = tableCell?.table
    const tr = tableCell?.tr
    const td = tableCell?.td
    if (!table?.id || !tr?.id || !td?.id) {
      return null
    }
    return {
      cellKey: getTableLayoutLogicalCellKey(table.id, tr.id, td.id),
      td
    }
  }
}
