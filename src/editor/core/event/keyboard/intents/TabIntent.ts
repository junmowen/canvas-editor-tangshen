import { EDITOR_ELEMENT_STYLE_ATTR } from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'
import { pickObject } from '../../../../utils'
import { tryNavigateActiveControl } from '../../../modules/control/navigation/tryNavigateActiveControl'
import { tryIndentListOnTab } from '../../../modules/list/interaction/ListKeyboardInteraction'
import { createParagraphTabElement } from '../../../modules/paragraph/interaction/ParagraphIntentElementPolicy'
import { CanvasEvent } from '../../CanvasEvent'
import { formatInsertContext } from '../shared/formatInsertContext'

export function runTabIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly()) return
  evt.preventDefault()
  const control = draw.getControl()
  if (tryNavigateActiveControl(control, evt.shiftKey ? 'prev' : 'next')) {
    return
  }
  const rangeManager = draw.getRange()
  const elementList = draw.getObjectResolver().getElementList()
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  const paragraphElementList = rangeManager.getRangeParagraphElementList()
  if (tryIndentListOnTab({
    draw,
    paragraphElementList,
    direction: evt.shiftKey ? -1 : 1
  })) {
    return
  }
  const anchorStyle = rangeManager.getRangeAnchorStyle(elementList, endIndex)
  const copyStyle = anchorStyle
    ? pickObject(anchorStyle, EDITOR_ELEMENT_STYLE_ATTR)
    : null
  const tabElement: IElement = createParagraphTabElement(copyStyle)
  formatInsertContext({
    draw,
    elementList,
    insertElementList: [tabElement],
    startIndex
  })
  draw.insertElementList([tabElement])
}
