import { ZERO } from '../../../../dataset/constant/Common'
import { IElementPosition } from '../../../../interface/Element'
import { IRange } from '../../../../interface/Range'
import { Draw } from '../../../draw/Draw'

function resolveActiveLogicalTableCell(draw: Draw, range: IRange) {
  return draw.getTargetResolver().resolveActiveLogicalTableCell({
    range,
    positionContext: draw.getCoordinate().getPositionContext()
  })
}

/** 获取当前表格单元格的前置零宽占位偏移。 */
export function resolveActiveTableLeadingOffset(payload: {
  /** 绘制核心实例，提供表格 target resolver。 */
  draw: Draw
  /** 当前原始 range。 */
  range: IRange
}) {
  const { draw, range } = payload
  const logicalCell = resolveActiveLogicalTableCell(draw, range)
  if (!logicalCell) {
    return 0
  }
  const td = draw.getTargetResolver().resolveActiveLogicalTableTd({
    range,
    positionContext: draw.getCoordinate().getPositionContext()
  })?.td
  return td?.value?.[0]?.value === ZERO && td.value[1] ? 1 : 0
}

/** 获取当前表格分页碎片相对逻辑单元格的偏移。 */
export function resolveActiveTableFragmentOffset(payload: {
  /** 绘制核心实例，提供表格 target resolver。 */
  draw: Draw
  /** 当前原始 range。 */
  range: IRange
  /** 当前表格单元格的前置零宽占位偏移。 */
  leadingOffset: number
  /** 当前光标位置。 */
  cursorPosition?: IElementPosition | null
}) {
  const { draw, range, leadingOffset, cursorPosition } = payload
  const targetResolver = draw.getTargetResolver()
  const positionContext = draw.getCoordinate().getPositionContext()
  const activeSlice = targetResolver.resolveTableSliceByPositionContext(
    positionContext
  )
  const logicalCell = resolveActiveLogicalTableCell(draw, range)
  if (!logicalCell || !cursorPosition) {
    return 0
  }
  const activeTd = targetResolver.resolveActiveLogicalTableTd({
    range,
    positionContext
  })
  const td = activeTd?.td
  if (!td || td.rowspan > 1 || td.colspan > 1) {
    return 0
  }
  const table = activeTd?.table
  const tr = activeTd?.tr
  const logicalTd = activeTd?.td
  const logicalCellIdentity =
    table?.id && tr?.id && logicalTd?.id
      ? {
          tableId: table.id,
          trId: tr.id,
          tdId: logicalTd.id
        }
      : null
  const sliceList =
    logicalCellIdentity
      ? targetResolver.getCellSlicesByLogicalCell(logicalCellIdentity)
      : []
  if (sliceList.length <= 1) {
    return 0
  }
  const resolvedActiveSlice =
    (logicalCellIdentity
      ? targetResolver.resolveCellSliceByAbsoluteIndex({
          ...logicalCellIdentity,
          absoluteIndex: cursorPosition.index
        })
      : null) ||
    (logicalCellIdentity
      ? targetResolver.resolveCellSliceByPageNo({
          ...logicalCellIdentity,
          pageNo: cursorPosition.pageNo
        })
      : null) ||
    activeSlice ||
    null
  if (!resolvedActiveSlice) {
    return 0
  }
  return Math.max(0, resolvedActiveSlice.absoluteStart - leadingOffset)
}
