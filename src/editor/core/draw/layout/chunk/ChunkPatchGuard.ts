import { ElementType } from '../../../../dataset/enum/Element'
import type { Draw } from '../../Draw'
import {
  IChunkLayoutPatchContext,
  IChunkLayoutPatchResult
} from './ChunkLayoutTypes'

/** chunk patch 安全边界判断器，只负责判断当前输入是否能走首版局部 patch。 */
export class ChunkPatchGuard {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  /**
   * 创建 patch 上下文。
   *
   * @param curIndex - 当前逻辑光标索引
   * @param insertedCount - 本次输入插入的元素数量
   * @returns 成功时返回上下文，失败时返回原因
   */
  public resolveContext(
    curIndex: number | undefined,
    insertedCount = 0
  ): { context: IChunkLayoutPatchContext | null; result: IChunkLayoutPatchResult } {
    const positionContext = this.draw.getPosition().getPositionContext()
    if (positionContext.isTable) {
      // 表格单元格使用 td 内部局部索引，不能复用主文档 page chunk 的行和元素写回。
      return this.fail('table-context-main-page-chunk-disabled')
    }
    const chunkIndex = this.draw.getServices().documentChunkIndex
    const chunk = chunkIndex.getChunkByIndex(curIndex)
    if (!chunk) {
      return this.fail('chunk-miss')
    }
    if (
      chunk.startPageNo === null ||
      chunk.endPageNo === null ||
      chunk.startPageNo !== chunk.endPageNo
    ) {
      return this.fail('chunk-cross-page')
    }
    const pageNo = chunk.startPageNo
    const pageRows = this.draw.getPageRowList()[pageNo] || []
    // 页级 chunk 必须整页替换，不能再按索引范围筛旧行，否则会残留半页旧布局。
    const oldChunkRows =
      chunk.kind === 'page'
        ? pageRows
        : this.getPageRowsByIndexRange(
            pageNo,
            chunk.startIndex,
            chunk.endIndex
          )
    if (!oldChunkRows.length) {
      return this.fail('chunk-row-miss')
    }
    const oldPageRowStart =
      chunk.kind === 'page' ? 0 : pageRows.indexOf(oldChunkRows[0])
    if (oldPageRowStart < 0) {
      return this.fail('chunk-page-row-miss')
    }
    const elementList = this.draw.getElementList()
    const oldEndIndex = chunk.endIndex
    // 输入发生在旧 chunk 内部时，chunk 元数据仍是旧边界：
    // 正增量向后扩展，负增量向前收缩，后续 chunk 只做整体索引平移。
    const endIndex = Math.min(
      elementList.length - 1,
      chunk.endIndex + insertedCount
    )
    if (endIndex < chunk.startIndex) {
      return this.fail('chunk-empty-after-edit')
    }
    const chunkElementList = elementList.slice(chunk.startIndex, endIndex + 1)
    if (chunk.kind !== 'page' && !this.canPatchElementList(chunkElementList)) {
      return this.fail('complex-element')
    }
    const chunkStartPosition =
      this.draw.getPosition().getPositionList()[chunk.startIndex]
    if (!chunkStartPosition) {
      return this.fail('position-miss')
    }
    const margins = this.draw.getMargins()
    // 页级 chunk 从正文页顶重新测量；段落 chunk 仍沿用原 chunk 首字符 Y。
    const startY =
      chunk.kind === 'page'
        ? margins[0] + this.draw.getHeader().getExtraHeight()
        : chunkStartPosition.coordinate.leftTop[1]
    return {
      context: {
        chunk,
        pageNo,
        oldChunkRows,
        oldPageRowStart,
        chunkElementList,
        endIndex,
        oldEndIndex,
        insertedCount,
        startX: margins[3],
        startY,
        innerWidth: this.draw.getInnerWidth()
      },
      result: { patched: true }
    }
  }

  /** 构建失败返回对象。 */
  private fail(reason: string) {
    return {
      context: null,
      result: {
        patched: false,
        reason
      }
    }
  }

  /** 判断元素是否适合首版 chunk patch。 */
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

  /** 获取某页中落在索引范围内的旧行。 */
  private getPageRowsByIndexRange(pageNo: number, startIndex: number, endIndex: number) {
    const pageRows = this.draw.getPageRowList()[pageNo] || []
    return pageRows.filter(row => {
      const rowStartIndex = row.startIndex
      const rowEndIndex = row.startIndex + row.elementList.length - 1
      return rowStartIndex <= endIndex && rowEndIndex >= startIndex
    })
  }
}
