import { EDITOR_ELEMENT_STYLE_ATTR } from '../../../../dataset/constant/Element'
import { ElementType } from '../../../../dataset/enum/Element'
import { MoveDirection } from '../../../../dataset/enum/Observer'
import { IElement } from '../../../../interface/Element'
import { pickObject } from '../../../../utils'
import { CanvasEvent } from '../../CanvasEvent'
import { formatInsertContext } from '../shared/formatInsertContext'

export function runTabIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly()) return
  evt.preventDefault()
  const control = draw.getControl()
  const activeControl = control.getActiveControl()
  if (activeControl && control.getIsRangeWithinControl()) {
    control.initNextControl({
      direction: evt.shiftKey ? MoveDirection.UP : MoveDirection.DOWN
    })
    return
  }
  const rangeManager = draw.getRange()
  const elementList = draw.getObjectResolver().getElementList()
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  const paragraphElementList = rangeManager.getRangeParagraphElementList()
  if (paragraphElementList?.some(element => element.listId)) {
    const isHandled = draw
      .getListParticle()
      .indentList(evt.shiftKey ? -1 : 1)
    if (isHandled) {
      return
    }
  }
  const anchorStyle = rangeManager.getRangeAnchorStyle(elementList, endIndex)
  const copyStyle = anchorStyle
    ? pickObject(anchorStyle, EDITOR_ELEMENT_STYLE_ATTR)
    : null
  const tabElement: IElement = {
    ...copyStyle,
    type: ElementType.TAB,
    value: ''
  }
  formatInsertContext({
    draw,
    elementList,
    insertElementList: [tabElement],
    startIndex
  })
  draw.insertElementList([tabElement])
}
