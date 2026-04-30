import { ImageDisplay } from '../../../../../dataset/enum/Common'
import { EditorMode } from '../../../../../dataset/enum/Editor'
import { ElementType } from '../../../../../dataset/enum/Element'
import { IPreviewerDrawOption } from '../../../../../interface/Previewer'
import { CanvasEvent } from '../../../CanvasEvent'
import { captureDragSnapshot } from '../drag-drop/CaptureDragSnapshotIntent'
import {
  applyCheckboxToggle,
  applyRadioToggle,
  applyValueLinkedControlToggle
} from '../controls/ControlToggleIntent'
import {
  applyDateEffect,
  applyHyperlinkEffect,
  clearDateEffect,
  clearHyperlinkEffect,
  emitImageMousedownEffect
} from '../../effects/PointerAuxiliaryEffect'
import {
  clearPreviewerResizer,
  hideCursorForPreviewer,
  showImageResizer
} from '../../effects/PreviewerEffect'
import {
  renderSelectionStart
} from '../../effects/PointerRenderEffect'
import {
  disposeTableTool,
  renderTableToolIfNeeded
} from '../../effects/TableToolEffect'

export function runSelectionStartIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
  oldPositionContextTdId?: string
  isReadonly: boolean
  positionResult: any
}) {
  const { host, evt, oldPositionContextTdId, isReadonly, positionResult } = payload
  const draw = host.getDraw()
  const components = draw.getComponents()
  const position = components.position
  const rangeManager = components.range
  const { index, isDirectHit, isCheckbox, isRadio, isImage, isTable, tdValueIndex } =
    positionResult
  const elementList = draw.getElementList()
  const positionList = position.getPositionList()
  const curIndex = isTable ? tdValueIndex! : index
  const targetElementIndex = isTable
    ? tdValueIndex!
    : (positionResult.hitTargetIndex ?? index)
  const curElement = elementList[targetElementIndex]
  const isDirectHitImage = !!(isDirectHit && isImage)
  const isDirectHitCheckbox = !!(isDirectHit && isCheckbox)
  const isDirectHitRadio = !!(isDirectHit && isRadio)

  if (~index) {
    let startIndex = curIndex
    let endIndex = curIndex
    if (evt.shiftKey) {
      const { startIndex: oldStartIndex } = rangeManager.getEditBoundaryRange()
      if (~oldStartIndex) {
        const newPositionContext = position.getPositionContext()
        if (newPositionContext.tdId === oldPositionContextTdId) {
          if (curIndex > oldStartIndex) {
            startIndex = oldStartIndex
          } else {
            endIndex = oldStartIndex
          }
        }
      }
    }

    rangeManager.setRange(startIndex, endIndex)
    // 点击当前视觉行左侧空白时，命中边界可能仍是上一逻辑边界，
    // 但光标必须画在“当前行最前面”的显式位置。
    const nextCursorPosition = positionResult.cursorPosition || positionList[curIndex]
    position.setCursorPosition(nextCursorPosition)

    if (isDirectHitCheckbox && !isReadonly) {
      applyCheckboxToggle({ draw, element: curElement })
    } else if (isDirectHitRadio && !isReadonly) {
      applyRadioToggle({ draw, element: curElement })
    } else {
      const isHandledLinkedControl = applyValueLinkedControlToggle({
        draw,
        elementList,
        curIndex: targetElementIndex
      })
      if (!isHandledLinkedControl) {
        renderSelectionStart({
          draw,
          curIndex,
          isSetCursor: !isDirectHitImage && !isDirectHitCheckbox && !isDirectHitRadio,
          preserveCurrentCursor: !!positionResult.cursorPosition
        })
      }
    }
  }

  clearPreviewerResizer(draw)
  if (isDirectHitImage) {
    const previewerDrawOption: IPreviewerDrawOption = {
      dragDisable:
        isReadonly || (!curElement.controlId && draw.getMode() === EditorMode.FORM)
    }
    if (curElement.type === ElementType.LATEX) {
      previewerDrawOption.mime = 'svg'
      previewerDrawOption.srcKey = 'laTexSVG'
    }
    showImageResizer({
      draw,
      element: curElement,
      position: positionList[targetElementIndex],
      options: previewerDrawOption
    })
    hideCursorForPreviewer(draw)
    captureDragSnapshot(host)
    if (
      curElement.imgDisplay === ImageDisplay.SURROUND ||
      curElement.imgDisplay === ImageDisplay.FLOAT_TOP ||
      curElement.imgDisplay === ImageDisplay.FLOAT_BOTTOM
    ) {
      components.imageParticle.createFloatImage(curElement)
    }
    emitImageMousedownEffect({ draw, evt, element: curElement })
  }

  disposeTableTool(draw)
  renderTableToolIfNeeded({ draw, isTable, isReadonly })

  clearHyperlinkEffect(draw)
  applyHyperlinkEffect({
    draw,
    evt,
    element: curElement,
    position: positionList[targetElementIndex]
  })

  clearDateEffect(draw)
  applyDateEffect({
    draw,
    element: curElement,
    position: positionList[targetElementIndex],
    isReadonly
  })
}
