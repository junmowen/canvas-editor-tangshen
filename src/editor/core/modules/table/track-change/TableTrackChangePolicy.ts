import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import { ITd } from '../../../../interface/table/Td'
import { forEachTableCell } from '../utils/TableCellTraversal'

interface ITrackChangeTableCellContext {
  td: ITd
}

/** 判断元素是否是修订链路需要递归处理的表格。 */
export function isTrackChangeTableElement(
  element: IElement | null | undefined
): element is IElement {
  return element?.type === ElementType.TABLE && !!element.trList
}

/** 判断元素是否包含表格或嵌套 valueList 内容。 */
export function isTrackChangeContainerElement(
  element: IElement | null | undefined
) {
  return element?.type === ElementType.TABLE || !!element?.valueList?.length
}

/** 判断元素列表中是否包含表格元素。 */
export function hasTrackChangeTableElement(elementList: IElement[]) {
  return elementList.some(element => element.type === ElementType.TABLE)
}

/** 获取表格行数，用于修订调试摘要。 */
export function getTrackChangeTableRowCount(
  element: IElement | null | undefined
) {
  return element?.type === ElementType.TABLE ? element.trList?.length || 0 : 0
}

/** 遍历修订链路中的表格单元格。 */
export function forEachTrackChangeTableCell(payload: {
  element: IElement
  elementIndex: number
  visitor: (context: ITrackChangeTableCellContext) => void
}) {
  const { element, elementIndex, visitor } = payload
  if (!isTrackChangeTableElement(element)) return
  forEachTableCell({
    tableElement: element,
    tableIndex: elementIndex,
    visitor: ({ td }) => {
      visitor({ td })
    }
  })
}

/** 遍历分页表格片段中参与修订矩形收集的元素位置。 */
export function forEachTrackChangeTableFragmentPosition(payload: {
  pageRowList: IRow[][]
  visitor: (context: {
    pageNo: number
    element: IElement
    position: IElementPosition
  }) => void
}) {
  const { pageRowList, visitor } = payload
  pageRowList.forEach((rowList, pageNo) => {
    rowList.forEach(row => {
      const tableFragment = row.tableFragment
      if (!tableFragment?.trList?.length) return
      tableFragment.trList.forEach(tr => {
        tr.tdList.forEach(td => {
          const positionList = td.positionList || []
          if (!td.rowList?.length || !positionList.length) return
          let positionIndex = 0
          td.rowList.forEach(tdRow => {
            tdRow.elementList.forEach(element => {
              const position = positionList[positionIndex]
              positionIndex++
              if (!position) return
              visitor({ pageNo, element, position })
            })
          })
        })
      })
    })
  })
}
