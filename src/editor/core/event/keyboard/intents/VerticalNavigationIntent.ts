import { ElementType } from '../../../../dataset/enum/Element'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { IElementPosition } from '../../../../interface/Element'
import { CanvasEvent } from '../../CanvasEvent'
import { applyTableToolState } from '../shared/applyTableToolState'
import { finalizeVerticalMove } from '../shared/finalizeVerticalMove'

interface IGetNextPositionIndexPayload {
  positionList: IElementPosition[]
  index: number
  rowNo: number
  isUp: boolean
  cursorX: number
}

function getNextPositionIndex(payload: IGetNextPositionIndexPayload) {
  const { positionList, index, isUp, rowNo, cursorX } = payload
  let nextIndex = -1
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
  const tableNavigationService = components.tableNavigationService
  let anchorStartIndex = -1
  let anchorEndIndex = -1
  const positionContext = coordinate.getPositionContext()

  if (!evt.shiftKey && positionContext.isTable) {
    const navigationResult = tableNavigationService.resolveVerticalNavigation({
      positionContext,
      cursorIndex: activeBoundaryIndex,
      direction: isUp ? 'up' : 'down'
    })
    if (!navigationResult) return
    if (navigationResult.nextPositionContext) {
      coordinate.setPositionContext(navigationResult.nextPositionContext)
      positionList = coordinate.getPositionList()
    }
    anchorStartIndex = navigationResult.nextIndex
    anchorEndIndex = anchorStartIndex
    applyTableToolState(draw, !!navigationResult.disposeTableTool)
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
      tableNavigationService.resolveVerticalFragmentTransition({
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
    const elementList = draw.getObjectResolver().getElementList()
    const nextElement = elementList[nextIndex]
    if (nextElement.type === ElementType.TABLE) {
      const navigationResult = tableNavigationService.resolveVerticalEntryNavigation({
        tableIndex: nextIndex,
        cursorX: curRightX,
        direction: isUp ? 'up' : 'down'
      })
      if (navigationResult) {
        coordinate.setPositionContext(navigationResult.nextPositionContext)
        anchorStartIndex = navigationResult.nextIndex
        anchorEndIndex = anchorStartIndex
        positionList = coordinate.getPositionList()
        applyTableToolState(draw, false)
      }
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
