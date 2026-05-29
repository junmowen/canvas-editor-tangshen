import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { isControlPlaceholderRange } from '../../modules/control/selection/isControlPlaceholderRange'
import { Draw } from '../../draw/Draw'
import { resolvePositionAtIndex } from '../../position/utils/resolvePositionAtIndex'
import {
  createTableDragPositionContext,
  createTableDragSelectionHit,
  isSameTableDragSelectionCell,
  isSameTableDragSelectionFragment,
  ITableDragSelectionHit,
  resolveTableCellDragSelection,
  shouldSelectSingleTableCell
} from '../../modules/table/selection/resolveTableDragSelectionRange'

/** resolved选区drag范围契约，用于约束内部流程中传递的数据结构。 */
export interface IResolvedSelectionDragRange {
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext?: IPositionContext
  /** 是否选区drag，用于控制当前流程的判断分支。 */
  hasSelectionDrag: boolean
}

/** resolve选区drag范围调用载荷，聚合执行该操作所需的输入数据。 */
interface IResolveSelectionDragRangePayload {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 起始坐标，用于记录拖拽或选区开始位置。 */
  startPosition: ICurrentPosition
  /** 位置命中结果，保存指针坐标解析后的索引和上下文。 */
  positionResult: ICurrentPosition
  /** pointerx数值，用于当前布局、统计或索引计算。 */
  pointerX?: number
  /** pointery数值，用于当前布局、统计或索引计算。 */
  pointerY?: number
  /** 结束boundary索引，用于定位对应元素、行或片段。 */
  endBoundaryIndex: number
  /** 结束命中目标索引，用于定位对应元素、行或片段。 */
  endHitTargetIndex?: number
}

/** 基准文本命中契约，用于约束内部流程中传递的数据结构。 */
interface IBaseTextHit {
  /** 边界索引，用于定位控件或选区的临界元素。 */
  boundaryIndex: number
  /** 命中索引，用于定位对应元素、行或片段。 */
  hitIndex?: number
  /** 是否右侧boundary命中，用于控制当前流程的判断分支。 */
  isRightBoundaryHit?: boolean
}

/** 文本命中契约，用于约束内部流程中传递的数据结构。 */
interface ITextHit extends IBaseTextHit {
  object: 'text'
}

/** pointer命中类型，用于约束内部流程中传递的数据结构。 */
type TPointerHit = ITextHit | ITableDragSelectionHit

function isTableTextHit(hit: TPointerHit): hit is ITableDragSelectionHit {
  return hit.object === 'table-text'
}

function normalizeRange(startIndex: number, endIndex: number): IRange | null {
  if (startIndex === endIndex) return null
  return startIndex < endIndex
    ? { startIndex, endIndex }
    : { startIndex: endIndex, endIndex: startIndex }
}

function toPointerHit(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: ICurrentPosition
  /** 边界索引，用于定位控件或选区的临界元素。 */
  boundaryIndex: number
  /** 命中索引，用于定位对应元素、行或片段。 */
  hitIndex?: number
}): TPointerHit {
  const { draw, position, boundaryIndex, hitIndex } = payload
  if (position.isTable) {
    return createTableDragSelectionHit({
      draw,
      position,
      boundaryIndex,
      hitIndex
    })
  }
  const resolveIsRightBoundaryHit = () => {
    if (position.forceNotRightBoundaryHit) return false
    if (hitIndex === undefined || position.x === undefined) return false
    const hitPosition = resolvePositionAtIndex(draw, hitIndex)
    const rightX = hitPosition?.coordinate.rightTop[0]
    return rightX !== undefined ? position.x >= rightX - 1 : false
  }
  return {
    object: 'text',
    boundaryIndex,
    hitIndex,
    isRightBoundaryHit: resolveIsRightBoundaryHit()
  }
}

function isSameTextObject(startHit: TPointerHit, endHit: TPointerHit): boolean {
  if (startHit.object !== endHit.object) return false
  if (startHit.object === 'text' && endHit.object === 'text') return true
  if (!isTableTextHit(startHit) || !isTableTextHit(endHit)) return false
  return isSameTableDragSelectionCell(startHit, endHit)
}

function shouldUseHitTextRange(startHit: TPointerHit, endHit: TPointerHit): boolean {
  if (startHit.object === 'text' && endHit.object === 'text') return true
  if (isTableTextHit(startHit) && isTableTextHit(endHit)) {
    return isSameTableDragSelectionFragment(startHit, endHit)
  }
  return false
}

function resolveHitRangeStartBoundary(hit: TPointerHit): number {
  if (hit.hitIndex !== undefined) {
    if (hit.isRightBoundaryHit) {
      return hit.boundaryIndex
    }
    return hit.hitIndex - 1
  }
  return hit.boundaryIndex
}

function resolveHitRangeEndBoundary(hit: TPointerHit): number {
  if (hit.hitIndex !== undefined) {
    return Math.max(hit.boundaryIndex, hit.hitIndex)
  }
  return hit.boundaryIndex
}

function resolveTextSelection(payload: {
  /** 起点命中结果，用于记录范围左侧的指针解析状态。 */
  startHit: TPointerHit
  /** 终点命中结果，用于记录范围右侧的指针解析状态。 */
  endHit: TPointerHit
  /** use命中范围，用于描述布局或命中的空间范围。 */
  useHitRange: boolean
}): IRange | null {
  const { startHit, endHit, useHitRange } = payload
  if (
    useHitRange &&
    startHit.hitIndex !== undefined &&
    endHit.hitIndex !== undefined
  ) {
    if (startHit.isRightBoundaryHit) {
      return normalizeRange(
        startHit.boundaryIndex,
        startHit.boundaryIndex > endHit.boundaryIndex
          ? endHit.boundaryIndex
          : resolveHitRangeEndBoundary(endHit)
      )
    }
    return normalizeRange(
      Math.min(
        resolveHitRangeStartBoundary(startHit),
        resolveHitRangeStartBoundary(endHit)
      ),
      Math.max(
        resolveHitRangeEndBoundary(startHit),
        resolveHitRangeEndBoundary(endHit)
      )
    )
  }
  return normalizeRange(startHit.boundaryIndex, endHit.boundaryIndex)
}

export function resolveSelectionDragRange(
  payload: IResolveSelectionDragRangePayload
): IResolvedSelectionDragRange | null {
  const {
    draw,
    startPosition,
    positionResult,
    pointerX,
    pointerY,
    endBoundaryIndex,
    endHitTargetIndex
  } = payload

  const startHit = toPointerHit({
    draw,
    position: startPosition,
    boundaryIndex: startPosition.index,
    hitIndex: startPosition.hitTargetIndex
  })
  const endHit = toPointerHit({
    draw,
    position: positionResult,
    boundaryIndex: endBoundaryIndex,
    hitIndex: endHitTargetIndex
  })
  if (isSameTextObject(startHit, endHit)) {
    const range = resolveTextSelection({
      startHit,
      endHit,
      useHitRange: shouldUseHitTextRange(startHit, endHit)
    })
    if (range) {
      if (startHit.object === 'text' && isControlPlaceholderRange(draw, range)) {
        return null
      }
      return {
        range,
        positionContext:
          endHit.object === 'table-text'
            ? createTableDragPositionContext(endHit)
            : undefined,
        hasSelectionDrag: true
      }
    }
    if (
      isTableTextHit(startHit) &&
      isTableTextHit(endHit) &&
      shouldSelectSingleTableCell({
        startHit,
        endHit,
        startPosition,
        pointerX,
        pointerY
      })
    ) {
      return resolveTableCellDragSelection({ startHit, endHit })
    }
    return null
  }

  if (startHit.object === 'table-text' && endHit.object === 'table-text') {
    return resolveTableCellDragSelection({ startHit, endHit })
  }

  return null
}
