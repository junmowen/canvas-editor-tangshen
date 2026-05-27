import { IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'
import { IDocumentChunkLayoutCachePayload } from './ChunkDataTypes'

/** chunk 布局缓存条目。 */
export interface IChunkLayoutCacheEntry {
  /** 缓存 key。 */
  key: string
  /** 内容签名，内容或关键样式变化时失效。 */
  signature: string
  /** 缓存的 rowList。 */
  rowList: IRow[]
  /** 缓存的 positionList。 */
  positionList: IElementPosition[]
  /** 缓存布局总高度。 */
  height: number
}

/** chunk 布局缓存统计。 */
export interface IChunkLayoutCacheStats {
  /** chunk 布局缓存条目数。 */
  layoutCacheCount: number
  /** chunk 布局缓存命中次数。 */
  layoutCacheHitCount: number
  /** chunk 布局缓存未命中次数。 */
  layoutCacheMissCount: number
  /** chunk 布局缓存写入次数。 */
  layoutCacheSetCount: number
  /** chunk 布局缓存清理次数。 */
  layoutCacheClearCount: number
  /** chunk 布局缓存命中率。 */
  layoutCacheHitRate: number
}

/** chunk 布局缓存工具，集中处理 key、签名、读写、清理和统计。 */
export class ChunkLayoutCache {
  /** chunk 布局缓存，用于复用普通段落局部排版结果。 */
  private readonly cacheMap = new Map<string, IChunkLayoutCacheEntry>()
  /** chunk 布局缓存命中次数。 */
  private hitCount = 0
  /** chunk 布局缓存未命中次数。 */
  private missCount = 0
  /** chunk 布局缓存写入次数。 */
  private setCount = 0
  /** chunk 布局缓存清理次数。 */
  private clearCount = 0

  /** 关联 Draw，用于生成内容签名。 */
  constructor(private readonly draw: Draw) {}

  /** 读取 chunk 布局缓存，内容签名不一致时视为未命中。 */
  public get(
    payload: IDocumentChunkLayoutCachePayload
  ): IChunkLayoutCacheEntry | null {
    const key = this.createKey(payload)
    const cache = this.cacheMap.get(key)
    if (!cache) {
      this.missCount++
      return null
    }
    const signature = this.createContentSignature(
      payload.startIndex,
      payload.endIndex
    )
    if (cache.signature !== signature) {
      this.cacheMap.delete(key)
      this.missCount++
      return null
    }
    this.hitCount++
    return cache
  }

  /** 写入 chunk 布局缓存。 */
  public set(
    payload: IDocumentChunkLayoutCachePayload & {
      rowList: IRow[]
      positionList: IElementPosition[]
      height: number
    }
  ) {
    const key = this.createKey(payload)
    this.cacheMap.set(key, {
      key,
      signature: this.createContentSignature(payload.startIndex, payload.endIndex),
      rowList: payload.rowList,
      positionList: payload.positionList,
      height: payload.height
    })
    this.setCount++
  }

  /** 清理 chunk 布局缓存，通常在完整 layout 或统计重置时执行。 */
  public clear() {
    if (this.cacheMap.size) {
      this.clearCount++
    }
    this.cacheMap.clear()
  }

  /** 获取 chunk 布局缓存统计。 */
  public getStats(): IChunkLayoutCacheStats {
    return {
      layoutCacheCount: this.cacheMap.size,
      layoutCacheHitCount: this.hitCount,
      layoutCacheMissCount: this.missCount,
      layoutCacheSetCount: this.setCount,
      layoutCacheClearCount: this.clearCount,
      layoutCacheHitRate:
        this.hitCount + this.missCount
          ? this.hitCount / (this.hitCount + this.missCount)
          : 0
    }
  }

  /** 重置缓存和统计。 */
  public resetStats() {
    this.hitCount = 0
    this.missCount = 0
    this.setCount = 0
    this.clearCount = 0
    this.clear()
  }

  /** 创建 chunk 布局缓存 key。 */
  private createKey(payload: IDocumentChunkLayoutCachePayload) {
    return [
      payload.chunk.id,
      payload.startIndex,
      payload.endIndex,
      payload.pageNo,
      payload.startX,
      payload.startY,
      payload.innerWidth,
      this.createContentSignature(payload.startIndex, payload.endIndex)
    ].join(':')
  }

  /** 创建内容签名，覆盖影响普通文本布局的关键属性。 */
  private createContentSignature(startIndex: number, endIndex: number): string {
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const partList: string[] = []
    for (let index = startIndex; index <= endIndex; index++) {
      const element = elementList[index]
      if (!element) {
        partList.push('')
        continue
      }
      partList.push(
        [
          element.value,
          element.type || '',
          element.size || '',
          element.font || '',
          element.bold ? 1 : 0,
          element.italic ? 1 : 0,
          element.color || '',
          element.listId || '',
          element.titleId || ''
        ].join(',')
      )
    }
    return partList.join('|')
  }
}
