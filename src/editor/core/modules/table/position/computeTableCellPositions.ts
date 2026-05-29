import { VerticalAlign } from '../../../../dataset/enum/VerticalAlign'
import {
  IComputePageRowPositionPayload,
  IComputePageRowPositionResult
} from '../../../../interface/Position'
import { IElement } from '../../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../../interface/table/TableFragment'
import { getTableCellContentInset } from '../layout/TableCellContentInset'

/** compute表格单元格position调用载荷，聚合执行该操作所需的输入数据。 */
interface IComputeTableCellPositionsPayload {
  /** 表格或分页片段数据源。 */
  tableSource: IElement | ITableFragmentDescriptor
  /** 表格元素左上角横坐标。 */
  tablePreX: number
  /** 表格元素左上角纵坐标。 */
  tablePreY: number
  /** 表格元素结束后的横坐标。 */
  tableNextX: number
  /** 表格元素结束后的纵坐标。 */
  tableNextY: number
  /** 缩放比例，用于把内部尺寸映射到画布坐标。 */
  scale: number
  /** 单元格内边距配置。 */
  tdPadding: number[]
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 表格元素在主文档中的索引。 */
  tableIndex: number
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone: IComputePageRowPositionPayload['zone']
  /** 行 position 递归计算入口。 */
  computePageRowPosition: (
    payload: IComputePageRowPositionPayload
  ) => IComputePageRowPositionResult
}

/** 按垂直对齐方式偏移单元格内 position 坐标。 */
function offsetCellVerticalAlignPositions(payload: {
  /** 单元格 position 计算结果。 */
  drawRowResult: IComputePageRowPositionResult
  /** 表格单元格对象。 */
  td: NonNullable<ITableFragmentDescriptor['trList']>[number]['tdList'][number]
  /** 单元格内容总行高。 */
  rowsHeight: number
  /** 可用于垂直对齐的空白高度。 */
  blankHeight: number
}) {
  const { td, blankHeight } = payload
  if (
    td.verticalAlign !== VerticalAlign.MIDDLE &&
    td.verticalAlign !== VerticalAlign.BOTTOM
  ) {
    return
  }
  const offsetHeight =
    td.verticalAlign === VerticalAlign.MIDDLE ? blankHeight / 2 : blankHeight
  if (Math.floor(offsetHeight) <= 0) {
    return
  }
  td.positionList?.forEach(tdPosition => {
    const {
      coordinate: { leftTop, leftBottom, rightBottom, rightTop }
    } = tdPosition
    leftTop[1] += offsetHeight
    leftBottom[1] += offsetHeight
    rightBottom[1] += offsetHeight
    rightTop[1] += offsetHeight
  })
}

/** 计算表格单元格内元素 position。 */
export function computeTableCellPositions(
  payload: IComputeTableCellPositionsPayload
): IComputePageRowPositionResult {
  const {
    tableSource,
    tablePreX,
    tablePreY,
    tableNextX,
    tableNextY,
    scale,
    tdPadding,
    pageNo,
    tableIndex,
    zone,
    computePageRowPosition
  } = payload
  if (!tableSource.trList?.length) {
    return { x: tableNextX, y: tableNextY, index: tableIndex + 1 }
  }
  const tdPaddingHeight = tdPadding[0] + tdPadding[2]
  let nextIndex = tableIndex + 1
  for (let t = 0; t < tableSource.trList.length; t++) {
    const tr = tableSource.trList[t]
    for (let d = 0; d < tr.tdList!.length; d++) {
      const td = tr.tdList[d]
      td.positionList = []
      const rowList = td.rowList!
      const contentInset = getTableCellContentInset(tableSource, td)
      const tdHorizontalPadding =
        tdPadding[1] + tdPadding[3] + contentInset.left + contentInset.right
      const drawRowResult = computePageRowPosition({
        positionList: td.positionList,
        rowList,
        pageNo,
        startRowIndex: 0,
        startIndex: 0,
        startX: (td.x! + tdPadding[3] + contentInset.left) * scale + tablePreX,
        startY: (td.y! + tdPadding[0] + contentInset.top) * scale + tablePreY,
        innerWidth: Math.max(0, td.width! - tdHorizontalPadding) * scale,
        isTable: true,
        index: tableIndex,
        tdIndex: d,
        trIndex: t,
        zone
      })
      nextIndex = Math.max(nextIndex, drawRowResult.index)
      const rowsHeight = rowList.reduce((pre, cur) => pre + cur.height, 0)
      const blankHeight =
        (td.height! - tdPaddingHeight - contentInset.top - contentInset.bottom) *
          scale -
        rowsHeight
      offsetCellVerticalAlignPositions({
        drawRowResult,
        td,
        rowsHeight,
        blankHeight
      })
    }
  }
  return { x: tableNextX, y: tableNextY, index: nextIndex }
}
