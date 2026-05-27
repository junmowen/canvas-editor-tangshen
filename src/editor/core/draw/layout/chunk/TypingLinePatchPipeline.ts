import { EditorZone } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import type { Draw } from '../../Draw'
import { IChunkLayoutPatchResult } from './ChunkLayoutTypes'
import {
  patchArraySegment,
  shiftRowsAfterPatch
} from './ChunkPatchAlgorithms'

/** 输入态单行正式 patch 统计，用于观察 chunk 失败后的非整篇兜底覆盖率。 */
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
    curIndex?: number
    editIndex?: number
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
    curIndex?: number
    editIndex?: number
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
    if (!this.canPatchElementList(sourceRow.elementList)) {
      return this.fail('line-complex-row')
    }
    const elementList = this.draw.getObjectResolver().getElementList()
    const startIndex = sourceRow.startIndex
    const oldElementCount = sourceRow.elementList.length
    const endIndex = Math.min(
      elementList.length - 1,
      startIndex + oldElementCount - 1 + payload.insertedCount
    )
    if (startIndex < 0 || endIndex < startIndex) {
      return this.fail('line-range-invalid')
    }
    const lineElementList = elementList.slice(startIndex, endIndex + 1)
    if (!lineElementList.length || !this.canPatchElementList(lineElementList)) {
      return this.fail('line-next-complex-row')
    }
    const margins = this.draw.getMargins()
    const innerWidth = this.draw.getInnerWidth()
    const startX = margins[3]
    const startY = cursorPosition.coordinate.leftTop[1]
    const rowList = this.draw.computeRowList({
      startX,
      startY,
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(),
      isPagingMode: false,
      innerWidth,
      surroundElementList: [],
      elementList: lineElementList,
      sourceStartIndex: startIndex
    })
    if (rowList.length !== 1) {
      return this.fail('line-expanded')
    }
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
    if (nextPositionList.length !== lineElementList.length) {
      return this.fail('line-position-count-mismatch')
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
    pageNo: number
    sourceRow: IRow
    nextRow: IRow
    lineElementList: IElement[]
    nextPositionList: IElementPosition[]
    startIndex: number
    oldElementCount: number
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
      rowNo: (sourceRow as IRow & { rowNo?: number }).rowNo
    } as IRow
  }

  /** 替换主 positionList 的当前行片段，并平移后续 position.index。 */
  private patchPositionList(payload: {
    positionList: IElementPosition[]
    startIndex: number
    deleteCount: number
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
    elementList: IElement[]
    startIndex: number
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

  /** 判断当前行元素是否适合单行正式 patch。 */
  private canPatchElementList(elementList: Array<{ type?: ElementType }>) {
    return elementList.every(element => {
      return (
        !element.type ||
        element.type === ElementType.TEXT ||
        element.type === ElementType.HYPERLINK ||
        element.type === ElementType.DATE ||
        element.type === ElementType.SUBSCRIPT ||
        element.type === ElementType.SUPERSCRIPT ||
        element.type === ElementType.TAB
      )
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
