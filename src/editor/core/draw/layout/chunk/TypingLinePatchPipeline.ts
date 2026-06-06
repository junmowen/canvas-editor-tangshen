import { EditorZone } from '../../../../dataset/enum/Editor'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import type { Draw } from '../../Draw'
import { IChunkLayoutPatchResult } from './ChunkLayoutTypes'
import {
  patchArraySegment,
  shiftRowsAfterPatch
} from './ChunkPatchAlgorithms'
import {
  applyTypingLinePatchRowContext,
  canPatchTypingLineElementList,
  getTypingLineControlPatchRiskReason,
  getTypingLinePatchPositionRiskReason,
  getTypingLinePatchRowShapeRiskReason,
  resolveTypingLinePatchElementRange
} from './TypingLinePatchPolicy'

/** typing行补丁stats契约，用于约束内部流程中传递的数据结构。 */
export interface ITypingLinePatchStats {
  /** 单行 patch 尝试次数。 */
  attemptCount: number
  /** 单行 patch 成功次数。 */
  patchSuccessCount: number
  /** 单行 patch 失败次数。 */
  patchFailCount: number
  /** 最近一次 patch 结果。 */
  lastResult: 'patched' | 'failed' | null
  /** 最近一次失败原因。 */
  lastFailReason: string | null
}

/** 输入态单行正式 patch 管线，负责把可预览的当前行写回 runtime。 */
export class TypingLinePatchPipeline {
  /** 单行 patch 统计。 */
  private stats: ITypingLinePatchStats = {
    attemptCount: 0,
    patchSuccessCount: 0,
    patchFailCount: 0,
    lastResult: null,
    lastFailReason: null
  }

  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  /**
   * 在 chunk patch 失败后尝试写回当前输入行。
   *
   * 这个路径只处理“当前行不换行、不扩高”的普通文本输入，
   * 不做整篇 layout，也不调度 idle 回放，避免复杂页内的输入停留在临时预览。
   */
  public patchAroundCursor(payload: {
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex?: number
    /** 编辑索引，用于定位本次修改发生的位置。 */
    editIndex?: number
    /** 已插入数量，用于累加本次写入的元素个数。 */
    insertedCount: number
  }): IChunkLayoutPatchResult {
    this.stats.attemptCount++
    const result = this.patchInternal(payload)
    if (result.patched) {
      this.stats.patchSuccessCount++
      this.stats.lastResult = 'patched'
      this.stats.lastFailReason = null
    } else {
      this.stats.patchFailCount++
      this.stats.lastResult = 'failed'
      this.stats.lastFailReason = result.reason || 'unknown'
    }
    return result
  }

  /** 获取单行 patch 统计。 */
  public getStats(): ITypingLinePatchStats {
    return { ...this.stats }
  }

  /** 重置单行 patch 统计。 */
  public resetStats() {
    this.stats = {
      attemptCount: 0,
      patchSuccessCount: 0,
      patchFailCount: 0,
      lastResult: null,
      lastFailReason: null
    }
  }

  /** 执行单行 patch 的核心逻辑。 */
  private patchInternal(payload: {
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex?: number
    /** 编辑索引，用于定位本次修改发生的位置。 */
    editIndex?: number
    /** 已插入数量，用于累加本次写入的元素个数。 */
    insertedCount: number
  }): IChunkLayoutPatchResult {
    const coordinate = this.draw.getCoordinate()
    const positionContext = coordinate.getPositionContext()
    const cursorPosition = coordinate.getCursorPosition()
    if (!cursorPosition || positionContext.isTable) {
      return this.fail('line-no-cursor-or-table')
    }
    const pageNo = cursorPosition.pageNo
    const pageRows = this.draw.getPageRowList()[pageNo] || []
    const sourceRow = pageRows[cursorPosition.rowNo]
    if (!sourceRow?.elementList?.length) {
      return this.fail('line-row-miss')
    }
    const sourceControlRisk =
      getTypingLineControlPatchRiskReason(sourceRow.elementList)
    if (sourceControlRisk) {
      return this.fail(sourceControlRisk)
    }
    if (!canPatchTypingLineElementList(sourceRow.elementList)) {
      return this.fail('line-complex-row')
    }
    const elementList = this.draw.getObjectResolver().getElementList()
    const startIndex = sourceRow.startIndex
    const oldElementCount = sourceRow.elementList.length
    const patchRange = resolveTypingLinePatchElementRange({
      elementCount: elementList.length,
      startIndex,
      oldElementCount,
      insertedCount: payload.insertedCount
    })
    if (!patchRange) {
      return this.fail('line-range-invalid')
    }
    const lineElementList = elementList.slice(
      patchRange.startIndex,
      patchRange.endIndex + 1
    )
    const nextControlRisk =
      getTypingLineControlPatchRiskReason(lineElementList)
    if (nextControlRisk) {
      return this.fail(nextControlRisk)
    }
    if (
      !lineElementList.length ||
      !canPatchTypingLineElementList(lineElementList)
    ) {
      return this.fail('line-next-complex-row')
    }
    const column = this.draw
      .getServices()
      .pageColumnLayoutService.getColumn(
        pageNo,
        sourceRow.columnIndex || 0,
        sourceRow.columns
      )
    const innerWidth = this.draw
      .getServices()
      .pageColumnLayoutService.getMeasurementColumnWidth(
        pageNo,
        sourceRow.columns
      )
    const startX = column.rect.x
    const startY = cursorPosition.coordinate.leftTop[1]
    if (sourceRow.isSurround) {
      return this.fail('line-surround-row')
    }
    const rowList = this.draw.computeRowList({
      startX,
      startY,
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(pageNo),
      startPageNo: pageNo,
      innerWidth,
      surroundElementList: [],
      elementList: lineElementList,
      sourceStartIndex: startIndex
    })
    const rowShapeRisk = getTypingLinePatchRowShapeRiskReason(rowList)
    if (rowShapeRisk) {
      return this.fail(rowShapeRisk)
    }
    applyTypingLinePatchRowContext({
      nextRow: rowList[0],
      sourceRow,
      startY
    })
    const nextPositionList: IElementPosition[] = []
    coordinate.computePageRowPosition({
      positionList: nextPositionList,
      rowList,
      pageNo,
      startX,
      startY,
      startRowIndex: sourceRow.rowIndex,
      startIndex,
      innerWidth,
      zone: EditorZone.MAIN
    })
    const positionRisk = getTypingLinePatchPositionRiskReason({
      lineElementList,
      positionList: nextPositionList
    })
    if (positionRisk) {
      return this.fail(positionRisk)
    }
    this.patchRuntime({
      pageNo,
      sourceRow,
      nextRow: this.createNextRow(rowList[0], sourceRow),
      lineElementList,
      nextPositionList,
      startIndex,
      oldElementCount,
      editIndex: payload.editIndex ?? payload.curIndex
    })
    return { patched: true, pageNo }
  }

  /** 把单行测量结果写回 runtime、pageRows、layoutElementList 和 positionList。 */
  private patchRuntime(payload: {
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo: number
    /** 来源行对象，用于和局部补丁后的下一行对照。 */
    sourceRow: IRow
    /** 下一行对象，用于局部补丁后承接溢出的行内容。 */
    nextRow: IRow
    /** 行内元素列表，保存参与本行局部补丁的元素。 */
    lineElementList: IElement[]
    /** 下一行位置列表，用于局部补丁后同步后续元素坐标。 */
    nextPositionList: IElementPosition[]
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 旧元素数量，用于计算增量变更后的索引偏移。 */
    oldElementCount: number
    /** 编辑索引，用于定位本次修改发生的位置。 */
    editIndex?: number
  }) {
    const runtimeRowList = this.draw.getRuntime().getRuntimeRowList()
    const pageRowList = this.draw.getPageRowList()
    const pageRows = pageRowList[payload.pageNo] || []
    const rowStart = runtimeRowList.indexOf(payload.sourceRow)
    const pageRowStart = pageRows.indexOf(payload.sourceRow)
    const indexDelta = payload.lineElementList.length - payload.oldElementCount
    if (rowStart >= 0) {
      runtimeRowList.splice(rowStart, 1, payload.nextRow)
      shiftRowsAfterPatch({
        rowList: runtimeRowList,
        startOffset: rowStart + 1,
        indexDelta,
        rowDelta: 0
      })
    }
    if (pageRowStart >= 0) {
      pageRows.splice(pageRowStart, 1, payload.nextRow)
      if (rowStart < 0) {
        shiftRowsAfterPatch({
          rowList: pageRows,
          startOffset: pageRowStart + 1,
          indexDelta,
          rowDelta: 0
        })
      }
    }
    this.patchPositionList({
      positionList: payload.nextPositionList,
      startIndex: payload.startIndex,
      deleteCount: payload.oldElementCount,
      indexDelta
    })
    this.patchLayoutElementList({
      elementList: payload.lineElementList,
      startIndex: payload.startIndex,
      deleteCount: payload.oldElementCount
    })
    this.updateChunkIndex(payload.editIndex ?? payload.startIndex, indexDelta)
    this.draw.replaceLayoutState({
      rowList: runtimeRowList,
      pageRowList,
      layoutElementList: this.draw.getObjectResolver().getLayoutMainElementList(),
      tableLayoutSnapshotVersion: this.draw.getTableLayoutSnapshotVersion(),
      tableLayoutSnapshot: this.draw.getRuntime().getTableLayoutSnapshot()
    })
  }

  /** 创建写回 runtime 的新行，并保留旧行的全局行号和页内行号。 */
  private createNextRow(nextRow: IRow, sourceRow: IRow): IRow {
    return {
      ...nextRow,
      startIndex: sourceRow.startIndex,
      rowIndex: sourceRow.rowIndex,
      /** 行号，用于定位页面内的目标行。 */
      rowNo: (sourceRow as IRow & { rowNo?: number }).rowNo
    } as IRow
  }

  /** 替换主 positionList 的当前行片段，并平移后续 position.index。 */
  private patchPositionList(payload: {
    /** 布局位置列表，保存元素分页后的坐标结果。 */
    positionList: IElementPosition[]
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 删除数量，用于描述从起点移除的元素个数。 */
    deleteCount: number
    /** 索引偏移量，用于把局部变更同步到后续元素。 */
    indexDelta: number
  }) {
    const positionList = this.draw.getCoordinate().getPositionList()
    patchArraySegment({
      list: positionList,
      startIndex: payload.startIndex,
      deleteCount: payload.deleteCount,
      itemList: payload.positionList.map(position => ({
        ...position,
        // 坐标数组必须独立拷贝，避免局部缓存或后续平移污染当前行位置。
        coordinate: {
          leftTop: [...position.coordinate.leftTop],
          leftBottom: [...position.coordinate.leftBottom],
          rightTop: [...position.coordinate.rightTop],
          rightBottom: [...position.coordinate.rightBottom]
        }
      }))
    })
    if (payload.indexDelta) {
      for (
        let i = payload.startIndex + payload.positionList.length;
        i < positionList.length;
        i++
      ) {
        positionList[i].index += payload.indexDelta
      }
    }
    this.draw.getCoordinate().setPositionList(positionList)
  }

  /** 替换 layoutElementList 的当前行片段。 */
  private patchLayoutElementList(payload: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 删除数量，用于描述从起点移除的元素个数。 */
    deleteCount: number
  }) {
    patchArraySegment({
      list: this.draw.getObjectResolver().getLayoutMainElementList(),
      startIndex: payload.startIndex,
      deleteCount: payload.deleteCount,
      itemList: payload.elementList
    })
  }

  /** 同步 chunk 索引边界，保证下一次连续输入仍命中当前 chunk。 */
  private updateChunkIndex(index: number, indexDelta: number) {
    if (!indexDelta) return
    const documentChunkIndex = this.draw.getServices().documentChunkIndex
    const chunk = documentChunkIndex.getChunkByIndex(index)
    if (!chunk) return
    chunk.endIndex += indexDelta
    chunk.elementCount += indexDelta
    chunk.dirty = false
    documentChunkIndex.shiftChunksAfterPatch({
      patchedChunk: chunk,
      indexDelta
    })
  }

  /** 构建失败结果。 */
  private fail(reason: string): IChunkLayoutPatchResult {
    return {
      patched: false,
      reason
    }
  }
}
