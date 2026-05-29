import { IElement } from '../../../../interface/Element'
import type { Draw } from '../../Draw'
import { IChunkLayoutPatchContext } from './ChunkLayoutTypes'

export interface IPageChunkWindowSizeResult {
  /** 本轮页窗口大小。 */
  size: number
  /** 当前窗口不满足局部 patch 安全边界，调用方需要完整 layout。 */
  requiresFullLayout: boolean
}

/** 页级 chunk 窗口规划器，集中维护插入量窗口和表格感知窗口策略。 */
export class PageChunkWindowPlanner {
  /** 同步重平衡窗口大小；当前页 + 下一页，避免每次输入触达整篇文档。 */
  private readonly syncWindowSize = 2
  /** 大批量插入时同步窗口上限，避免一次粘贴退化成 200 页同步排版。 */
  private readonly maxInsertedSyncWindowSize = 8
  /** 表格感知同步窗口最大页数，超过时才回退完整 layout，避免局部窗口退化成整篇。 */
  private readonly maxTableAwareWindowSize = 8

  /** 初始化 PageChunkWindowPlanner 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 读取表格感知窗口最大页数，供异步传播跳过表格尾页时复用同一约束。 */
  public getMaxTableAwareWindowSize() {
    return this.maxTableAwareWindowSize
  }

  /** 解析同步窗口大小，如果表格超出窗口限制则要求完整布局。 */
  public resolveSyncWindowSizeWithFallback(
    context: IChunkLayoutPatchContext
  ): IPageChunkWindowSizeResult {
    const insertedWindowSize = this.resolveInsertedWindowSize(context)
    const tableRange = this.draw
      .getServices()
      .tableChunkRangeIndex.findNearestRangeFromPage({
        pageNo: context.pageNo,
        maxForwardPageCount: this.maxTableAwareWindowSize
      })
    if (!tableRange) {
      return {
        size: Math.max(this.syncWindowSize, insertedWindowSize),
        requiresFullLayout: false
      }
    }
    const windowEndPageNo = Math.min(
      this.draw.getPageRowList().length - 1,
      tableRange.endPageNo + 1
    )
    const tableWindowSize = windowEndPageNo - context.pageNo + 1
    if (tableWindowSize <= this.maxTableAwareWindowSize) {
      return {
        size: Math.max(this.syncWindowSize, insertedWindowSize, tableWindowSize),
        requiresFullLayout: false
      }
    }
    // 表格父范围太大时不能只让异步页传播处理，否则会出现旧 fragment 和新 fragment 并存。
    return { size: this.syncWindowSize, requiresFullLayout: true }
  }

  /** 异步传播同样需要表格感知窗口，否则表格被后续页推走时旧页 canvas 会残留。 */
  public resolveAsyncWindowSize(
    context: IChunkLayoutPatchContext
  ): IPageChunkWindowSizeResult {
    const tableRange = this.draw
      .getServices()
      .tableChunkRangeIndex.findNearestRangeFromPage({
        pageNo: context.pageNo,
        maxForwardPageCount: this.maxTableAwareWindowSize
      })
    if (!tableRange) {
      return { size: this.syncWindowSize, requiresFullLayout: false }
    }
    const windowEndPageNo = Math.min(
      this.draw.getPageRowList().length - 1,
      tableRange.endPageNo + 1
    )
    return {
      size: Math.min(
        this.maxTableAwareWindowSize,
        Math.max(this.syncWindowSize, windowEndPageNo - context.pageNo + 1)
      ),
      requiresFullLayout: false
    }
  }

  /** 解析本轮旧窗口页数；表格父范围相交时必须扩到旧表格结束页。 */
  public resolveMeasuredWindowPageCount(payload: {
    /** 起始页码，用于限定跨页范围的左边界。 */
    startPageNo: number
    /** 窗口内分页块列表，保存当前可见范围的布局块。 */
    windowChunkList: IChunkLayoutPatchContext['chunk'][]
  }) {
    let pageCount = payload.windowChunkList.length
    const tableRange = this.draw
      .getServices()
      .tableChunkRangeIndex.findNearestRangeFromPage({
        pageNo: payload.startPageNo,
        maxForwardPageCount: this.maxTableAwareWindowSize
      })
    if (!tableRange || tableRange.startPageNo > payload.startPageNo + pageCount - 1) {
      return pageCount
    }
    const tableAwareEndPageNo = Math.min(
      this.draw.getPageRowList().length - 1,
      tableRange.endPageNo + 1
    )
    pageCount = Math.max(pageCount, tableAwareEndPageNo - payload.startPageNo + 1)
    return Math.min(pageCount, this.maxTableAwareWindowSize)
  }

  /** 解析实际窗口结束索引，优先按页级 chunk 读取扩展后的旧窗口尾页。 */
  public resolveWindowEndIndex(payload: {
    /** 降级分页块列表，用于窗口块缺失时继续完成布局。 */
    fallbackChunkList: IChunkLayoutPatchContext['chunk'][]
    /** 起始页码，用于限定跨页范围的左边界。 */
    startPageNo: number
    /** 页面数量，用于描述当前分页结果规模。 */
    pageCount: number
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
  }) {
    const endPageNo = payload.startPageNo + payload.pageCount - 1
    const endChunk = this.draw
      .getServices()
      .documentChunkIndex.getPageChunkByPageNo(endPageNo)
    if (endChunk) {
      return endChunk.endIndex
    }
    const pageRows = this.draw.getPageRowList()[endPageNo] || []
    const lastRow = pageRows[pageRows.length - 1]
    if (lastRow) {
      return Math.min(
        payload.elementList.length - 1,
        lastRow.startIndex + Math.max(0, lastRow.elementList.length - 1)
      )
    }
    return payload.fallbackChunkList[payload.fallbackChunkList.length - 1].endIndex
  }

  /** 解析本轮实际测量结束位置；大插入只测固定页窗口，剩余页交给异步传播。 */
  public resolveMeasureEndIndex(payload: {
    /** 当前操作上下文，汇总本次处理需要共享的状态。 */
    context: IChunkLayoutPatchContext
    /** 窗口内分页块列表，保存当前可见范围的布局块。 */
    windowChunkList: IChunkLayoutPatchContext['chunk'][]
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 旧结束索引，用于比较重排前后的范围边界。 */
    oldEndIndex: number
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
  }) {
    const fullEndIndex = Math.min(
      payload.elementList.length - 1,
      payload.oldEndIndex + payload.context.insertedCount
    )
    if (payload.context.insertedCount <= 0) {
      return fullEndIndex
    }
    if (
      this.draw
        .getServices()
        .tableChunkRangeIndex.hasRangeInPageWindow(
          payload.context.pageNo,
          payload.windowChunkList.length
        )
    ) {
      // 表格感知窗口必须把旧窗口尾部的表格逻辑元素纳入重新测量。
      // 否则正文插入量较大时只截到新增正文，旧表格页会被删除但新窗口没有表格 fragment。
      return fullEndIndex
    }
    const oldWindowElementCount = Math.max(
      0,
      payload.oldEndIndex - payload.startIndex + 1
    )
    const estimatedWindowElementCount = Math.max(
      oldWindowElementCount,
      payload.context.chunk.elementCount * payload.windowChunkList.length
    )
    const cappedEndIndex = payload.startIndex + estimatedWindowElementCount - 1
    return Math.min(fullEndIndex, cappedEndIndex)
  }

  /** 按插入量估算同步页窗口，避免大粘贴只排前几页后依赖长链异步传播。 */
  private resolveInsertedWindowSize(context: IChunkLayoutPatchContext) {
    if (context.insertedCount <= 0) {
      return this.syncWindowSize
    }
    const pageElementCount = Math.max(1, context.chunk.elementCount)
    if (context.insertedCount < pageElementCount / 2) {
      return this.syncWindowSize
    }
    const insertedPageCount = Math.ceil(context.insertedCount / pageElementCount)
    return Math.min(
      this.draw.getPageRowList().length - context.pageNo,
      this.maxInsertedSyncWindowSize,
      this.syncWindowSize + insertedPageCount
    )
  }
}
