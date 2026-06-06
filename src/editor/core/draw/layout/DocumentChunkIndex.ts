import { ZERO } from '../../../dataset/constant/Common'
import { IElement } from '../../../interface/Element'
import type { Draw } from '../Draw'
import {
  getChunkPageCount,
  IDocumentChunk,
  IDocumentChunkIndexStats,
  TDocumentChunkKind
} from './ChunkDataTypes'

/**
 * 文档 chunk 索引。
 *
 * 设计边界：
 * - 只维护“元素索引 -> 页 / 段落 / chunk”的轻量结构；
 * - 不直接改变现有 layout 结果；
 * - 为后续段落级布局缓存、视口虚拟化和后台分页提供稳定脏范围。
 */
export class DocumentChunkIndex {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  /** 当前 chunk 列表。 */
  private chunkList: IDocumentChunk[] = []
  /** 当前索引版本，每次重建递增。 */
  private version = 0
  /** 超长段落硬切片阈值，仅在缺少分页布局时作为备用切片。 */
  private readonly maxElementCountPerChunk = 800
  /** 最近一次重建耗时。 */
  private lastBuildDuration = 0
  /** 最近一次重建原因。 */
  private lastBuildReason = 'init'
  /** 最近一次编辑命中的 chunk 编号。 */
  private lastDirtyChunkId: number | null = null
  /** 最近一次编辑命中的索引。 */
  private lastDirtyIndex: number | null = null
  /** 最近一次编辑影响的 chunk 起始编号。 */
  private lastDirtyStartChunkId: number | null = null
  /** 最近一次编辑影响的 chunk 结束编号。 */
  private lastDirtyEndChunkId: number | null = null
  /** 重建 chunk 索引，并尽量绑定已有布局位置的页码范围。 */
  public rebuild(reason = 'manual') {
    const startTime = performance.now()
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const positionList = this.draw.getCoordinate().getPositionList()
    const pageNoMap = new Map<number, number>()
    for (let i = 0; i < positionList.length; i++) {
      const position = positionList[i]
      if (position) {
        pageNoMap.set(position.index, position.pageNo)
      }
    }
    this.chunkList = this.createChunkList(elementList, pageNoMap)
    this.version++
    this.lastBuildReason = reason
    this.lastBuildDuration = performance.now() - startTime
    this.lastDirtyChunkId = null
    this.lastDirtyIndex = null
    this.lastDirtyStartChunkId = null
    this.lastDirtyEndChunkId = null
    this.draw.getServices().chunkLayoutCache.clear()
  }

  /** 仅按当前 pageRowList 重建页级 chunk，用于页窗口 rebalance 后快速同步边界。 */
  public rebuildPageChunks(reason = 'page-window-rebalance') {
    const startTime = performance.now()
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    this.chunkList = this.createPageChunkList(elementList)
    this.version++
    this.lastBuildReason = reason
    this.lastBuildDuration = performance.now() - startTime
    this.lastDirtyChunkId = null
    this.lastDirtyIndex = null
    this.lastDirtyStartChunkId = null
    this.lastDirtyEndChunkId = null
    this.draw.getServices().chunkLayoutCache.clear()
  }

  /** 标记某个编辑索引附近的 chunk 为脏，供后续增量布局和后台分页调度使用。 */
  public markDirtyAroundIndex(index: number | undefined, radius = 1) {
    if (index === undefined || index < 0) {
      return
    }
    if (!this.chunkList.length) {
      this.rebuild('dirty-miss-rebuild')
    }
    const chunkIndex = this.findChunkIndex(index)
    if (chunkIndex === -1) {
      return
    }
    const startChunkIndex = Math.max(0, chunkIndex - radius)
    const endChunkIndex = Math.min(this.chunkList.length - 1, chunkIndex + radius)
    for (let i = startChunkIndex; i <= endChunkIndex; i++) {
      this.chunkList[i].dirty = true
    }
    this.lastDirtyChunkId = this.chunkList[chunkIndex].id
    this.lastDirtyIndex = index
    this.lastDirtyStartChunkId = this.chunkList[startChunkIndex].id
    this.lastDirtyEndChunkId = this.chunkList[endChunkIndex].id
  }

  /** 根据元素索引读取所属 chunk，供输入态局部重绘和后续增量布局使用。 */
  public getChunkByIndex(index: number | undefined): IDocumentChunk | null {
    if (index === undefined || index < 0) {
      return null
    }
    if (!this.chunkList.length) {
      this.rebuild('lookup-miss-rebuild')
    }
    const chunkIndex = this.findChunkIndex(index)
    return chunkIndex === -1 ? null : this.chunkList[chunkIndex]
  }

  /** 获取以指定 chunk 开始的连续页级 chunk 窗口。 */
  public getPageChunkWindow(
    startChunk: IDocumentChunk,
    windowSize: number
  ): IDocumentChunk[] {
    const startOffset = this.chunkList.indexOf(startChunk)
    if (startOffset === -1 || windowSize <= 0) {
      return []
    }
    const windowChunkList: IDocumentChunk[] = []
    for (
      let offset = startOffset;
      offset < this.chunkList.length && windowChunkList.length < windowSize;
      offset++
    ) {
      const chunk = this.chunkList[offset]
      if (chunk.kind !== 'page') {
        break
      }
      windowChunkList.push(chunk)
    }
    return windowChunkList
  }

  /** 根据页码读取页级 chunk，供异步邻近页同步队列继续向后传播。 */
  public getPageChunkByPageNo(pageNo: number): IDocumentChunk | null {
    return (
      this.chunkList.find(chunk => {
        return (
          chunk.kind === 'page' &&
          chunk.startPageNo === pageNo &&
          chunk.endPageNo === pageNo
        )
      }) || null
    )
  }

  /** 清理所有脏 chunk 标记，通常在完整 layout 成功提交后调用。 */
  public clearDirty() {
    for (let i = 0; i < this.chunkList.length; i++) {
      this.chunkList[i].dirty = false
    }
  }

  /** 局部 patch 成功后平移后续 chunk 索引，避免连续输入命中旧边界。 */
  public shiftChunksAfterPatch(payload: {
    patchedChunk: IDocumentChunk
    /** 索引偏移量，用于把局部变更同步到后续元素。 */
    indexDelta: number
  }) {
    const { patchedChunk, indexDelta } = payload
    if (!indexDelta) {
      return
    }
    const chunkOffset = this.chunkList.indexOf(patchedChunk)
    if (chunkOffset === -1) {
      return
    }
    for (let i = chunkOffset + 1; i < this.chunkList.length; i++) {
      const chunk = this.chunkList[i]
      chunk.startIndex += indexDelta
      chunk.endIndex += indexDelta
    }
  }

  /** 获取当前 chunk 统计。 */
  public getStats(): IDocumentChunkIndexStats {
    let dirtyChunkCount = 0
    let totalElementCount = 0
    let maxElementCount = 0
    for (let i = 0; i < this.chunkList.length; i++) {
      const chunk = this.chunkList[i]
      if (chunk.dirty) {
        dirtyChunkCount++
      }
      totalElementCount += chunk.elementCount
      maxElementCount = Math.max(maxElementCount, chunk.elementCount)
    }
    return {
      version: this.version,
      chunkCount: this.chunkList.length,
      dirtyChunkCount,
      averageElementCount: this.chunkList.length
        ? totalElementCount / this.chunkList.length
        : 0,
      maxElementCount,
      lastBuildDuration: this.lastBuildDuration,
      lastBuildReason: this.lastBuildReason,
      lastDirtyChunkId: this.lastDirtyChunkId,
      lastDirtyIndex: this.lastDirtyIndex,
      lastDirtyStartChunkId: this.lastDirtyStartChunkId,
      lastDirtyEndChunkId: this.lastDirtyEndChunkId,
      ...this.draw.getServices().chunkLayoutCache.getStats()
    }
  }

  /** 获取当前索引版本，用于异步 chunk 任务丢弃过期调度。 */
  public getVersion() {
    return this.version
  }

  /** 重置统计与索引，通常用于测试基线清理。 */
  public resetStats() {
    this.version = 0
    this.lastBuildDuration = 0
    this.lastBuildReason = 'reset'
    this.lastDirtyChunkId = null
    this.lastDirtyIndex = null
    this.lastDirtyStartChunkId = null
    this.lastDirtyEndChunkId = null
    this.draw.getServices().chunkLayoutCache.resetStats()
    this.clearDirty()
  }

  /** 根据当前布局创建 chunk：优先一页一个 chunk，缺少分页结果时回退段落切块。 */
  private createChunkList(
    elementList: IElement[],
    pageNoMap: Map<number, number>
  ): IDocumentChunk[] {
    const pageChunkList = this.createPageChunkList(elementList)
    if (pageChunkList.length) {
      return pageChunkList
    }
    return this.createParagraphChunkList(elementList, pageNoMap)
  }

  /** 根据 pageRowList 创建页级 chunk，减少同页段落之间的增量 patch 边界。 */
  private createPageChunkList(elementList: IElement[]): IDocumentChunk[] {
    const pageRowList = this.draw.getPageRowList()
    const chunkList: IDocumentChunk[] = []
    for (let pageNo = 0; pageNo < pageRowList.length; pageNo++) {
      const rowList = pageRowList[pageNo]
      if (!rowList?.length) {
        continue
      }
      const firstRow = rowList[0]
      const lastRow = rowList[rowList.length - 1]
      const startIndex = Math.max(0, firstRow.startIndex)
      const lastRowEndIndex =
        lastRow.startIndex + Math.max(0, lastRow.elementList.length - 1)
      const endIndex = Math.min(elementList.length - 1, lastRowEndIndex)
      if (endIndex < startIndex) {
        continue
      }
      chunkList.push({
        id: chunkList.length,
        scope: 'document',
        startIndex,
        endIndex,
        elementCount: endIndex - startIndex + 1,
        kind: 'page',
        pageNo,
        startPageNo: pageNo,
        endPageNo: pageNo,
        pageCount: 1,
        isChild: false,
        parentScope: null,
        parentKind: null,
        parentId: null,
        childChunkList: [],
        dirty: false
      })
    }
    return chunkList
  }

  /** 根据元素列表创建段落 chunk，并对超长段落进行硬切片。 */
  private createParagraphChunkList(
    elementList: IElement[],
    pageNoMap: Map<number, number>
  ): IDocumentChunk[] {
    const chunkList: IDocumentChunk[] = []
    let startIndex = 0
    for (let i = 0; i < elementList.length; i++) {
      const element = elementList[i]
      const isParagraphEnd = element?.value === ZERO
      const isHardSlice =
        i - startIndex + 1 >= this.maxElementCountPerChunk
      if (isParagraphEnd || isHardSlice || i === elementList.length - 1) {
        chunkList.push(
          this.createChunk(
            chunkList.length,
            startIndex,
            i,
            isHardSlice && !isParagraphEnd ? 'hard-slice' : 'paragraph',
            pageNoMap
          )
        )
        startIndex = i + 1
      }
    }
    if (!chunkList.length) {
      chunkList.push(this.createChunk(0, 0, 0, 'paragraph', pageNoMap))
    }
    return chunkList
  }

  /** 创建单个 chunk 描述，并从位置映射中提取页码覆盖范围。 */
  private createChunk(
    id: number,
    startIndex: number,
    endIndex: number,
    kind: TDocumentChunkKind,
    pageNoMap: Map<number, number>
  ): IDocumentChunk {
    let startPageNo: number | null = null
    let endPageNo: number | null = null
    for (let index = startIndex; index <= endIndex; index++) {
      const pageNo = pageNoMap.get(index)
      if (pageNo === undefined) {
        continue
      }
      startPageNo = startPageNo === null ? pageNo : Math.min(startPageNo, pageNo)
      endPageNo = endPageNo === null ? pageNo : Math.max(endPageNo, pageNo)
    }
    return {
      id,
      scope: 'document',
      startIndex,
      endIndex,
      elementCount: Math.max(0, endIndex - startIndex + 1),
      kind,
      pageNo:
        startPageNo !== null && startPageNo === endPageNo ? startPageNo : null,
      startPageNo,
      endPageNo,
      pageCount: getChunkPageCount(startPageNo, endPageNo),
      isChild: false,
      parentScope: null,
      parentKind: null,
      parentId: null,
      childChunkList: [],
      dirty: false
    }
  }

  /** 查找某个元素索引所属 chunk。 */
  private findChunkIndex(index: number): number {
    let left = 0
    let right = this.chunkList.length - 1
    while (left <= right) {
      const middle = Math.floor((left + right) / 2)
      const chunk = this.chunkList[middle]
      if (index < chunk.startIndex) {
        right = middle - 1
      } else if (index > chunk.endIndex) {
        left = middle + 1
      } else {
        return middle
      }
    }
    return -1
  }

}
