import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

/** 指针命中后，清理并应用超链接、日期等内联元素副作用。 */
export function applyInlinePointerEffects(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 原始 DOM 事件对象。 */
  evt: MouseEvent
  /** 命中的元素。 */
  element?: IElement
  /** 命中位置。 */
  position?: IElementPosition | null
  /** 是否只读。 */
  isReadonly: boolean
}) {
  const { draw, evt, element, position, isReadonly } = payload
  const components = draw.getComponents()
  components.hyperlinkParticle.clearHyperlinkPopup()
  components.dateParticle.clearDatePicker()
  if (!element || !position) return

  if (element.type === ElementType.HYPERLINK) {
    if (evt.ctrlKey || evt.metaKey) {
      components.hyperlinkParticle.openHyperlink(element)
    } else {
      components.hyperlinkParticle.drawHyperlinkPopup(element, position)
    }
  }

  if (element.type === ElementType.DATE && !isReadonly) {
    components.dateParticle.renderDatePicker(element, position)
  }
}
