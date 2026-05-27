import { CommandAdaptBase } from './CommandAdaptBase'
import { ZERO } from '../../dataset/constant/Common'
import { EditorMode, EditorZone } from '../../dataset/enum/Editor'
import { MoveDirection } from '../../dataset/enum/Observer'
import { IForceUpdateOption } from '../../interface/Draw'
import { IEditorData, ISetValueOption, IUpdateOption } from '../../interface/Editor'
import { IElement, IElementPosition, IInsertElementListOption } from '../../interface/Element'
import { ICopyOption, IPasteOption } from '../../interface/Event'
import { IRange } from '../../interface/Range'
import { formatElementContext } from '../../utils/element'
import { mergeOption } from '../../utils/option'

/**
 * 基础命令适配模块，负责编辑模式、剪贴板、选区、历史、插入和全局配置等通用命令。
 */
export class CommandAdaptCore extends CommandAdaptBase {
  /** 切换编辑器工作模式。 */
  public mode(payload: EditorMode) {
    this.draw.setMode(payload)
  }

  /** 剪切当前选区内容。 */
  public cut() {
    if (this.isCommandDisabled()) return
    this.canvasEvent.cut()
  }

  /** 复制当前选区内容。 */
  public copy(payload?: ICopyOption) {
    this.canvasEvent.copy(payload)
  }

  /** 通过命令入口粘贴剪贴板内容。 */
  public paste(payload?: IPasteOption) {
    if (this.isCommandDisabled()) return
    this.canvasEvent.getClipboardController().pasteByApi(payload)
  }

  /** 选中当前编辑区域的全部内容。 */
  public selectAll() {
    this.canvasEvent.selectAll()
  }

  /** 执行退格删除，并对连续程序化删除做渲染合并。 */
  public backspace() {
    if (this.isCommandDisabled()) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const startElement = this.draw.getTargetResolver().resolveRangeElement({
      elementList
    })
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    const isCollapsed = startIndex === endIndex
    // 首字符禁止删除
    if (
      isCollapsed &&
      startElement?.value === ZERO &&
      startIndex === 0
    ) {
      return
    }
    if (!isCollapsed) {
      this.draw.spliceElementList(
        elementList,
        startIndex + 1,
        endIndex - startIndex
      )
    } else {
      this.draw.spliceElementList(elementList, startIndex, 1)
    }
    let curIndex = isCollapsed ? startIndex - 1 : startIndex
    const typingEditIndex = isCollapsed ? startIndex : startIndex + 1
    const typingInsertedCount = isCollapsed ? -1 : -(endIndex - startIndex)
    let isImmediateTypingCompute = false
    if (!elementList.length) {
      // 清空文档后保留一个零宽占位符，保证后续输入仍有合法锚点。
      elementList.push({ value: ZERO })
      curIndex = 0
      isImmediateTypingCompute = true
    }
    this.range.setRange(curIndex, curIndex)
    this.coordinate.setCursorLogicalIndex(curIndex)
    if (!isCollapsed || isImmediateTypingCompute) {
      // 选区删除会重建较大结构，立即完整 render，保证清空后马上输入的基础语义。
      this.draw.render({ curIndex })
      this.draw.getComponents().cursor.focus()
      return
    }
    if (this.draw.getTrackChange().isEnabled()) {
      // 留痕删除不会缩短数组，不能复用负增量 typing patch，改走可见页正式重排。
      this.draw.render({
        curIndex,
        isLazy: false,
        pageRenderScope: 'visible'
      })
      this.draw.getComponents().cursor.focus()
      return
    }
    // 命令层折叠退格属于高频编辑路径，必须避免在大文档下同步触发整篇排版。
    this.queueProgrammaticBackspaceRender({
      curIndex,
      typingEditIndex,
      deletedCount: Math.abs(typingInsertedCount)
    })
    // 退格后立即聚焦输入代理，避免 Cypress / 浏览器下一次输入落到旧焦点。
    this.draw.getComponents().cursor.focus()
  }

  /** 合并程序化连续退格，避免 API 循环中每次删除都同步重绘可见页。 */

  private queueProgrammaticBackspaceRender(payload: {
    curIndex: number
    typingEditIndex: number
    deletedCount: number
  }) {
    if (this.coordinate.getPositionContext().isTable) {
      // 表格退格属于 td 局部索引空间，不能用主文档 DocumentChunkIndex 合并批次。
      this.draw.render({
        curIndex: payload.curIndex,
        isTyping: true,
        typingEditIndex: payload.typingEditIndex,
        typingInsertedCount: -payload.deletedCount,
        isSkipTypingPreview: true,
        isLazy: false,
        pageRenderScope: 'visible'
      })
      return
    }
    const chunk = this.draw
      .getServices()
      .documentChunkIndex.getChunkByIndex(payload.typingEditIndex)
    if (
      this.pendingProgrammaticBackspaceBatch &&
      this.pendingProgrammaticBackspaceBatch.chunk !== chunk
    ) {
      this.flushProgrammaticBackspaceBatch()
    }
    if (!this.pendingProgrammaticBackspaceBatch) {
      this.pendingProgrammaticBackspaceBatch = {
        curIndex: payload.curIndex,
        editIndex: payload.typingEditIndex,
        deletedCount: 0,
        chunk,
        flushTimer: null
      }
    }
    const batch = this.pendingProgrammaticBackspaceBatch
    batch.curIndex = payload.curIndex
    batch.editIndex = Math.min(batch.editIndex, payload.typingEditIndex)
    batch.deletedCount += payload.deletedCount
    if (batch.flushTimer !== null) {
      window.clearTimeout(batch.flushTimer)
    }
    batch.flushTimer = window.setTimeout(() => {
      this.flushProgrammaticBackspaceBatch()
    }, 0)
  }

  /** 立即提交已合并的程序化退格批次。 */

  private flushProgrammaticBackspaceBatch() {
    const batch = this.pendingProgrammaticBackspaceBatch
    if (!batch) {
      return
    }
    if (batch.flushTimer !== null) {
      window.clearTimeout(batch.flushTimer)
    }
    this.pendingProgrammaticBackspaceBatch = null
    this.draw.render({
      curIndex: batch.curIndex,
      isTyping: true,
      typingEditIndex: batch.editIndex,
      typingInsertedCount: -batch.deletedCount,
      // 删除类输入没有新增文字预览收益，直接交给 chunk patch 写回运行时布局。
      isSkipTypingPreview: true,
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }

  /** 设置主文档或表格单元格中的编辑选区。 */
  public setRange(
    startIndex: number,
    endIndex: number,
    tableId?: string,
    startTdIndex?: number,
    endTdIndex?: number,
    startTrIndex?: number,
    endTrIndex?: number
  ) {
    if (startIndex < 0 || endIndex < 0 || endIndex < startIndex) return
    let nextStartIndex = startIndex
    let nextEndIndex = endIndex
    const editableElementList = this.draw.getObjectResolver().getElementList()
    if (!editableElementList.length) return
    const maxEditableIndex = editableElementList.length - 1
    const positionContext = this.coordinate.getPositionContext()
    const targetTableId = tableId || positionContext.tableId
    const targetStartTrIndex =
      startTrIndex ?? positionContext.trIndex
    const targetStartTdIndex =
      startTdIndex ?? positionContext.tdIndex
    const targetEndTrIndex =
      endTrIndex ?? positionContext.trIndex
    const targetEndTdIndex =
      endTdIndex ?? positionContext.tdIndex
    let targetTableCellMaxIndex = maxEditableIndex
    if (
      targetTableId &&
      targetStartTrIndex !== undefined &&
      targetStartTdIndex !== undefined
    ) {
      const tableContext = this.draw
        .getTargetResolver()
        .resolveOriginalTableById(targetTableId)
      const td = tableContext
        ? this.draw.getTargetResolver().resolveOriginalTableTdByIndex({
            tableIndex: tableContext.index,
            trIndex: targetStartTrIndex,
            tdIndex: targetStartTdIndex
          })?.td
        : null
      const leadingOffset =
        td?.value?.[0]?.value === ZERO && td.value[1] ? 1 : 0
      if (nextStartIndex === nextEndIndex) {
        nextStartIndex += leadingOffset
        nextEndIndex += leadingOffset
      }
      if (td?.value?.length) {
        targetTableCellMaxIndex = td.value.length - 1
      }
    }
    nextStartIndex = Math.min(nextStartIndex, targetTableCellMaxIndex)
    nextEndIndex = Math.min(nextEndIndex, targetTableCellMaxIndex)
    if (nextEndIndex < nextStartIndex) return
    this.range.setRange(
      nextStartIndex,
      nextEndIndex,
      targetTableId,
      targetStartTdIndex,
      targetEndTdIndex,
      targetStartTrIndex,
      targetEndTrIndex
    )
    if (
      targetTableId &&
      targetStartTrIndex !== undefined &&
      targetStartTdIndex !== undefined
    ) {
      this.setPositionContext({
        startIndex: nextStartIndex,
        endIndex: nextEndIndex,
        tableId: targetTableId,
        startTdIndex: targetStartTdIndex,
        endTdIndex: targetEndTdIndex,
        startTrIndex: targetStartTrIndex,
        endTrIndex: targetEndTrIndex
      })
    } else if (!targetTableId) {
      this.coordinate.setPositionContext({
        isTable: false
      })
    }
    const isCollapsed = nextStartIndex === nextEndIndex
    let hasResolvedTableCursor = false
    if (isCollapsed && targetTableId) {
      const tablePositionList = this.coordinate.getPositionList()
      const tableCursorPosition =
        tablePositionList[nextEndIndex] ||
        tablePositionList[tablePositionList.length - 1] ||
        null
      if (tableCursorPosition) {
        this.coordinate.setCursorPosition(tableCursorPosition)
        hasResolvedTableCursor = true
      }
    }
    this.draw.render({
      curIndex: isCollapsed ? nextStartIndex : undefined,
      isCompute: false,
      isSubmitHistory: false,
      isSetCursor: isCollapsed && !hasResolvedTableCursor,
      pageRenderScope: 'visible'
    })
    if (isCollapsed) {
      const cursorPosition = this.draw.getCoordinate().getCursorPosition()
      if (cursorPosition) {
        this.draw.getCursor().moveCursorToVisible({
          cursorPosition,
          direction: MoveDirection.DOWN
        })
      }
    }
  }

  /** 用给定选区对象替换当前选区。 */
  public replaceRange(range: IRange) {
    this.setRange(
      range.startIndex,
      range.endIndex,
      range.tableId,
      range.startTdIndex,
      range.endTdIndex,
      range.startTrIndex,
      range.endTrIndex
    )
  }

  /** 根据选区刷新位置上下文，尤其是表格单元格上下文。 */
  public setPositionContext(range: IRange) {
    const { tableId, startTrIndex, startTdIndex, startIndex } = range
    if (
      tableId &&
      startTrIndex !== undefined &&
      startTdIndex !== undefined
    ) {
      const tableContext = this.draw.getTargetResolver().resolveOriginalTableById(
        tableId
      )
      if (!tableContext) return
      const tableElementIndex = tableContext.index
      const tableElement = tableContext.element
      const tableCell = this.draw.getTargetResolver().resolveOriginalTableTdByIndex({
        tableIndex: tableElementIndex,
        trIndex: startTrIndex,
        tdIndex: startTdIndex
      })
      const tr = tableCell?.tr
      const td = tableCell?.td
      if (!tableElement.id || !tr?.id || !td?.id) return
      const targetSlice =
      this.draw.getTargetResolver().resolveCellSliceByAbsoluteIndex({
          tableId: tableElement.id,
          trId: tr.id,
          tdId: td.id,
          absoluteIndex: startIndex
        }) ||
      this.draw.getTargetResolver().getCellSlicesByLogicalCell({
          tableId: tableElement.id,
          trId: tr.id,
          tdId: td.id
        }).slice(-1)[0] ||
        null
      this.coordinate.setPositionContext({
        isTable: true,
        index: tableElementIndex,
        trIndex: startTrIndex,
        tdIndex: startTdIndex,
        tdId: targetSlice?.fragmentTdId || td.id,
        trId: targetSlice?.fragmentTrId || tr.id,
        tableId: targetSlice?.fragmentTableId || tableElement.id
      })
    } else {
      this.coordinate.setPositionContext({
        isTable: false
      })
    }
  }

  /** 强制重新渲染编辑器内容。 */
  public forceUpdate(options?: IForceUpdateOption) {
    const { isSubmitHistory = false } = options || {}
    this.range.clearRange()
    this.draw.render({
      isSubmitHistory,
      isSetCursor: false
    })
  }

  /** 清理选区并恢复光标显示状态。 */
  public blur() {
    this.range.clearRange()
    this.draw.getCursor().recoveryCursor()
  }

  /** 撤销最近一次可撤销操作。 */
  public undo() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.draw.flushAsyncInsertTransaction('command-undo')
    this.historyManager.undo()
  }

  /** 重做最近一次已撤销操作。 */
  public redo() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.draw.flushAsyncInsertTransaction('command-redo')
    this.historyManager.redo()
  }

  /** 关闭历史记录提交。 */
  public disableHistory() {
    this.historyManager.disable()
    this.draw.getServices().historyBridge.cancelTypingHistory()
  }

  /** 开启历史记录提交并补交当前状态。 */
  public enableHistory() {
    this.historyManager.enable()
    this.draw.submitHistory(undefined)
  }

  /** 获取当前光标在页面中的位置信息。 */
  public getCursorPosition(): IElementPosition | null {
    const publicCursorPosition = this.range.getPublicCursorPosition()
    if (publicCursorPosition) {
      return publicCursorPosition
    }

    const editBoundaryRange = this.range.getEditBoundaryRange()
    const { startIndex, endIndex } = editBoundaryRange
    if (!~startIndex && !~endIndex) {
      return null
    }
    if (startIndex !== endIndex) {
      return null
    }

    const positionList = this.coordinate.getPositionList()
    const directPosition = positionList[endIndex] || null
    if (directPosition) {
      return directPosition
    }

    const { tableId, startTrIndex, startTdIndex } = editBoundaryRange
    if (
      tableId &&
      startTrIndex !== undefined &&
      startTdIndex !== undefined
    ) {
      const tableContext = this.draw.getTargetResolver().resolveOriginalTableById(
        tableId
      )
      if (tableContext) {
        const td = this.draw.getTargetResolver().resolveOriginalTableTdByIndex({
          tableIndex: tableContext.index,
          trIndex: startTrIndex,
          tdIndex: startTdIndex
        })?.td
        const tablePositionList = td?.positionList || []
        return tablePositionList[endIndex] || tablePositionList[tablePositionList.length - 1] || null
      }
    }

    return null
  }

  /** 获取当前编辑选区。 */
  public getRange(): IRange {
    return this.range.getPublicRange()
  }

  /** 在当前选区插入元素列表。 */
  public insertElementList(
    payload: IElement[],
    options: IInsertElementListOption = {}
  ) {
    if (!payload.length) return
    if (this.isCommandDisabled()) return
    const { isReplace = true } = options
    // 如果配置不替换时，需收缩选区至末尾
    if (!isReplace) {
      this.range.shrinkRange()
    }
    // 高频输入通常是文本元素，浅拷贝即可隔离调用方对象，避免每个字符 JSON 深克隆。
    const cloneElementList = payload.map(element => ({ ...element }))
    // 格式化上下文信息
    const { startIndex } = this.getRange()
    const elementList = this.draw.getObjectResolver().getElementList()
    formatElementContext(elementList, cloneElementList, startIndex, {
      isBreakWhenWrap: true,
      editorOptions: this.options
    })
    this.draw.insertElementList(cloneElementList, options)
  }

  /** 整体替换编辑器文档数据。 */
  public setValue(payload: Partial<IEditorData>, options?: ISetValueOption) {
    this.draw.setValue(payload, options)
  }

  /** 合并更新编辑器运行配置并刷新视图。 */
  public updateOptions(payload: IUpdateOption) {
    const newOption = mergeOption(payload)
    Object.entries(newOption).forEach(([key, value]) => {
      Reflect.set(this.options, key, value)
    })
    this.forceUpdate()
  }

  /** 切换当前编辑区域。 */
  public setZone(zone: EditorZone) {
    this.draw.getZone().setZone(zone)
  }
}
