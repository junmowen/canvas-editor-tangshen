import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'
import { formatInsertContext } from './formatInsertContext'

export function insertWithContext(payload: {
  draw: Draw
  elementList: IElement[]
  insertElementList: IElement[]
  startIndex: number
  endIndex: number
  isCollapsed: boolean
  cursorIndex: number
  isBreakWhenWrap?: boolean
}) {
  const {
    draw,
    elementList,
    insertElementList,
    startIndex,
    endIndex,
    isCollapsed,
    cursorIndex,
    isBreakWhenWrap = false
  } = payload
  formatInsertContext({
    draw,
    elementList,
    insertElementList,
    startIndex,
    isBreakWhenWrap
  })
  if (isCollapsed) {
    draw.spliceElementList(elementList, cursorIndex + 1, 0, insertElementList)
  } else {
    draw.spliceElementList(
      elementList,
      startIndex + 1,
      endIndex - startIndex,
      insertElementList
    )
  }
  return cursorIndex + insertElementList.length
}
