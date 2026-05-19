import type { Draw } from '../Draw'

/** DrawRenderFacadeService 的表格输入辅助逻辑。 */
export class TableTypingRenderHelper {
  constructor(private readonly draw: Draw) {}

  /** 标记表格单元格输入命中的子 chunk，作为后续 table-cell 局部 patch 的调度锚点。 */
  public markTableCellChunkDirty(editIndex: number | undefined) {
    const tableCellChunkIndex = this.draw.getServices().tableCellChunkIndex
    if (!tableCellChunkIndex.markDirtyByCurrentContext(editIndex)) {
      // resetRenderBackendStats 可能清空测试基线；输入后若索引缺失，按最新布局重建再命中。
      tableCellChunkIndex.rebuild('table-typing-lookup-miss')
      tableCellChunkIndex.markDirtyByCurrentContext(editIndex)
    }
  }

  /** 读取当前逻辑表在表格快照中覆盖的页码，用于完整 layout 回退后清理旧表格残影。 */
  public resolveCurrentLogicalTablePageNoList(): number[] {
    const positionContext = this.draw.getPosition().getPositionContext()
    if (!positionContext.isTable || positionContext.index === undefined) {
      return []
    }
    const logicalTableId = this.draw.getOriginalMainElementList()[positionContext.index]?.id
    if (!logicalTableId) {
      return []
    }
    const snapshot = this.draw.getRuntime().getTableLayoutSnapshot()
    if (!snapshot) {
      return []
    }
    return Array.from(
      new Set(
        snapshot.sliceList
          .filter(slice => slice.logicalTableId === logicalTableId)
          .map(slice => slice.pageNo)
      )
    )
  }
}
