import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IPreviewerDrawOption } from '../../../../interface/Previewer'
import { isControlPreviewerDragDisabled } from '../../control/policy/ControlPreviewerPolicy'
import { Draw } from '../../../draw/Draw'

function emitImageMousedown(payload: {
  /** 绘制核心实例，提供事件总线。 */
  draw: Draw
  /** 原始 DOM 事件对象。 */
  evt: MouseEvent
  /** 图片元素。 */
  element: IElement
}) {
  const { draw, evt, element } = payload
  const eventBus = draw.getEventBus()
  if (eventBus.isSubscribe('imageMousedown')) {
    eventBus.emit('imageMousedown', { evt, element })
  }
}

function isFloatingImageDisplay(element: IElement) {
  return (
    element.imgDisplay === ImageDisplay.SURROUND ||
    element.imgDisplay === ImageDisplay.TIGHT ||
    element.imgDisplay === ImageDisplay.FLOAT_TOP ||
    element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
  )
}

/** 图片被鼠标按下选中时，处理预览器、浮动图片和图片事件副作用。 */
export function handleImageSelectionStart(payload: {
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
  /** 是否直接命中图片。 */
  isDirectHitImage: boolean
  /** 拖拽快照捕获函数。 */
  captureDragSnapshot: () => void
}) {
  const {
    draw,
    evt,
    element,
    position,
    isReadonly,
    isDirectHitImage,
    captureDragSnapshot
  } = payload
  draw.getComponents().previewer.clearResizer()
  if (!isDirectHitImage || !element) return

  const previewerDrawOption: IPreviewerDrawOption = {
    dragDisable: isControlPreviewerDragDisabled({
      draw,
      element,
      isReadonly
    })
  }
  if (element.type === ElementType.LATEX) {
    previewerDrawOption.mime = 'svg'
    previewerDrawOption.srcKey = 'laTexSVG'
  }
  draw
    .getComponents()
    .previewer.drawResizer(element, position || undefined, previewerDrawOption)
  draw.getCursor().drawCursor({ isShow: false })
  captureDragSnapshot()

  if (isFloatingImageDisplay(element)) {
    draw.getComponents().imageParticle.createFloatImage(element)
  }
  emitImageMousedown({ draw, evt, element })
}

/** 双击直接命中图片时打开图片预览。 */
export function renderImagePreviewForDblclick(payload: {
  /** 绘制核心实例。 */
  draw: Draw
  /** 当前命中上下文。 */
  positionContext: {
    /** 是否命中图片。 */
    isImage?: boolean
    /** 是否直接命中。 */
    isDirectHit?: boolean
  }
}) {
  const { draw, positionContext } = payload
  if (!positionContext.isImage || !positionContext.isDirectHit) return false
  draw.getComponents().previewer.render()
  return true
}
