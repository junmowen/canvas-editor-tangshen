import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { ITr } from '../../../../interface/table/Tr'
import { zipElementList } from '../../../../utils/elementZip'
import { Draw } from '../../../draw/Draw'

/** 根据当前跨行列选区构造可写入剪贴板的表格元素。 */
export function resolveTableCopyElementList(draw: Draw): IElement[] | null {
  const rangeManager = draw.getRange()
  const tableElement = rangeManager.getRangeTableElement()
  if (!tableElement) return null

  const rowCol = draw.getTableParticle().getRangeRowCol()
  if (!rowCol) return null

  const copyTableElement: IElement = {
    type: ElementType.TABLE,
    value: '',
    colgroup: [],
    trList: []
  }
  const firstRow = rowCol[0]
  const colStartIndex = firstRow[0].colIndex!
  const lastCol = firstRow[firstRow.length - 1]
  const colEndIndex = lastCol.colIndex! + lastCol.colspan - 1
  for (let c = colStartIndex; c <= colEndIndex; c++) {
    copyTableElement.colgroup!.push(tableElement.colgroup![c])
  }
  for (let r = 0; r < rowCol.length; r++) {
    const row = rowCol[r]
    const tr = tableElement.trList![row[0].rowIndex!]
    const copyTr: ITr = {
      tdList: [],
      height: tr.height,
      minHeight: tr.minHeight
    }
    for (let c = 0; c < row.length; c++) {
      copyTr.tdList.push(row[c])
    }
    copyTableElement.trList!.push(copyTr)
  }
  return zipElementList([copyTableElement])
}
