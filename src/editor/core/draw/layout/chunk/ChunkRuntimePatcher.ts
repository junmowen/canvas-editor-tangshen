import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import type { Draw } from '../../Draw'
import {
  IChunkLayoutMeasureResult,
  IChunkLayoutPatchContext
} from './ChunkLayoutTypes'
import { patchArraySegment } from './ChunkPatchAlgorithms'

/** chunk 运行时写回器，负责把局部布局结果 patch 到 DrawRuntime 和 Position。 */
export class ChunkRuntimePatcher {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  /**
   * 写回 chunk 测量结果。
   *
   * @param context - patch 上下文
   * @param measureResult - chunk 测量结果
   */
  public patch(
    context: IChunkLayoutPatchContext,
    measureResult: IChunkLayoutMeasureResult
  ) {
    const runtimeRowList = this.draw.getRuntime().getRuntimeRowList()
    const pageRowList = this.draw.getPageRowList()
    const pageRows = pageRowList[context.pageNo] || []
    const rowStart = runtimeRowList.indexOf(context.oldChunkRows[0])
    const pageRowStart = pageRows.indexOf(context.oldChunkRows[0])
    const oldElementCount = this.getOldElementCount(context)
    const nextElementCount = measureResult.elementList.length
    const indexDelta = nextElementCount - oldElementCount
    const oldRowCount = context.oldChunkRows.length
    const nextRowCount = measureResult.rowList.length
    const rowDelta = nextRowCount - oldRowCount
    const heightDelta = measureResult.nextHeight - measureResult.oldHeight
    const nextChunkRows = this.shiftMeasuredRowsByPageIndex({
      rowList: measureResult.rowList,
      startIndex: context.chunk.startIndex,
      startRowIndex: context.oldChunkRows[0].rowIndex,
      startPageRowNo: context.oldPageRowStart
    })
    if (rowStart >= 0) {
      runtimeRowList.splice(
        rowStart,
        oldRowCount,
        ...nextChunkRows
      )
      this.shiftRowsAfterPatch({
        rowList: runtimeRowList,
        startRowOffset: rowStart + nextRowCount,
        indexDelta,
        rowDelta,
        heightDelta,
        pageNo: context.pageNo
      })
    }
    if (pageRowStart >= 0) {
      pageRows.splice(
        pageRowStart,
        oldRowCount,
        ...nextChunkRows
      )
      if (rowStart < 0) {
        this.shiftRowsAfterPatch({
          rowList: pageRows,
          startRowOffset: pageRowStart + nextRowCount,
          indexDelta,
          rowDelta,
          heightDelta,
          pageNo: context.pageNo
        })
      }
    }
    this.patchPositionList({
      positionList: this.shiftMeasuredPositionsByPageIndex({
        positionList: measureResult.positionList,
        startPageRowNo: context.oldPageRowStart
      }),
      startIndex: context.chunk.startIndex,
      deleteCount: oldElementCount,
      pageNo: context.pageNo,
      heightDelta,
      rowDelta
    })
    this.updateChunkBoundary(context, nextElementCount)
    this.draw.getServices().documentChunkIndex.shiftChunksAfterPatch({
      patchedChunk: context.chunk,
      indexDelta
    })
    this.draw.replaceLayoutState({
      rowList: runtimeRowList,
      pageRowList,
      layoutElementList: this.patchLayoutElementList({
        elementList: measureResult.elementList,
        startIndex: context.chunk.startIndex,
        deleteCount: oldElementCount
      }),
      tableLayoutSnapshotVersion: this.draw.getTableLayoutSnapshotVersion(),
      tableLayoutSnapshot: this.draw.getRuntime().getTableLayoutSnapshot()
    })
  }

  /** 只替换当前 chunk 的布局元素切片，避免每次输入重新 flatMap 整篇文档。 */
  private patchLayoutElementList(payload: {
    elementList: IElement[]
    startIndex: number
    deleteCount: number
  }) {
    const layoutElementList = this.draw.getLayoutMainElementList()
    // 布局元素必须以真实 chunk 内容为准，rowList 只作为测量结果，不能反向决定正文内容。
    const nextElementList = payload.elementList
    patchArraySegment<IElement>({
      list: layoutElementList,
      startIndex: payload.startIndex,
      deleteCount: payload.deleteCount,
      itemList: nextElementList
    })
    return layoutElementList
  }

  /** 写回主 positionList 的当前 chunk 范围。 */
  private patchPositionList(payload: {
    positionList: IElementPosition[]
    startIndex: number
    deleteCount: number
    pageNo: number
    heightDelta: number
    rowDelta: number
  }) {
    const positionList = this.draw.getPosition().getPositionList()
    patchArraySegment<IElementPosition>({
      list: positionList,
      startIndex: payload.startIndex,
      deleteCount: payload.deleteCount,
      itemList: payload.positionList
    })
    this.shiftPositionsAfterPatch({
      positionList,
      startOffset: payload.startIndex + payload.positionList.length,
      indexDelta: payload.positionList.length - payload.deleteCount,
      pageNo: payload.pageNo,
      heightDelta: payload.heightDelta,
      rowDelta: payload.rowDelta
    })
    this.draw.getPosition().setPositionList(positionList)
  }

  /** 计算旧运行时中当前 chunk 需要替换的元素数量。 */
  private getOldElementCount(context: IChunkLayoutPatchContext) {
    return Math.max(0, context.oldEndIndex - context.chunk.startIndex + 1)
  }

  /** 输入后同步当前 chunk 边界，避免连续输入仍按旧 endIndex 截断。 */
  private updateChunkBoundary(
    context: IChunkLayoutPatchContext,
    nextElementCount: number
  ) {
    context.chunk.endIndex = context.chunk.startIndex + nextElementCount - 1
    context.chunk.elementCount = nextElementCount
  }

  /** 修正 patch 范围之后的 position.index，保证点击、选区和后续输入读取正确逻辑索引。 */
  private shiftPositionsAfterPatch(payload: {
    positionList: IElementPosition[]
    startOffset: number
    indexDelta: number
    pageNo: number
    heightDelta: number
    rowDelta: number
  }) {
    if (!payload.indexDelta && !payload.rowDelta && !payload.heightDelta) {
      return
    }
    for (let i = payload.startOffset; i < payload.positionList.length; i++) {
      const position = payload.positionList[i]
      if (payload.indexDelta) {
        position.index += payload.indexDelta
      }
      if (payload.rowDelta) {
        position.rowIndex += payload.rowDelta
        // rowNo 是页内行号，只能平移当前页后续位置，跨页位置保持自己的页内序号。
        if (position.pageNo === payload.pageNo) {
          position.rowNo += payload.rowDelta
        }
      }
      if (payload.heightDelta && position.pageNo === payload.pageNo) {
        this.shiftPositionY(position, payload.heightDelta)
      }
    }
  }

  /** 修正 patch 范围之后的行起点、行号和纵坐标，避免段落后续行仍停留在旧布局。 */
  private shiftRowsAfterPatch(payload: {
    rowList: IRow[]
    startRowOffset: number
    indexDelta: number
    rowDelta: number
    heightDelta: number
    pageNo: number
  }) {
    if (!payload.indexDelta && !payload.rowDelta && !payload.heightDelta) {
      return
    }
    for (let i = payload.startRowOffset; i < payload.rowList.length; i++) {
      const row = payload.rowList[i]
      if (payload.indexDelta) {
        row.startIndex += payload.indexDelta
      }
      if (payload.rowDelta) {
        row.rowIndex += payload.rowDelta
      }
    }
  }

  /** 按局部扩高量平移位置的四个纵向坐标。 */
  private shiftPositionY(position: IElementPosition, deltaY: number) {
    position.coordinate.leftTop[1] += deltaY
    position.coordinate.leftBottom[1] += deltaY
    position.coordinate.rightTop[1] += deltaY
    position.coordinate.rightBottom[1] += deltaY
  }

  /** 把 chunk 的 rowIndex / rowNo 对齐到当前页的旧起点。 */
  private shiftMeasuredRowsByPageIndex(payload: {
    rowList: IRow[]
    startIndex: number
    startRowIndex: number
    startPageRowNo: number
  }) {
    return payload.rowList.map((row, index) => ({
      ...row,
      // computeRowList 产出的 startIndex 是 chunk 内局部索引，写回运行时必须转成整篇文档索引。
      startIndex: payload.startIndex + row.startIndex,
      rowIndex: payload.startRowIndex + index,
      rowNo: payload.startPageRowNo + index
    }))
  }

  /** 把 chunk 的 position 行号对齐到当前页的旧起点。 */
  private shiftMeasuredPositionsByPageIndex(payload: {
    positionList: IElementPosition[]
    startPageRowNo: number
  }) {
    let currentRowNo = payload.startPageRowNo - 1
    let lastRowIndex = -1
    return payload.positionList.map(position => {
      const nextPosition = {
        ...position,
        // 坐标数组需要独立拷贝，避免后续平移污染 chunk 布局缓存。
        coordinate: {
          leftTop: [...position.coordinate.leftTop],
          leftBottom: [...position.coordinate.leftBottom],
          rightTop: [...position.coordinate.rightTop],
          rightBottom: [...position.coordinate.rightBottom]
        }
      }
      if (nextPosition.rowIndex !== lastRowIndex) {
        currentRowNo++
        lastRowIndex = nextPosition.rowIndex
      }
      nextPosition.rowNo = currentRowNo
      return nextPosition
    })
  }
}
