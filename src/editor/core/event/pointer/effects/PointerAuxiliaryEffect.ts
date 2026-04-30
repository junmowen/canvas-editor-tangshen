import { ElementType } from '../../../../dataset/enum/Element'
import { IElementPosition } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

export function clearHyperlinkEffect(draw: Draw) {
  draw.getComponents().hyperlinkParticle.clearHyperlinkPopup()
}

export function applyHyperlinkEffect(payload: {
  draw: Draw
  evt: MouseEvent
  element: any
  position: IElementPosition
}) {
  const { draw, evt, element, position } = payload
  if (!element || !position) return
  const hyperlinkParticle = draw.getComponents().hyperlinkParticle
  if (element.type !== ElementType.HYPERLINK) return
  if (evt.ctrlKey || evt.metaKey) {
    hyperlinkParticle.openHyperlink(element)
  } else {
    hyperlinkParticle.drawHyperlinkPopup(element, position)
  }
}

export function clearDateEffect(draw: Draw) {
  draw.getComponents().dateParticle.clearDatePicker()
}

export function applyDateEffect(payload: {
  draw: Draw
  element: any
  position: IElementPosition
  isReadonly: boolean
}) {
  const { draw, element, position, isReadonly } = payload
  if (!element || !position) return
  if (element.type !== ElementType.DATE || isReadonly) return
  draw.getComponents().dateParticle.renderDatePicker(element, position)
}

export function emitImageMousedownEffect(payload: {
  draw: Draw
  evt: MouseEvent
  element: any
}) {
  const { draw, evt, element } = payload
  if (!element) return
  const eventBus = draw.getEventBus()
  if (eventBus.isSubscribe('imageMousedown')) {
    eventBus.emit('imageMousedown', { evt, element })
  }
}
