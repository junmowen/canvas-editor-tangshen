import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IPositionContext } from '../../../../interface/Position'
import { Draw } from '../../../draw/Draw'
import { forEachTableCell } from '../utils/TableCellTraversal'

/** resolve表格position列表调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolveTablePositionListPayload {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 源元素列表，用于在原始态或布局态中解析表格单元格。 */
  sourceElementList: IElement[]
}

function normalizeTablePositionList(
  positionList: IElementPosition[]
): IElementPosition[] {
  // 表格内部 positionList 在局部 cell 内通常从 0 开始重新编号，
  // 这里统一重排成连续局部索引，供 cell 内命中与导航使用。
  return positionList.map((position, index) => ({
    ...position,
    index
  }))
}

/** 解析当前表格上下文可用的 positionList。 */
export function resolveTablePositionList(
  payload: IResolveTablePositionListPayload
): IElementPosition[] {
  const { draw, positionContext, sourceElementList } = payload
  // 当前 positionContext 落在表格内时，优先尝试拿到“当前逻辑 cell 的连续位置列表”。
  // paged / fragment / pagingOriginId 等差异都在这里统一收口。
  const { index, trIndex, tdIndex, tableId, tdId } = positionContext
  const tableCell =
    index !== undefined && trIndex !== undefined && tdIndex !== undefined
      ? draw.getTargetResolver().resolveTableTdByIndex({
          elementList: sourceElementList,
          tableIndex: index,
          trIndex,
          tdIndex
        })
      : null
  const table = tableCell?.table || null
  const tr = tableCell?.tr || null
  const td = tableCell?.td || null

  const directPositionList = td?.positionList || []
  if (directPositionList.length && !table?.pagingId) {
    return normalizeTablePositionList(directPositionList)
  }

  const matchedPositionList: IElementPosition[] = []
  const expectedTableIds = new Set(
    [tableId, table?.id, (table as any)?.tableId].filter(Boolean)
  )
  const expectedTdIds = new Set(
    [tdId, td?.id, td?.pagingOriginId].filter(Boolean)
  )

  sourceElementList.forEach(element => {
    if (element.type !== ElementType.TABLE) return
    const tableIdMatched =
      !expectedTableIds.size ||
      expectedTableIds.has(element.id) ||
      expectedTableIds.has((element as any).tableId) ||
      (!!table?.pagingId && element.pagingId === table.pagingId)
    if (!tableIdMatched) return

    forEachTableCell({
      tableElement: element,
      tableIndex: -1,
      visitor: ({ td: fragmentTd }) => {
        const tdIdMatched =
          !expectedTdIds.size ||
          expectedTdIds.has(fragmentTd.id) ||
          expectedTdIds.has(fragmentTd.pagingOriginId)
        if (!tdIdMatched) return
        if (fragmentTd.positionList?.length) {
          matchedPositionList.push(...fragmentTd.positionList)
        }
      }
    })
  })

  if (matchedPositionList.length) {
    return normalizeTablePositionList(matchedPositionList)
  }

  const pageRowFragmentPositionList: IElementPosition[] = []
  if (table?.id && tr?.id && td?.id) {
    const sliceList = draw.getTargetResolver().getCellSlicesByLogicalCell({
      tableId: table.id,
      trId: tr.id,
      tdId: td.id
    })
    const fragmentTableIds = new Set(sliceList.map(slice => slice.fragmentTableId))
    const fragmentTrIds = new Set(sliceList.map(slice => slice.fragmentTrId))
    const fragmentTdIds = new Set(sliceList.map(slice => slice.fragmentTdId))

    draw.getPageRowList().forEach(pageRows => {
      pageRows.forEach(row => {
        const fragmentTable = row.tableFragment
        if (!fragmentTable) {
          return
        }
        const rowTableElement = row.elementList.find(
          element => element.type === ElementType.TABLE
        ) as IElement | undefined
        const fragmentTableId =
          rowTableElement?.id ||
          (rowTableElement as any)?.tableId ||
          (fragmentTable as any).id ||
          (fragmentTable as any).tableId
        if (!fragmentTableId || !fragmentTableIds.has(fragmentTableId)) {
          return
        }

        fragmentTable.trList?.forEach(fragmentTr => {
          if (!fragmentTr.id || !fragmentTrIds.has(fragmentTr.id)) {
            return
          }
          fragmentTr.tdList.forEach(fragmentTd => {
            if (!fragmentTd.id || !fragmentTdIds.has(fragmentTd.id)) {
              return
            }
            if (fragmentTd.positionList?.length) {
              pageRowFragmentPositionList.push(...fragmentTd.positionList)
            }
          })
        })
      })
    })
  }

  if (pageRowFragmentPositionList.length) {
    return normalizeTablePositionList(pageRowFragmentPositionList)
  }

  if (table?.pagingId && td) {
    const originTdId = td.pagingOriginId || td.id
    const positionList: IElementPosition[] = []
    sourceElementList.forEach(element => {
      if (element.type !== ElementType.TABLE || element.pagingId !== table.pagingId) {
        return
      }
      forEachTableCell({
        tableElement: element,
        tableIndex: -1,
        visitor: ({ td: fragmentTd }) => {
          if (
            fragmentTd.id === originTdId ||
            fragmentTd.pagingOriginId === originTdId
          ) {
            positionList.push(...(fragmentTd.positionList || []))
          }
        }
      })
    })
    return normalizeTablePositionList(positionList)
  }

  return normalizeTablePositionList(directPositionList)
}
