import { ICurrentPosition } from '../../../../interface/Position'
import { Draw } from '../../../draw/Draw'
import { IPagePoint } from '../../../event/pointer/coordinates/PagePointTypes'
import { resolvePointerMouseDownIndex } from '../../../range/selection/resolvePointerMouseDownIndex'

/** resolve表格选区起始state调用载荷，聚合执行该操作所需的输入数据。 */
export interface IResolveTableSelectionStartStatePayload {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 页面内坐标，用于把指针位置映射到具体页。 */
  pagePoint: IPagePoint | null
  /** 位置命中结果，保存指针坐标解析后的索引和上下文。 */
  positionResult: ICurrentPosition
  /** 当前元素索引，用于定位命中或遍历所在位置。 */
  currentIndex: number
  /** 当前局部索引，用于定位表格片段内的命中元素。 */
  currentLocalIndex: number
  /** 命中目标索引，用于定位指针事件落点对应的元素。 */
  hitTargetIndex?: number
}

/** resolved表格选区起始state契约，用于约束内部流程中传递的数据结构。 */
export interface IResolvedTableSelectionStartState {
  /** 鼠标按下时的元素索引，用于确定拖拽或选区起点。 */
  mouseDownIndex: number
}

export function resolveTableSelectionStartState(
  payload: IResolveTableSelectionStartStatePayload
): IResolvedTableSelectionStartState {
  const {
    draw,
    pagePoint,
    positionResult,
    currentIndex,
    currentLocalIndex,
    hitTargetIndex
  } = payload

  const positionList = draw.getCoordinate().getPositionList()
  const currentPosition =
    positionList[currentLocalIndex] || positionList[positionList.length - 1] || null
  const hitTargetPosition =
    hitTargetIndex !== undefined
      ? positionList[hitTargetIndex] || currentPosition
      : currentPosition

  const pointerMouseDownDefaultIndex =
    positionResult.tdValueIndex !== undefined
      ? positionResult.tdValueIndex
      : currentIndex
  const mouseDownIndex = resolvePointerMouseDownIndex({
    pagePoint,
    hitTargetPosition,
    currentIndex,
    hitTargetIndex,
    defaultIndex: pointerMouseDownDefaultIndex
  })

  return {
    mouseDownIndex
  }
}
