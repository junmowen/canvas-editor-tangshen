import type { Draw } from '../Draw'
import { ITableChunkRange, ITableChunkRangeIndexStats } from './ChunkDataTypes'
import { TableChunkRangeBuilder } from './TableChunkRangeBuilder'
import { TableChunkRangeStats } from './TableChunkRangeStats'

/**
 * 表格 chunk 范围索引。
 *
 * 只负责把“页 chunk -> 表格 chunk -> td 子 chunk”的父子范围缓存成可查询结构；
 * 不直接重排表格，不修改布局结果，避免和原表格分页器产生第二套计算真相。
 */
export class TableChunkRangeIndex {
  /** 按逻辑表格 id 保存父 chunk 范围。 */
  private rangeByTableIdMap = new Map<string, ITableChunkRange>()
  /** 按页保存当前页覆盖到的表格范围，输入时只查近邻页。 */
  private readonly rangeListByPageNoMap = new Map<number, ITableChunkRange[]>()
  /** 表格范围构建器。 */
  private readonly builder: TableChunkRangeBuilder
  /** 表格范围索引统计。 */
  private readonly stats = new TableChunkRangeStats()

  /** 关联 Draw，用于读取当前 pageRowList 和表格快照。 */
  constructor(draw: Draw) {
    this.builder = new TableChunkRangeBuilder(draw)
  }

  /** 按当前布局和表格快照重建父子 chunk 范围索引。 */
  public rebuild(reason = 'manual') {
    const startTime = performance.now()
    this.rangeListByPageNoMap.clear()
    this.rangeByTableIdMap = this.builder.build()
    this.rebuildPageLookup()
    this.stats.recordBuild(reason, performance.now() - startTime)
  }

  /** 查询指定页附近的第一个表格父范围。 */
  public findNearestRangeFromPage(payload: {
    pageNo: number
    maxForwardPageCount: number
  }): ITableChunkRange | null {
    this.ensureBuilt()
    const endPageNo = payload.pageNo + payload.maxForwardPageCount - 1
    let nearestRange: ITableChunkRange | null = null
    for (let pageNo = payload.pageNo; pageNo <= endPageNo; pageNo++) {
      const rangeList = this.rangeListByPageNoMap.get(pageNo) || []
      for (let i = 0; i < rangeList.length; i++) {
        const range = rangeList[i]
        if (range.endPageNo < payload.pageNo) {
          continue
        }
        if (!nearestRange || range.startPageNo < nearestRange.startPageNo) {
          nearestRange = range
        }
      }
      if (nearestRange) {
        break
      }
    }
    this.stats.recordLookup(nearestRange)
    return nearestRange
  }

  /** 判断指定页窗口是否覆盖表格范围。 */
  public hasRangeInPageWindow(startPageNo: number, pageCount: number) {
    this.ensureBuilt()
    const endPageNo = startPageNo + pageCount - 1
    for (let pageNo = startPageNo; pageNo <= endPageNo; pageNo++) {
      if (this.rangeListByPageNoMap.has(pageNo)) {
        return true
      }
    }
    return false
  }

  /** 读取指定页窗口覆盖到的表格页范围，用于渲染清理旧页和新页残影。 */
  public getAffectedPageNoListForWindow(startPageNo: number, pageCount: number) {
    this.ensureBuilt()
    const affectedPageNoSet = new Set<number>()
    const endPageNo = startPageNo + pageCount - 1
    for (let pageNo = startPageNo; pageNo <= endPageNo; pageNo++) {
      const rangeList = this.rangeListByPageNoMap.get(pageNo) || []
      rangeList.forEach(range => {
        // 表格父范围一旦和窗口相交，清理必须覆盖整个旧/新表格页跨度。
        for (
          let tablePageNo = range.startPageNo;
          tablePageNo <= range.endPageNo;
          tablePageNo++
        ) {
          affectedPageNoSet.add(tablePageNo)
        }
      })
    }
    return Array.from(affectedPageNoSet)
  }

  /** 获取统计信息。 */
  public getStats(): ITableChunkRangeIndexStats {
    return this.stats.getStats(this.rangeByTableIdMap)
  }

  /** 重置统计，保留当前索引，避免压测开始后的第一次输入重新扫描整篇布局。 */
  public resetStats() {
    this.stats.reset()
  }

  /** 懒加载索引，避免初始化阶段还没有分页结果时构建空索引。 */
  private ensureBuilt() {
    if (!this.stats.getVersion()) {
      this.rebuild('lookup-miss-rebuild')
    }
  }

  /** 重建页码到表格范围的查询表。 */
  private rebuildPageLookup() {
    this.rangeByTableIdMap.forEach(range => {
      if (!Number.isFinite(range.startPageNo) || !Number.isFinite(range.endPageNo)) {
        return
      }
      for (let pageNo = range.startPageNo; pageNo <= range.endPageNo; pageNo++) {
        const rangeList = this.rangeListByPageNoMap.get(pageNo) || []
        if (!rangeList.includes(range)) {
          rangeList.push(range)
        }
        this.rangeListByPageNoMap.set(pageNo, rangeList)
      }
    })
  }
}
