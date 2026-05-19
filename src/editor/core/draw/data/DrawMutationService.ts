import { ZERO } from '../../../dataset/constant/Common'
import { ControlComponent } from '../../../dataset/enum/Control'
import { ElementType } from '../../../dataset/enum/Element'
import { EditorMode } from '../../../dataset/enum/Editor'
import {
  IAppendElementListOption
} from '../../../interface/Draw'
import { IEditorData, ISetValueOption } from '../../../interface/Editor'
import {
  IElement,
  IInsertElementListOption,
  ISpliceElementListOption
} from '../../../interface/Element'
import { deepClone } from '../../../utils'
import { formatElementList } from '../../../utils/element'
import type { Draw } from '../Draw'
import {
  ASYNC_INSERT_THRESHOLD,
  createRawInsertBatchList,
  getRawInsertWeight
} from './DrawInsertBatcher'
import {
  AsyncInsertTransactionManager,
  IAsyncInsertBatchInsertOption,
  IAsyncInsertTransactionStats
} from './AsyncInsertTransactionManager'
import { ProgrammaticTypingBatcher } from './ProgrammaticTypingBatcher'

export type { IAsyncInsertTransactionStats }

/**
 * Draw 文档写操作服务。
 *
 * 负责把插入、追加、替换、删除、整体 setValue 等正文修改操作
 * 收敛到统一入口中，避免这些过程型逻辑继续散落在 `Draw` 门面。
 */
export class DrawMutationService {
  /** 批量插入单片最大长度，避免超大粘贴一次 spread 触发调用栈或参数数量限制。 */
  private static readonly INSERT_CHUNK_SIZE = 8192
  /** 程序化连续单字符输入合并器。 */
  private readonly programmaticTypingBatcher: ProgrammaticTypingBatcher
  /** 大粘贴后台事务状态机。 */
  private readonly asyncInsertTransactionManager: AsyncInsertTransactionManager
  /** 内部插入正在调用 splice，避免把自身后台事务误判为外部编辑打断。 */
  private isInternalInsertSplice = false

  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {
    this.programmaticTypingBatcher = new ProgrammaticTypingBatcher(batch => {
      this.insertElementList(batch.elementList, {
        isSubmitHistory: batch.isSubmitHistory
      })
    })
    this.asyncInsertTransactionManager = new AsyncInsertTransactionManager(
      (batch, options) => this.insertElementList(batch, options),
      isSubmitHistory => this.renderAfterAsyncInsert(isSubmitHistory)
    )
  }

  /**
   * 在光标位置插入元素列表。
   *
   * 支持在正文和控件中插入元素，会处理范围选择和列表格式化。
   *
   * @param payload - 要插入的元素列表
   * @param options - 插入选项
   * @param options.isSubmitHistory - 是否提交到历史记录，默认为 true
   */
  public insertElementList(
    payload: IElement[],
    options: IAsyncInsertBatchInsertOption = {}
  ) {
    const components = this.draw.getComponents()
    // 如果元素列表为空或当前不允许输入，直接返回
    if (!payload.length || !components.range.getIsCanInput()) return
    // 获取编辑边界范围
    const { startIndex, endIndex } = components.range.getEditBoundaryRange()
    // 如果没有有效的边界，直接返回
    if (!~startIndex && !~endIndex) return
    const { isSubmitHistory = true } = options
    if (!options.isSilentBatch && !options.asyncInsertTransactionId) {
      this.asyncInsertTransactionManager.cancel('insert-element-list')
    }
    if (this.tryQueueProgrammaticTyping(payload, options, isSubmitHistory)) {
      return
    }
    if (this.tryQueueLargeInsert(payload, options, isSubmitHistory)) {
      return
    }
    // 格式化元素列表
    formatElementList(payload, {
      isHandleFirstElement: false,
      editorOptions: this.draw.getRuntime().getOptions()
    })
    let curIndex = -1
    // 获取当前激活的控件
    let activeControl = components.control.getActiveControl()
    // 如果范围在控件内但没有激活控件，初始化控件
    if (!activeControl && components.control.getIsRangeWithinControl()) {
      components.control.initControl()
      activeControl = components.control.getActiveControl()
    }
    // 如果在控件范围内，使用控件设置值
    if (activeControl && components.control.getIsRangeWithinControl()) {
      curIndex = activeControl.setValue(payload, undefined, {
        isIgnoreDisabledRule: true
      })
      // 触发控件内容变更事件
      components.control.emitControlContentChange()
    } else {
      // 获取当前元素列表
      const elementList = this.draw.getElementList()
      // 判断是否为折叠光标（光标位置前后相同）
      const isCollapsed = startIndex === endIndex
      const start = startIndex + 1
      // 如果不是折叠光标，先删除选中范围内的元素
      if (!isCollapsed) {
        this.withInternalInsertSplice(() => {
          this.spliceElementList(elementList, start, endIndex - startIndex)
        })
      }
      // 在指定位置插入新元素
      this.withInternalInsertSplice(() => {
        this.spliceElementList(elementList, start, 0, payload)
      })
      curIndex = startIndex + payload.length
      // 获取插入位置前的元素
      const preElement = elementList[start - 1]
      // 如果插入的元素有列表ID，且前一个元素是空的文本元素，移除该前元素
      if (
        payload[0].listId &&
        preElement &&
        !preElement.listId &&
        preElement?.value === ZERO &&
        (!preElement.type || preElement.type === ElementType.TEXT)
      ) {
        elementList.splice(startIndex, 1)
        curIndex -= 1
      }
    }
    // 如果有有效的光标位置，设置范围并渲染
    if (~curIndex) {
      components.range.setRange(curIndex, curIndex)
      // 批量插入后的真实坐标由 chunk patch 刷新，逻辑索引必须先同步给后续删除 / 输入读取。
      components.position.setCursorLogicalIndex(curIndex)
      if (options.isSilentBatch) {
        return
      }
      this.draw.render({
        curIndex,
        isSubmitHistory,
        // 插入元素列表常用于粘贴和程序化批量输入，高页数文档下必须避免全页 lazy 重建。
        isTyping: true,
        typingInsertedCount: payload.length,
        // 命令插入由正式 chunk patch 提交运行时布局，避免每次 API 输入再做一次 canvas 预览绘制。
        isSkipTypingPreview: true,
        // 程序化连续输入保持已有焦点即可，避免每个字符都调度一次 DOM focus。
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 大批量粘贴按原始输入体量拆成多批，避免单个超长文本格式化后同步撑爆页面。 */
  private tryQueueLargeInsert(
    payload: IElement[],
    options: IAsyncInsertBatchInsertOption,
    isSubmitHistory: boolean
  ) {
    const rawWeight = getRawInsertWeight(payload)
    if (rawWeight <= ASYNC_INSERT_THRESHOLD) {
      this.asyncInsertTransactionManager.recordSyncFallback('below-threshold')
      return false
    }
    if (options.asyncInsertTransactionId) {
      this.asyncInsertTransactionManager.recordSyncFallback(
        'async-transaction-batch'
      )
      return false
    }
    if (this.draw.getZone().isHeaderActive()) {
      this.asyncInsertTransactionManager.recordSyncFallback('header-context')
      return false
    }
    if (this.draw.getZone().isFooterActive()) {
      this.asyncInsertTransactionManager.recordSyncFallback('footer-context')
      return false
    }
    if (this.draw.getComponents().position.getPositionContext().isTable) {
      this.asyncInsertTransactionManager.recordSyncFallback('table-context')
      return false
    }
    if (this.draw.getComponents().control.getActiveControl()) {
      this.asyncInsertTransactionManager.recordSyncFallback('control-context')
      return false
    }
    const batchList = createRawInsertBatchList(payload)
    const firstBatch = batchList[0] || []
    const restBatchList = batchList.slice(1)
    const transaction = this.asyncInsertTransactionManager.start({
      batchList: restBatchList,
      insertOptions: options,
      isSubmitHistory,
      rawWeight,
      totalBatchCount: batchList.length
    })
    const firstBatchStartTime = performance.now()
    this.insertElementList(firstBatch, {
      ...options,
      isSubmitHistory: false,
      asyncInsertTransactionId: transaction.id
    })
    this.asyncInsertTransactionManager.markFirstBatchCompleted(
      transaction.id,
      performance.now() - firstBatchStartTime
    )
    this.asyncInsertTransactionManager.schedule(transaction.id)
    return true
  }

  /**
   * 同步收敛仍在后台推进的大粘贴事务。
   *
   * 保存、导出、打印、取值等读取型入口需要完整文档数据，不能读取到后台事务中间态。
   */
  public flushAsyncInsertTransaction(reason = 'manual') {
    return this.asyncInsertTransactionManager.flush(reason)
  }

  /** 大粘贴后台批次完成后统一完整 layout，收敛 pageRow / position / chunk 派生状态。 */
  private renderAfterAsyncInsert(isSubmitHistory: boolean) {
    this.draw.getServices().chunkLayoutPipeline.resetPageRebalanceQueue()
    const { endIndex } = this.draw.getComponents().range.getEditBoundaryRange()
    const curIndex = Math.max(0, endIndex)
    const layoutStartTime = performance.now()
    this.draw.render({
      curIndex,
      isSubmitHistory,
      isSetCursor: false,
      isLazy: false,
      pageRenderScope: 'visible'
    })
    this.asyncInsertTransactionManager.recordFinalLayout({
      durationMs: performance.now() - layoutStartTime,
      pageCount: this.draw.getPageRowList().length
    })
  }

  /** 获取大批量插入事务统计。 */
  public getAsyncInsertStats(): IAsyncInsertTransactionStats {
    return this.asyncInsertTransactionManager.getStats()
  }

  /** 重置大批量插入事务统计，不取消当前事务。 */
  public resetAsyncInsertStats() {
    this.asyncInsertTransactionManager.resetStats()
  }

  /** 尝试把连续程序化单字符输入合并，避免每个字符都移动大文档数组尾部。 */
  private tryQueueProgrammaticTyping(
    payload: IElement[],
    options: IInsertElementListOption,
    isSubmitHistory: boolean
  ) {
    return this.programmaticTypingBatcher.tryQueue({
      elementList: payload,
      options,
      isSubmitHistory,
      isSelection: this.draw.getComponents().range.getIsSelection(),
      isTableContext: this.draw.getComponents().position.getPositionContext().isTable
    })
  }

  /**
   * 追加或前置元素列表到正文区域。
   *
   * 支持在正文区域的开头或结尾添加元素列表。
   *
   * @param elementList - 要追加的元素列表
   * @param options - 追加选项
   * @param options.isPrepend - 是否前置（插入到开头），默认为 false
   * @param options.isSubmitHistory - 是否提交到历史记录，默认为 true
   */
  public appendElementList(
    elementList: IElement[],
    options: IAppendElementListOption = {}
  ) {
    // 如果元素列表为空，直接返回
    if (!elementList.length) return
    this.asyncInsertTransactionManager.cancel('append-element-list')
    // 格式化元素列表
    formatElementList(elementList, {
      isHandleFirstElement: false,
      editorOptions: this.draw.getRuntime().getOptions()
    })
    let curIndex: number
    const { isPrepend, isSubmitHistory = true } = options
    // 获取正文元素列表
    const mainElementList = this.draw.getOriginalMainElementList()
    // 如果是前置模式，在开头插入；否则在末尾追加
    if (isPrepend) {
      // 有起始占位符时保留占位符；否则真正插到正文第一项之前。
      const insertIndex = mainElementList[0]?.value === ZERO ? 1 : 0
      mainElementList.splice(insertIndex, 0, ...elementList)
      curIndex = insertIndex + elementList.length - 1
    } else {
      // 在末尾追加元素
      mainElementList.push(...elementList)
      curIndex = mainElementList.length - 1
    }
    // 设置选区到插入位置
    this.draw.getComponents().range.setRange(curIndex, curIndex)
    this.draw.syncEditor2DocumentTree()
    // 渲染文档
    this.draw.render({
      curIndex,
      isSubmitHistory
    })
  }

  /**
   * 修改元素列表。
   *
   * 支持删除和插入元素，会处理列表格式化和可删除规则。
   *
   * @param elementList - 要修改的元素列表
   * @param start - 起始索引
   * @param deleteCount - 要删除的元素数量
   * @param items - 要插入的元素列表（可选）
   * @param options - 修改选项
   * @param options.isIgnoreDeletedRule - 是否忽略删除规则，默认为 false
   */
  public spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount: number,
    items?: IElement[],
    options?: ISpliceElementListOption
  ) {
    const isMainElementListMutation =
      elementList === this.draw.getOriginalMainElementList()
    const oldLength = isMainElementListMutation ? elementList.length : 0
    const deleteRecordList: Array<{ index: number; signature: string }> = []
    if (!this.isInternalInsertSplice) {
      this.asyncInsertTransactionManager.cancel('splice-element-list')
    }
    const { isIgnoreDeletedRule = false } = options || {}
    const { group, modeRule } = this.draw.getRuntime().getOptions()
    // 如果有需要删除的元素
    if (deleteCount > 0) {
      // 计算结束索引
      const endIndex = start + deleteCount
      const endElement = elementList[endIndex]
      const endElementListId = endElement?.listId
      // 如果删除的最后一个元素属于某个列表，且前一个元素不属于该列表，需要处理后续列表格式
      if (
        endElementListId &&
        elementList[start - 1]?.listId !== endElementListId
      ) {
        let startIndex = endIndex
        // 遍历后续元素，清除列表属性，直到遇到不同列表或零元素
        while (startIndex < elementList.length) {
          const curElement = elementList[startIndex]
          if (
            curElement.listId !== endElementListId ||
            curElement.value === ZERO
          ) {
            break
          }
          // 清除列表相关属性
          delete curElement.listId
          delete curElement.listType
          delete curElement.listStyle
          delete curElement.listLevel
          startIndex++
        }
      }
      const isWithinControl = this.draw
        .getComponents()
        .control.getIsRangeWithinControl()
      const isDisableControlDeleteInFormMode =
        this.draw.getMode() === EditorMode.FORM &&
        modeRule[EditorMode.FORM].controlDeletableDisabled
      // 如果不忽略删除规则且不在设计模式，则执行可删除性检查
      if (
        !isIgnoreDeletedRule &&
        !this.draw.isDesignMode() &&
        (!isWithinControl || isDisableControlDeleteInFormMode)
      ) {
        // 获取当前表格单元格的可删除性设置
        const tdDeletable = this.draw.getTd()?.deletable
        let deleteIndex = endIndex - 1
        // 从后向前遍历要删除的元素，根据可删除规则判断是否删除
        while (deleteIndex >= start) {
          const deleteElement = elementList[deleteIndex]
          // 判断元素是否可删除（根据隐藏属性、可删除性、表单模式规则等）
          if (
            deleteElement?.hide ||
            deleteElement?.control?.hide ||
            deleteElement?.area?.hide ||
            (tdDeletable !== false &&
              deleteElement?.control?.deletable !== false &&
              (!isDisableControlDeleteInFormMode ||
                !deleteElement?.controlId ||
                deleteElement.controlComponent === ControlComponent.VALUE) &&
              deleteElement?.title?.deletable !== false &&
              (group.deletable !== false || !deleteElement?.groupIds?.length) &&
              (deleteElement?.area?.deletable !== false ||
                deleteElement?.areaIndex !== 0))
          ) {
            if (isMainElementListMutation) {
              deleteRecordList.push({
                index: deleteIndex,
                signature: this.draw.createDocumentTextStoreElementSignature(
                  deleteElement
                )
              })
            }
            elementList.splice(deleteIndex, 1)
          }
          deleteIndex--
        }
      } else {
        // 直接删除指定数量的元素
        if (isMainElementListMutation) {
          elementList
            .slice(start, endIndex)
            .forEach((deleteElement, offset) => {
              deleteRecordList.push({
                index: start + offset,
                signature: this.draw.createDocumentTextStoreElementSignature(
                  deleteElement
                )
              })
            })
        }
        elementList.splice(start, deleteCount)
      }
    }
    // 如果有需要插入的元素
    if (items?.length) {
      // 粘贴和批量输入必须一次移动数组尾部，不能逐元素 splice 整篇文档。
      this.insertElementListByChunks(elementList, start, items)
    }
    if (isMainElementListMutation) {
      const insertCount = items?.length || 0
      const actualDeleteCount = Math.max(
        0,
        oldLength + insertCount - elementList.length
      )
      const insertStart = this.normalizeSpliceStart(start, oldLength)
      const insertSignatureList = insertCount
        ? elementList.slice(insertStart, insertStart + insertCount).map(element => {
            return this.draw.createDocumentTextStoreElementSignature(element)
          })
        : []
      this.draw.recordDocumentTextStoreExternalMutation({
        start,
        deleteCount: actualDeleteCount,
        insertCount,
        insertSignatureList,
        deleteIndexList: deleteRecordList.map(record => record.index),
        deleteSignatureList: deleteRecordList.map(record => record.signature)
      })
    }
  }

  /**
   * 分片批量插入元素。
   *
   * 大文档在靠前位置粘贴时，逐元素 splice 会反复移动后续几十万节点；
   * 这里按片插入，把数组搬移次数降到极少，保持粘贴链路可预测。
   *
   * @param elementList - 目标元素数组
   * @param start - 插入起点
   * @param items - 待插入元素
   */
  private insertElementListByChunks(
    elementList: IElement[],
    start: number,
    items: IElement[]
  ) {
    for (
      let offset = 0;
      offset < items.length;
      offset += DrawMutationService.INSERT_CHUNK_SIZE
    ) {
      const chunk = items.slice(
        offset,
        offset + DrawMutationService.INSERT_CHUNK_SIZE
      )
      elementList.splice(start + offset, 0, ...chunk)
    }
  }

  /** 按数组 splice 语义归一化起点，用于外部数组写入的 mirror 签名采样。 */
  private normalizeSpliceStart(start: number, length: number) {
    if (start < 0) {
      return Math.max(length + start, 0)
    }
    return Math.min(start, length)
  }

  /** 标记当前 splice 来自 insertElementList 内部，避免后台大粘贴事务被自身批次取消。 */
  private withInternalInsertSplice(callback: () => void) {
    this.isInternalInsertSplice = true
    try {
      callback()
    } finally {
      this.isInternalInsertSplice = false
    }
    this.draw.syncEditor2DocumentTree()
  }

  /**
   * 设置编辑器数据。
   *
   * 批量设置页眉、正文和页脚的数据，支持格式化和光标位置设置。
   *
   * @param payload - 编辑器数据
   * @param options - 设置选项
   * @param options.isSetCursor - 是否设置光标位置，默认为 false
   */
  public setValue(payload: Partial<IEditorData>, options?: ISetValueOption) {
    this.asyncInsertTransactionManager.cancel('set-value')
    // 深度克隆输入数据
    const { header, main, footer } = deepClone(payload)
    // 如果所有区域都为空，直接返回
    if (!header && !main && !footer) return
    const { isSetCursor = false } = options || {}
    // 整理各区域数据
    const pageComponentData = [header, main, footer]
    // 遍历每个区域，格式化元素列表
    pageComponentData.forEach(data => {
      if (!data) return
      formatElementList(data, {
        editorOptions: this.draw.getRuntime().getOptions(),
        isForceCompensation: true
      })
    })
    // 设置编辑器数据
    this.draw.setEditorData({
      header,
      main,
      footer
    })
    // 恢复历史记录
    this.draw.getComponents().historyManager.recovery()
    // 根据选项计算光标位置
    const curIndex = isSetCursor
      ? main?.length
        ? main.length - 1
        : 0
      : undefined
    // 如果需要设置光标，设置选区范围
    if (curIndex !== undefined) {
      this.draw.getComponents().range.setRange(curIndex, curIndex)
    }
    // 渲染文档
    this.draw.render({
      curIndex,
      isSetCursor,
      isFirstRender: true
    })
  }
}
