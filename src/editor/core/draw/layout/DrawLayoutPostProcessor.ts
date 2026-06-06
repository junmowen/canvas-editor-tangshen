import { EditorMode } from '../../../dataset/enum/Editor'
import type { Draw } from '../Draw'
import type { IDrawLayoutFeaturePresence } from './DrawLayoutFeatureScanner'

/** 重建完整布局后的表格快照。 */
export function rebuildFullLayoutTableSnapshot(payload: {
  draw: Draw
  featurePresence: IDrawLayoutFeaturePresence
  tableLayoutSnapshotVersion: number
}) {
  const {
    draw,
    featurePresence,
    tableLayoutSnapshotVersion
  } = payload
  draw.replaceTableLayoutSnapshot(
    featurePresence.hasTable
      ? draw.getServices().tableLayoutSnapshotBuilder.build({
          version: tableLayoutSnapshotVersion
        })
      : null
  )
}

/** 完整布局提交后重建 chunk 相关索引。 */
export function rebuildFullLayoutChunkIndexes(draw: Draw) {
  draw.getServices().documentChunkIndex.rebuild('full-layout')
  draw.getServices().tableChunkRangeIndex.rebuild('full-layout')
  draw.getServices().tableCellChunkIndex.rebuild('full-layout')
}

/** 完整布局提交后刷新区域、搜索和控件高亮。 */
export function refreshFullLayoutHighlights(payload: {
  draw: Draw
  featurePresence: IDrawLayoutFeaturePresence
}) {
  const { draw, featurePresence } = payload
  if (featurePresence.hasArea) {
    draw.getComponents().area.compute()
  }

  if (draw.getMode() !== EditorMode.PRINT) {
    const searchKeyword = draw.getComponents().search.getSearchKeyword()
    if (searchKeyword) {
      draw.getComponents().search.compute(searchKeyword)
    }
    if (featurePresence.hasControl) {
      draw.getComponents().control.computeHighlightList()
    }
  }
}
