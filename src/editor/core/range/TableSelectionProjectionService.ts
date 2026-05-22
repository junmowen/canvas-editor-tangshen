import { IElementPosition } from '../../interface/Element'
import { IRange } from '../../interface/Range'
import { Draw } from '../draw/Draw'
import { resolveSelectionContentRange } from './utils/resolveSelectionContent'
import { IGetTableSelectionRenderRangePayload, ITableSelectionRenderRange } from '../table/selection/TableSelectionTypes'

/**
 * 表格选区投影服务。
 *
 * 负责把 RangeManager 的内部 raw range 统一投影成公开 range / cursor / content range。
 */
export class TableSelectionProjectionService {
  constructor(
    private readonly draw: Draw,
    private readonly hooks: {
      getRawRange: () => IRange
      resolveActiveTableLeadingOffset: () => number
      resolveActiveTableFragmentOffset: (
        leadingOffset: number,
        cursorPosition?: IElementPosition | null
      ) => number
    }
  ) {}

  /** 获取当前选区对应的真实内容切片范围。 */
  public getSelectionContentRange() {
    // 统一把边界语义转换为真实内容切片范围。
    const { startIndex, endIndex } = this.hooks.getRawRange()
    return resolveSelectionContentRange(startIndex, endIndex)
  }

  /** 获取对外公开的光标位置，并统一修正表格偏移。 */
  public getPublicCursorPosition(): IElementPosition | null {
    // 表格闭合光标对外暴露时，需要扣掉 leading offset 与 fragment offset，
    // 保证对外 cursor 语义稳定落在逻辑单元格索引上。
    const positionContext = this.draw.getPosition().getPositionContext()
    const cursorPosition = this.draw.getPosition().getCursorPosition()
    if (!cursorPosition || !positionContext.isTable) {
      return cursorPosition
    }
    const leadingOffset = this.hooks.resolveActiveTableLeadingOffset()
    const fragmentOffset = 0
    return {
      ...cursorPosition,
      index: Math.max(0, cursorPosition.index - leadingOffset - fragmentOffset)
    }
  }

  /** 获取对外公开的 range，并统一修正表格逻辑索引。 */
  public getPublicRange(): IRange {
    // 公开 range 与内部编辑边界不同：
    // 内部保留 fragment / leading 偏移，公开输出统一回到逻辑表格语义。
    const range = { ...this.hooks.getRawRange() }
    const positionContext = this.draw.getPosition().getPositionContext()
    const leadingOffset = positionContext.isTable
      ? this.hooks.resolveActiveTableLeadingOffset()
      : 0
    const normalizedRange = leadingOffset
      ? {
          ...range,
          startIndex: Math.max(0, range.startIndex - leadingOffset),
          endIndex: Math.max(0, range.endIndex - leadingOffset)
        }
      : range

    if (normalizedRange.startIndex === normalizedRange.endIndex) {
      const publicCursorPosition = this.draw.getPosition().getCursorPosition()
      if (publicCursorPosition && positionContext.isTable) {
        const activeSlice = this.draw
          .getTableLayoutSnapshotAccessor()
          .resolveSliceByPositionContext(positionContext)
        if (
          activeSlice &&
          normalizedRange.startIndex < activeSlice.absoluteStart
        ) {
          return normalizedRange
        }
        const fragmentOffset = this.hooks.resolveActiveTableFragmentOffset(
          leadingOffset,
          publicCursorPosition
        )
        return {
          ...normalizedRange,
          startIndex: Math.max(
            0,
            publicCursorPosition.index - leadingOffset - fragmentOffset
          ),
          endIndex: Math.max(
            0,
            publicCursorPosition.index - leadingOffset - fragmentOffset
          )
        }
      }

      const fragmentOffset = this.hooks.resolveActiveTableFragmentOffset(
        leadingOffset,
        this.draw.getPosition().getCursorPosition()
      )
      if (!fragmentOffset) {
        return normalizedRange
      }
      return {
        ...normalizedRange,
        startIndex: Math.max(0, normalizedRange.startIndex - fragmentOffset),
        endIndex: Math.max(0, normalizedRange.endIndex - fragmentOffset)
      }
    }

    const selectionContentRange = resolveSelectionContentRange(
      normalizedRange.startIndex,
      normalizedRange.endIndex
    )
    if (!selectionContentRange) {
      return normalizedRange
    }
    return {
      ...normalizedRange,
      startIndex: selectionContentRange.startIndex,
      endIndex: selectionContentRange.endIndex + 1
    }
  }

  /** 获取表格渲染选区使用的局部范围。 */
  public getRenderSelectionRange(
    payload: IGetTableSelectionRenderRangePayload = {}
  ): ITableSelectionRenderRange | null {
    const rawRange = this.hooks.getRawRange()
    const { startIndex, endIndex, isCrossRowCol } = rawRange
    if (isCrossRowCol || startIndex === endIndex) return null

    const contentRange = this.getSelectionContentRange()
    if (!contentRange) return null

    const { elementList, tableCellContext } = payload
    const positionContext = this.draw.getPosition().getPositionContext()
    const snapshotAccessor = this.draw.getTableLayoutSnapshotAccessor()
    const activeFragmentCellKey =
      snapshotAccessor.resolveSliceByPositionContext(positionContext)?.cellKey || null

    if (tableCellContext) {
      if (!positionContext.isTable && !rawRange.tableId) {
        return null
      }
      const currentSlice =
        snapshotAccessor.resolveSliceByFragmentContext(tableCellContext)
      const currentFragmentCellKey = currentSlice?.cellKey || null
      const currentCellSlices =
        snapshotAccessor.getCellSlicesByCellKey(currentFragmentCellKey)
      if (
        activeFragmentCellKey &&
        currentFragmentCellKey &&
        currentFragmentCellKey !== activeFragmentCellKey
      ) {
        return null
      }
      const fragmentRange = snapshotAccessor.resolveCellLocalRange(
        tableCellContext,
        startIndex,
        endIndex
      )
      if (fragmentRange) {
        return {
          startIndex: fragmentRange.startIndex,
          endIndex: fragmentRange.endIndex
        }
      }
      if (currentCellSlices.length > 1) {
        return null
      }
      return {
        startIndex: contentRange.startIndex,
        endIndex: contentRange.endIndex
      }
    }

    if (elementList?.length) {
      const fragmentRange = snapshotAccessor.getSelectionRangeForElementList(
        elementList,
        startIndex,
        endIndex,
        activeFragmentCellKey
      )
      if (fragmentRange) {
        return {
          startIndex: fragmentRange.startIndex,
          endIndex: fragmentRange.endIndex
        }
      }
    }

    return {
      startIndex: contentRange.startIndex,
      endIndex: contentRange.endIndex
    }
  }
}
