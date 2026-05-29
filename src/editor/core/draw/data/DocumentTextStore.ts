import { IElement } from '../../../interface/Element'

/**
 * 正文数据存储抽象。
 *
 * 第一版只包住现有数组实现，不改变主链路数据结构；后续 piece-table / rope
 * 可以先作为 mirror 实现这个接口，再逐步灰度到写路径。
 */
export interface IDocumentTextStore<TElement extends IElement = IElement> {
  /** 当前存储版本，每次结构性写入都会递增，供旁路 mirror 和调试统计对齐。 */
  readonly version: number
  /** 当前正文元素数量。 */
  readonly length: number

  /** 返回当前真实数组引用，用于兼容仍按原地数组修改的旧链路。 */
  getRawList(): TElement[]
  /** 返回当前正文元素列表。数组实现下必须保持和旧链路同一个引用。 */
  toElementList(): TElement[]
  /** 读取正文片段，不改变底层数据。 */
  slice(start?: number, end?: number): TElement[]
  /** 按数组 splice 语义修改正文，并推进版本。 */
  splice(start: number, deleteCount: number, itemList?: TElement[]): TElement[]
  /** 在指定位置插入元素，并推进版本。 */
  insert(index: number, itemList: TElement[]): TElement[]
  /** 删除指定范围元素，并推进版本。 */
  delete(start: number, deleteCount: number): TElement[]
  /** 替换整篇正文数组引用，用于 setValue、完整 layout 截断等主链路。 */
  replaceAll(elementList: TElement[]): void
  /** 记录仍由旧链路直接修改数组的写操作，用于评估后续 store API 覆盖度。 */
  recordExternalMutation(operation: IDocumentTextStoreOperation): void
  /** 获取当前 store 观测统计。 */
  getStats(): IDocumentTextStoreStats
  /** 重置观测统计，不改变正文数据和当前版本。 */
  resetStats(): void
}

/** document文本storeoperationtype，限定当前数据可使用的类型标识。 */
export type TDocumentTextStoreOperationType =
  | 'splice'
  | 'insert'
  | 'delete'
  | 'replace-all'
  | 'external-splice'
  | 'external-replace-all'

/** document文本storeoperation契约，用于约束内部流程中传递的数据结构。 */
export interface IDocumentTextStoreOperation {
  /** 操作类型。external-* 表示仍由旧数组链路直接完成写入。 */
  type: TDocumentTextStoreOperationType
  /** 操作起点。replace-all 没有局部起点时为 null。 */
  start: number | null
  /** 删除数量。 */
  deleteCount: number
  /** 插入数量。 */
  insertCount: number
  /** 插入元素的轻量签名列表，仅供 mirror 增量重放，不会写入统计窗口。 */
  insertSignatureList?: string[]
  /** 统计窗口中保留的插入签名数量，避免把签名列表暴露到调试对象。 */
  insertSignatureCount?: number
  /** 删除元素原始索引列表，仅供 mirror 精确重放旧数组删除。 */
  deleteIndexList?: number[]
  /** 删除元素的轻量签名列表，仅供 mirror 校验和重放。 */
  deleteSignatureList?: string[]
  /** 统计窗口中保留的删除索引数量。 */
  deleteIndexCount?: number
  /** 统计窗口中保留的删除签名数量。 */
  deleteSignatureCount?: number
  /** 操作发生后的正文长度。 */
  lengthAfter?: number
}

/** document文本storestats契约，用于约束内部流程中传递的数据结构。 */
export interface IDocumentTextStoreStats {
  /** 当前 store 实现类型。 */
  type: 'array'
  /** 当前 store 版本。 */
  version: number
  /** 当前正文长度。 */
  length: number
  /** store API 记录到的总操作数。 */
  operationCount: number
  /** 旧链路直接数组写入次数。 */
  externalMutationCount: number
  /** 最近一次操作。 */
  lastOperation: IDocumentTextStoreOperation | null
  /** 最近操作窗口，限制数量避免统计对象膨胀。 */
  recentOperationList: IDocumentTextStoreOperation[]
  /** 只读 mirror 快照是否启用。 */
  mirrorEnabled: boolean
  /** mirror 当前模式。shadow-write 表示只旁路重放和校验，不参与真实写入。 */
  mirrorMode: 'shadow-write'
  /** mirror 是否处于健康状态。 */
  mirrorHealthy: boolean
  /** mirror 快照刷新次数。 */
  mirrorCheckCount: number
  /** mirror 快照不一致次数，当前数组快照实现应始终为 0。 */
  mirrorMismatchCount: number
  /** 最近一次 mirror 快照是否与数组真相一致。 */
  mirrorLastMatch: boolean
  /** 最近一次 mirror 观察到的正文长度。 */
  mirrorLength: number
  /** 最近一次 mirror 观察到的抽样签名。 */
  mirrorSignature: string
  /** mirror 增量重放次数。 */
  mirrorReplayCount: number
  /** mirror 增量重放后发现抽样不一致的次数。 */
  mirrorReplayMismatchCount: number
  /** mirror 因操作信息不足而回退到数组快照刷新的次数。 */
  mirrorReplaySkippedCount: number
  /** 最近一次 mirror 重放或快照刷新的原因。 */
  mirrorLastReplayReason: string | null
}

/** 创建单个元素的轻量签名，覆盖类型、文本和常见结构规模。 */
export function createDocumentTextStoreElementSignature(
  element: IElement | undefined
) {
  if (!element) {
    return 'empty'
  }
  const value = element.value || ''
  const type = element.type || 'text'
  const tableSize = element.trList?.length || 0
  const controlId = element.controlId || element.control?.conceptId || ''
  return [
    type,
    value.length,
    value.slice(0, 8),
    value.slice(-8),
    tableSize,
    controlId
  ].join(',')
}

/**
 * 基于原生数组的正文存储适配器。
 *
 * 它刻意不克隆数组，目标是让现有编辑器继续拿到同一个可变数组引用，
 * 同时把未来替换底层结构所需的 API 边界先固定下来。
 */
export class ArrayDocumentTextStore<TElement extends IElement = IElement>
  implements IDocumentTextStore<TElement>
{
  /** 当前正文数组引用。 */
  private elementList: TElement[]
  /** 当前数据版本。 */
  private versionValue = 0
  /** 已记录操作总数。 */
  private operationCount = 0
  /** 旧链路直接数组写入次数。 */
  private externalMutationCount = 0
  /** 最近一次操作。 */
  private lastOperation: IDocumentTextStoreOperation | null = null
  /** 最近操作窗口。 */
  private recentOperationList: IDocumentTextStoreOperation[] = []
  /** 最近操作窗口上限。 */
  private readonly maxRecentOperationCount = 40
  /** 只读 mirror 当前是否启用。第一版只做快照协议，不参与写入。 */
  private readonly mirrorEnabled = true
  /** mirror 快照刷新次数。 */
  private mirrorCheckCount = 0
  /** mirror 快照不一致次数，数组快照实现应始终为 0。 */
  private mirrorMismatchCount = 0
  /** 最近一次 mirror 快照是否与数组真相匹配。 */
  private mirrorLastMatch = true
  /** 最近一次 mirror 记录的长度。 */
  private mirrorLength = 0
  /** 最近一次 mirror 记录的抽样签名。 */
  private mirrorSignature = ''
  /** 只读 mirror 保存的正文元素签名列表，不参与真实写入。 */
  private mirrorSignatureList: string[] = []
  /** mirror 增量重放次数。 */
  private mirrorReplayCount = 0
  /** mirror 增量重放后发现抽样不一致的次数。 */
  private mirrorReplayMismatchCount = 0
  /** mirror 因操作信息不足而回退到数组快照刷新的次数。 */
  private mirrorReplaySkippedCount = 0
  /** 最近一次 mirror 重放或快照刷新的原因。 */
  private mirrorLastReplayReason: string | null = null

  /** 初始化 ArrayDocumentTextStore 实例并注入运行依赖。 */
  constructor(elementList: TElement[]) {
    this.elementList = elementList
    this.refreshMirrorFromTruth('initialize')
  }

  /** 读取 version 属性值。 */
  public get version() {
    return this.versionValue
  }

  /** 读取 length 属性值。 */
  public get length() {
    return this.elementList.length
  }

  public getRawList(): TElement[] {
    return this.elementList
  }

  public toElementList(): TElement[] {
    return this.elementList
  }

  public slice(start?: number, end?: number): TElement[] {
    return this.elementList.slice(start, end)
  }

  public splice(
    start: number,
    deleteCount: number,
    itemList: TElement[] = []
  ): TElement[] {
    const normalizedStart = this.normalizeSpliceStart(
      start,
      this.elementList.length
    )
    const deleteSignatureList = this.elementList
      .slice(normalizedStart, normalizedStart + deleteCount)
      .map(element => {
        return this.createElementSignature(element)
      })
    const deleteIndexList = deleteSignatureList.map((_, index) => {
      return normalizedStart + index
    })
    const removedList = this.elementList.splice(start, deleteCount, ...itemList)
    if (removedList.length || itemList.length) {
      this.versionValue++
      this.recordOperation({
        type: 'splice',
        start,
        deleteCount: removedList.length,
        deleteIndexList,
        deleteSignatureList,
        insertCount: itemList.length,
        insertSignatureList: itemList.map(element => {
          return this.createElementSignature(element)
        })
      })
    }
    return removedList
  }

  public insert(index: number, itemList: TElement[]): TElement[] {
    if (!itemList.length) {
      return []
    }
    return this.splice(index, 0, itemList)
  }

  public delete(start: number, deleteCount: number): TElement[] {
    if (deleteCount <= 0) {
      return []
    }
    return this.splice(start, deleteCount)
  }

  public replaceAll(elementList: TElement[]) {
    const insertSignatureList = elementList.map(element => {
      return this.createElementSignature(element)
    })
    const oldLength = this.elementList.length
    this.elementList = elementList
    this.versionValue++
    this.recordOperation({
      type: 'replace-all',
      start: null,
      deleteCount: oldLength,
      insertCount: elementList.length,
      insertSignatureList
    })
  }

  /** 记录外部mutation，把当前命中结果写入缓存或统计。 */
  public recordExternalMutation(operation: IDocumentTextStoreOperation) {
    this.versionValue++
    this.externalMutationCount++
    this.recordOperation(operation)
  }

  public getStats(): IDocumentTextStoreStats {
    return {
      type: 'array',
      version: this.versionValue,
      length: this.elementList.length,
      operationCount: this.operationCount,
      externalMutationCount: this.externalMutationCount,
      lastOperation: this.lastOperation ? { ...this.lastOperation } : null,
      recentOperationList: this.recentOperationList.map(item => ({ ...item })),
      mirrorEnabled: this.mirrorEnabled,
      mirrorMode: 'shadow-write',
      mirrorHealthy:
        this.mirrorLastMatch &&
        this.mirrorMismatchCount === 0 &&
        this.mirrorReplayMismatchCount === 0,
      mirrorCheckCount: this.mirrorCheckCount,
      mirrorMismatchCount: this.mirrorMismatchCount,
      mirrorLastMatch: this.mirrorLastMatch,
      mirrorLength: this.mirrorLength,
      mirrorSignature: this.mirrorSignature,
      mirrorReplayCount: this.mirrorReplayCount,
      mirrorReplayMismatchCount: this.mirrorReplayMismatchCount,
      mirrorReplaySkippedCount: this.mirrorReplaySkippedCount,
      mirrorLastReplayReason: this.mirrorLastReplayReason
    }
  }

  /** 重置 Stats 对应的状态。 */
  public resetStats() {
    this.operationCount = 0
    this.externalMutationCount = 0
    this.lastOperation = null
    this.recentOperationList = []
    this.mirrorCheckCount = 0
    this.mirrorMismatchCount = 0
    this.mirrorReplayCount = 0
    this.mirrorReplayMismatchCount = 0
    this.mirrorReplaySkippedCount = 0
    this.mirrorLastReplayReason = null
    this.refreshMirrorFromTruth('reset')
  }

  /** 记录最近写操作，用于评估未来 store API 接管范围。 */
  private recordOperation(operation: IDocumentTextStoreOperation) {
    const nextOperation = {
      ...operation,
      lengthAfter: this.elementList.length
    }
    this.operationCount++
    const statsOperation = this.createStatsOperation(nextOperation)
    this.lastOperation = statsOperation
    this.recentOperationList.push(statsOperation)
    if (this.recentOperationList.length > this.maxRecentOperationCount) {
      this.recentOperationList.shift()
    }
    this.applyOperationToMirror(nextOperation)
  }

  /** 对 mirror 执行一次只读重放；无法安全重放时回退到数组真相快照。 */
  private applyOperationToMirror(operation: IDocumentTextStoreOperation) {
    if (!this.mirrorEnabled) {
      return
    }
    const replayResult = this.tryReplayMirrorOperation(operation)
    if (!replayResult.isReplayed) {
      if (replayResult.isSkipped) {
        this.mirrorReplaySkippedCount++
      }
      this.refreshMirrorFromTruth(replayResult.reason)
      return
    }
    this.mirrorReplayCount++
    this.mirrorLastReplayReason = replayResult.reason
    const isMatch = this.updateMirrorObservation()
    if (!isMatch) {
      this.mirrorReplayMismatchCount++
      this.refreshMirrorFromTruth('replay-mismatch-refresh')
    }
  }

  /** 尝试按操作日志增量重放 mirror。 */
  private tryReplayMirrorOperation(operation: IDocumentTextStoreOperation): {
    /** 是否已回放，用于文档文本镜像调试统计。 */
    isReplayed: boolean
    /** 是否已跳过，用于记录镜像回放中未执行的操作。 */
    isSkipped: boolean
    /** 原因说明，用于记录降级、跳过或失败的触发条件。 */
    reason: string
  } {
    if (operation.type === 'replace-all') {
      const insertSignatureList = operation.insertSignatureList || []
      if (insertSignatureList.length !== operation.insertCount) {
        return {
          isReplayed: false,
          isSkipped: true,
          reason: 'replace-all-missing-signature-refresh'
        }
      }
      this.mirrorSignatureList = insertSignatureList.slice()
      return {
        isReplayed: true,
        isSkipped: false,
        reason: 'replace-all-replay'
      }
    }
    if (operation.type === 'external-replace-all') {
      const insertSignatureList = operation.insertSignatureList || []
      if (insertSignatureList.length === operation.insertCount) {
        this.mirrorSignatureList = insertSignatureList.slice()
        return {
          isReplayed: true,
          isSkipped: false,
          reason: 'external-replace-all-replay'
        }
      }
      return {
        isReplayed: false,
        isSkipped: true,
        reason: 'external-replace-all-missing-signature-refresh'
      }
    }
    if (operation.start === null) {
      return {
        isReplayed: false,
        isSkipped: true,
        reason: 'missing-start-refresh'
      }
    }
    const insertSignatureList = operation.insertSignatureList || []
    if (insertSignatureList.length !== operation.insertCount) {
      return {
        isReplayed: false,
        isSkipped: true,
        reason: 'missing-insert-signature-refresh'
      }
    }
    const nextSignatureList = this.mirrorSignatureList.slice()
    const start = this.normalizeSpliceStart(
      operation.start,
      nextSignatureList.length
    )
    const deleteResult = this.applyDeleteToMirrorSignatureList(
      nextSignatureList,
      operation,
      start
    )
    if (!deleteResult.isApplied) {
      return {
        isReplayed: false,
        isSkipped: true,
        reason: deleteResult.reason
      }
    }
    nextSignatureList.splice(
      Math.min(start, nextSignatureList.length),
      0,
      ...insertSignatureList
    )
    this.mirrorSignatureList = nextSignatureList
    return {
      isReplayed: true,
      isSkipped: false,
      reason: `${operation.type}-replay`
    }
  }

  /** 按操作日志删除 mirror 签名，并校验签名是否仍和删除前 mirror 对齐。 */
  private applyDeleteToMirrorSignatureList(
    signatureList: string[],
    operation: IDocumentTextStoreOperation,
    start: number
  ) {
    const deleteSignatureList = operation.deleteSignatureList || []
    const deleteIndexList = operation.deleteIndexList || []
    if (!operation.deleteCount) {
      return { isApplied: true, reason: 'no-delete' }
    }
    if (deleteIndexList.length) {
      if (
        deleteIndexList.length !== operation.deleteCount ||
        deleteSignatureList.length !== operation.deleteCount
      ) {
        return {
          isApplied: false,
          reason: 'delete-signature-count-mismatch-refresh'
        }
      }
      const deleteRecordList = deleteIndexList.map((index, recordIndex) => {
        return {
          index,
          signature: deleteSignatureList[recordIndex]
        }
      })
      const seenIndexSet = new Set<number>()
      deleteRecordList.sort((a, b) => b.index - a.index)
      for (const record of deleteRecordList) {
        if (
          record.index < 0 ||
          record.index >= signatureList.length ||
          seenIndexSet.has(record.index) ||
          signatureList[record.index] !== record.signature
        ) {
          return {
            isApplied: false,
            reason: 'delete-signature-mismatch-refresh'
          }
        }
        seenIndexSet.add(record.index)
        signatureList.splice(record.index, 1)
      }
      return { isApplied: true, reason: 'indexed-delete' }
    }
    if (
      deleteSignatureList.length &&
      deleteSignatureList.length !== operation.deleteCount
    ) {
      return {
        isApplied: false,
        reason: 'delete-signature-count-mismatch-refresh'
      }
    }
    const currentDeleteSignatureList = signatureList.slice(
      start,
      start + operation.deleteCount
    )
    if (
      deleteSignatureList.length &&
      currentDeleteSignatureList.some((signature, index) => {
        return signature !== deleteSignatureList[index]
      })
    ) {
      return {
        isApplied: false,
        reason: 'delete-signature-mismatch-refresh'
      }
    }
    signatureList.splice(start, operation.deleteCount)
    return { isApplied: true, reason: 'contiguous-delete' }
  }

  /** 用当前数组真相重建 mirror。 */
  private refreshMirrorFromTruth(reason: string) {
    if (!this.mirrorEnabled) {
      return
    }
    this.mirrorSignatureList = this.elementList.map(element => {
      return this.createElementSignature(element)
    })
    this.mirrorLastReplayReason = reason
    this.updateMirrorObservation()
  }

  /** 更新 mirror 观测统计并返回 mirror 是否与数组抽样一致。 */
  private updateMirrorObservation() {
    const nextLength = this.mirrorSignatureList.length
    const nextSignature = this.createSampleSignature(this.mirrorSignatureList)
    const truthSignature = this.createSampleSignatureFromElements()
    const nextMatch =
      nextLength === this.elementList.length && nextSignature === truthSignature
    this.mirrorCheckCount++
    if (!nextMatch) {
      this.mirrorMismatchCount++
    }
    this.mirrorLastMatch = nextMatch
    this.mirrorLength = nextLength
    this.mirrorSignature = nextSignature
    return nextMatch
  }

  /** 创建抽样签名，避免为了调试统计每次都序列化整篇正文。 */
  private createSampleSignature(signatureList: string[]) {
    const length = signatureList.length
    if (!length) {
      return '0:'
    }
    const indexList = this.createSampleIndexList(length)
    const valueSignature = indexList
      .map(index => `${index}:${signatureList[index]}`)
      .join('|')
    return `${length}:${valueSignature}`
  }

  /** 用数组真相创建抽样签名。 */
  private createSampleSignatureFromElements() {
    const length = this.elementList.length
    if (!length) {
      return '0:'
    }
    const indexList = this.createSampleIndexList(length)
    const valueSignature = indexList
      .map(index => {
        return `${index}:${this.createElementSignature(this.elementList[index])}`
      })
      .join('|')
    return `${length}:${valueSignature}`
  }

  /** 创建抽样索引列表。 */
  private createSampleIndexList(length: number) {
    return Array.from(
      new Set([
        0,
        Math.floor(length / 4),
        Math.floor(length / 2),
        Math.floor((length * 3) / 4),
        length - 1
      ])
    ).filter(index => index >= 0 && index < length)
  }

  /** 归一化 splice 起点，保持和数组 splice 的起点语义一致。 */
  private normalizeSpliceStart(start: number, length: number) {
    if (start < 0) {
      return Math.max(length + start, 0)
    }
    return Math.min(start, length)
  }

  /** 统计窗口只保留轻量字段，不保留完整插入签名列表。 */
  private createStatsOperation(operation: IDocumentTextStoreOperation) {
    const {
      insertSignatureList,
      insertSignatureCount = insertSignatureList?.length,
      deleteIndexList,
      deleteSignatureList,
      deleteIndexCount = deleteIndexList?.length,
      deleteSignatureCount = deleteSignatureList?.length,
      ...rest
    } = operation
    return {
      ...rest,
      insertSignatureCount,
      deleteIndexCount,
      deleteSignatureCount
    }
  }

  /** 创建单个元素的轻量签名，覆盖类型、文本和常见结构规模。 */
  private createElementSignature(element: TElement | undefined) {
    return createDocumentTextStoreElementSignature(element)
  }
}
