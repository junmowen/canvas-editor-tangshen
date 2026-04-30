import { Draw } from '../../../draw/Draw'

export function clearCrossRowColSelection(draw: Draw) {
  const rowCol = draw.getTableParticle().getRangeRowCol()
  if (!rowCol) return null
  let isDeleted = false
  for (let r = 0; r < rowCol.length; r++) {
    const row = rowCol[r]
    for (let c = 0; c < row.length; c++) {
      const col = row[c]
      if (col.value.length > 1) {
        draw.spliceElementList(col.value, 1, col.value.length - 1)
        isDeleted = true
      }
    }
  }
  return isDeleted ? 0 : null
}
