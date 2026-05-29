import { RowFlex } from '../../../../dataset/enum/Row'

/** 解析 worker 快照中页码的横向位置。 */
export function resolveWorkerSnapshotPageNumberX(payload: {
  rowFlex: unknown
  pageWidth: number
  textWidth: number
  margins: number[]
}) {
  const { rowFlex, pageWidth, textWidth, margins } = payload
  if (rowFlex === RowFlex.CENTER) {
    return (pageWidth - textWidth) / 2
  }
  if (rowFlex === RowFlex.RIGHT) {
    return pageWidth - textWidth - margins[1]
  }
  return margins[3]
}
