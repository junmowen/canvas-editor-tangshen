import { IDrawLayoutPatch } from '../../../interface/Draw'
import type { Draw } from '../Draw'
import {
  applyTextInputPatchRowContext,
  canPatchTextInputOldRows,
  canStartTextInputLayoutPatch,
  canUseTextInputPatchAnchor,
  hasUnsafeTextInputPatchElement,
  isTextInputPatchRowShapeStable,
  patchTextInputPageRows,
  resolveTextInputPatchParagraphRange,
  resolveTextInputPatchRowRange
} from './DrawLayoutPatchPolicy'
import type { IDrawLayoutResult } from './DrawLayoutPipeline'
import { syncHeaderFooterLayout } from './DrawLayoutHeaderFooterScheduler'

/** 输入态局部布局 patch 执行器。 */
export class DrawLayoutPatchRunner {
  public constructor(private readonly draw: Draw) {}

  /** 计算 Patch 对应的布局或状态。 */
  public compute(layoutPatch: IDrawLayoutPatch): IDrawLayoutResult | null {
    const mainElementList = this.draw
      .getObjectResolver()
      .getOriginalMainElementList()
    const oldRowList = this.draw.getObjectResolver().getRowList()
    const oldPageRowList = this.draw.getPageRowList()
    if (!canStartTextInputLayoutPatch({
      layoutPatch,
      isMainActive: this.draw.getComponents().zone.isMainActive(),
      isPagingMode: this.draw.getIsPagingMode(),
      mainElementList,
      oldRowList,
      oldPageRowList
    })) {
      return null
    }
    if (!canUseTextInputPatchAnchor({
      layoutPatch,
      oldRowList,
      oldPageRowList
    })) {
      return null
    }
    const paragraphRange = resolveTextInputPatchParagraphRange(
      mainElementList,
      layoutPatch.insertIndex
    )
    if (!paragraphRange) {
      return null
    }
    if (hasUnsafeTextInputPatchElement({
      elementList: mainElementList,
      range: paragraphRange
    })) {
      return null
    }
    const patchRowRange = resolveTextInputPatchRowRange({
      oldRowList,
      paragraphRange
    })
    if (!patchRowRange) {
      return null
    }
    syncHeaderFooterLayout(this.draw)
    const margins = this.draw.getMargins(layoutPatch.pageNo)
    const startX = margins[3]
    const startY = margins[0] + this.draw.getComponents().header.getExtraHeight()
    if (!canPatchTextInputOldRows(patchRowRange.rows)) {
      return null
    }
    const patchRows = this.draw.computeRowList({
      startX,
      startY,
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(layoutPatch.pageNo),
      startPageNo: layoutPatch.pageNo,
      isPagingPageMode: false,
      innerWidth: this.draw.getInnerWidth(layoutPatch.pageNo),
      surroundElementList: [],
      elementList: mainElementList.slice(paragraphRange.start, paragraphRange.end + 1)
    })
    if (!isTextInputPatchRowShapeStable({
      patchRows,
      oldPatchRows: patchRowRange.rows
    })) {
      return null
    }
    applyTextInputPatchRowContext({
      patchRows,
      oldPatchRows: patchRowRange.rows,
      paragraphStartIndex: paragraphRange.start
    })
    const nextRowList = oldRowList.slice()
    nextRowList.splice(
      patchRowRange.startIndex,
      patchRowRange.rows.length,
      ...patchRows
    )
    const nextPageRowList = patchTextInputPageRows({
      pageRowList: oldPageRowList,
      patchRowStartIndex: patchRowRange.startIndex,
      oldPatchRowCount: patchRowRange.rows.length,
      patchRows
    })
    const nextSnapshotVersion = this.draw.getTableLayoutSnapshotVersion() + 1
    this.draw.replaceLayoutState({
      rowList: nextRowList,
      pageRowList: nextPageRowList,
      layoutElementList: nextPageRowList.flatMap(pageRows =>
        pageRows.flatMap(row => row.elementList)
      ),
      typesettingLayoutSnapshot:
        this.draw.getServices().typesettingLayoutStructureBuilder.build({
          version: nextSnapshotVersion,
          pageRowList: nextPageRowList
        }),
      tableLayoutSnapshotVersion: nextSnapshotVersion,
      tableLayoutSnapshot: null
    })
    this.draw.getCoordinate().computePositionListFromPage(layoutPatch.pageNo)
    this.draw.replaceTableLayoutSnapshot(null)
    return {
      rowList: nextRowList,
      pageRowList: nextPageRowList,
      layoutElementList: this.draw.getObjectResolver().getLayoutMainElementList(),
      mainElementList,
      tableLayoutSnapshotVersion: nextSnapshotVersion
    }
  }
}
