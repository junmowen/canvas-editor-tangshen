import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { IElementPosition } from '../../../../interface/Element'
import {
  resolveTableVerticalKeyboardEntry,
  resolveTableVerticalKeyboardFragmentTransition,
  resolveTableVerticalKeyboardMove
} from '../../../modules/table/navigation/resolveTableVerticalKeyboardMove'
import { CanvasEvent } from '../../CanvasEvent'
import { finalizeVerticalMove } from '../shared/finalizeVerticalMove'

/** 获取下一个位置索引调用载荷，聚合执行该操作所需的输入数据。 */
interface IGetNextPositionIndexPayload {
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[]
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 行号，用于定位页面内的目标行。 */
  rowNo: number
  /** 是否向上移动，用于控制垂直导航方向。 */
  isUp: boolean
  /** 光标横坐标，用于计算行内插入位置。 */
  cursorX: number
}

function getNextPositionIndex(payload: IGetNextPositionIndexPayload) {
  const { positionList, index, isUp, rowNo, cursorX } = payload
  let nextIndex = -1
  // 初始化 probable Position 列表。
  const probablePosition: IElementPosition[] = []
  if (isUp) {
    let p = index - 1
    while (p >= 0) {
      const position = positionList[p]
      p--
      if (position.rowNo === rowNo) continue
      if (probablePosition[0] && probablePosition[0].rowNo !== position.rowNo) {
        break
      }
      probablePosition.unshift(position)
    }
  } else {
    let p = index + 1
    while (p < positionList.length) {
      const position = positionList[p]
      p++
      if (position.rowNo === rowNo) continue
      if (probablePosition[0] && probablePosition[0].rowNo !== position.rowNo) {
        break
      }
      probablePosition.push(position)
    }
  }
  for (let p = 0; p < probablePosition.length; p++) {
    const nextPosition = probablePosition[p]
    const {
      coordinate: {
        leftTop: [nextLeftX],
        rightTop: [nextRightX]
      }
    } = nextPosition
    if (p === probablePosition.length - 1) {
      nextIndex = nextPosition.index
    }
    if (cursorX < nextLeftX || cursorX > nextRightX) continue
    nextIndex = nextPosition.index
    break
  }
  return nextIndex
}

export function runVerticalNavigationIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  if (draw.isReadonly()) return
  const coordinate = draw.getCoordinate()
  const cursorPosition = coordinate.getCursorPosition()
  if (!cursorPosition) return
  const rangeManager = components.range
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  const activeBoundaryIndex =
    startIndex === endIndex ? endIndex : cursorPosition.index
  let positionList = coordinate.getPositionList()
  const isUp = evt.key === KeyMap.Up
  let anchorStartIndex = -1
  let anchorEndIndex = -1
  const positionContext = coordinate.getPositionContext()

  const tableNavigation = resolveTableVerticalKeyboardMove({
    draw,
    cursorIndex: activeBoundaryIndex,
    isShiftKey: evt.shiftKey,
    direction: isUp ? 'up' : 'down'
  })
  if (tableNavigation) {
    if (!tableNavigation.handled) return
    anchorStartIndex = tableNavigation.nextIndex
    anchorEndIndex = anchorStartIndex
    positionList = tableNavigation.positionList
  } else {
    let anchorPosition: IElementPosition = cursorPosition
    if (evt.shiftKey) {
      anchorPosition =
        startIndex === cursorPosition.index
          ? positionList[endIndex]
          : positionList[startIndex]
    }
    const {
      index,
      rowNo,
      rowIndex,
      coordinate: {
        rightTop: [curRightX]
      }
    } = anchorPosition
    const rowCount = draw.getObjectResolver().getRowList().length
    if ((isUp && rowIndex === 0) || (!isUp && rowIndex === rowCount - 1)) {
      return
    }
    const nextIndex = getNextPositionIndex({
      positionList,
      index,
      rowNo,
      isUp,
      cursorX: curRightX
    })
    if (nextIndex < 0) return
    const nextPosition = positionList[nextIndex]
    const fragmentBoundaryIndex =
      resolveTableVerticalKeyboardFragmentTransition({
        draw,
        positionContext,
        cursorIndex: activeBoundaryIndex,
        cursorPageNo: cursorPosition.pageNo,
        nextPositionPageNo: nextPosition?.pageNo,
        isShiftKey: evt.shiftKey
      })
    if (fragmentBoundaryIndex !== null) {
      finalizeVerticalMove({
        draw,
        anchorStartIndex: fragmentBoundaryIndex,
        anchorEndIndex: fragmentBoundaryIndex,
        positionList,
        isUp: false
      })
      evt.preventDefault()
      return
    }
    anchorStartIndex = nextIndex
    anchorEndIndex = nextIndex
    if (evt.shiftKey) {
      if (startIndex !== endIndex) {
        if (startIndex === cursorPosition.index) {
          anchorStartIndex = startIndex
        } else {
          anchorEndIndex = endIndex
        }
      } else if (isUp) {
        anchorEndIndex = endIndex
      } else {
        anchorStartIndex = startIndex
      }
    }
    const tableEntry = resolveTableVerticalKeyboardEntry({
      draw,
      tableIndex: nextIndex,
      cursorX: curRightX,
      direction: isUp ? 'up' : 'down'
    })
    if (tableEntry) {
      anchorStartIndex = tableEntry.nextIndex
      anchorEndIndex = anchorStartIndex
      positionList = tableEntry.positionList
    }
  }

  finalizeVerticalMove({
    draw,
    anchorStartIndex,
    anchorEndIndex,
    positionList,
    isUp
  })
}
