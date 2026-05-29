import { resolveDisabledControlCursorIndex } from '../../../../modules/control/selection/resolveDisabledControlCursorIndex'
import { CanvasEvent } from '../../../CanvasEvent'
import { captureDragSnapshot } from '../drag-drop/CaptureDragSnapshotIntent'
import {
  applyCheckboxToggle,
  applyRadioToggle,
  applyValueLinkedControlToggle,
  canToggleFormControl,
  renderBeforeFormControlToggle
} from '../../../../modules/control/interaction/ControlToggleInteraction'
import { handleImageSelectionStart } from '../../../../modules/image/interaction/handleImageSelectionStart'
import { applyInlinePointerEffects } from '../../../../modules/inline/interaction/applyInlinePointerEffects'
import { renderSelectionStart } from '../../effects/PointerRenderEffect'
import {
  disposeTableTool,
  renderTableToolIfNeeded
} from '../../../../modules/table/interaction/TableToolEffect'
import { resolveTableShiftSelectionBoundary } from '../../../../modules/table/selection/resolveTablePointerSelection'
import {
  resolveTableAwarePointerIndex,
  resolveTableAwarePointerTargetIndex
} from '../../../../modules/table/selection/resolveTablePointerIndex'
import { resolvePositionAtIndex } from '../../../../position/utils/resolvePositionAtIndex'

export function runSelectionStartIntent(payload: {
  /** 宿主容器节点，用于承载编辑器或渲染表面。 */
  host: CanvasEvent
  /** 原始 DOM 事件对象，用于读取指针、键盘或剪贴板信息。 */
  evt: MouseEvent
  /** 旧命中单元格标识，用于判断表格选区是否跨单元格变化。 */
  oldPositionContextTdId?: string
  /** 是否只读，用于阻止内容修改。 */
  isReadonly: boolean
  /** 位置命中结果，保存指针坐标解析后的索引和上下文。 */
  positionResult: any
}) {
  const { host, evt, oldPositionContextTdId, isReadonly, positionResult } = payload
  const draw = host.getDraw()
  const components = draw.getComponents()
  const coordinate = draw.getCoordinate()
  const rangeManager = components.range
  const { isDirectHit, isCheckbox, isRadio, isImage, isTable } =
    positionResult
  const elementList = draw.getObjectResolver().getElementList()
  const curIndex = resolveTableAwarePointerIndex(positionResult)
  const targetElementIndex = resolveTableAwarePointerTargetIndex(positionResult)
  const targetPosition = resolvePositionAtIndex(draw, targetElementIndex)
  const curElement = elementList[targetElementIndex]
  const isDirectHitImage = !!(isDirectHit && isImage)
  const isDirectHitCheckbox = !!(isDirectHit && isCheckbox)
  const isDirectHitRadio = !!(isDirectHit && isRadio)
  const isDisabledControl = !!curElement?.control?.disabled
  const resolvedCursorIndex = isDisabledControl
    ? resolveDisabledControlCursorIndex(elementList, targetElementIndex)
    : curIndex
  const isFormControlToggleAllowed = canToggleFormControl({
    draw,
    isDirectHitCheckbox,
    isDirectHitRadio
  })

  if (~resolvedCursorIndex) {
    let startIndex = resolvedCursorIndex
    let endIndex = resolvedCursorIndex
    if (evt.shiftKey) {
      const { startIndex: oldStartIndex } = rangeManager.getEditBoundaryRange()
      const shiftBoundary = resolveTableShiftSelectionBoundary({
        positionContext: coordinate.getPositionContext(),
        oldPositionContextTdId,
        curIndex,
        oldStartIndex,
        startIndex,
        endIndex
      })
      startIndex = shiftBoundary.startIndex
      endIndex = shiftBoundary.endIndex
    }

    rangeManager.setRange(startIndex, endIndex)
    // 点击当前视觉行左侧空白时，命中边界可能仍是上一逻辑边界，
    // 但光标必须画在“当前行最前面”的显式位置。
    const nextCursorPosition =
      isDisabledControl
        ? resolvePositionAtIndex(draw, resolvedCursorIndex)
        : positionResult.cursorPosition || resolvePositionAtIndex(draw, curIndex)
    coordinate.setCursorPosition(nextCursorPosition)

    if (isDirectHitCheckbox && (!isReadonly || isFormControlToggleAllowed)) {
      renderBeforeFormControlToggle({ draw, curIndex })
      applyCheckboxToggle({ draw, element: curElement })
    } else if (isDirectHitRadio && (!isReadonly || isFormControlToggleAllowed)) {
      renderBeforeFormControlToggle({ draw, curIndex })
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
          curIndex: resolvedCursorIndex,
          isSetCursor: !isDirectHitImage && !isDirectHitCheckbox && !isDirectHitRadio,
          preserveCurrentCursor:
            !!positionResult.cursorPosition && !isDisabledControl
        })
      }
    }
  }

  handleImageSelectionStart({
    draw,
    evt,
    element: curElement,
    position: targetPosition,
    isReadonly,
    isDirectHitImage,
    captureDragSnapshot: () => captureDragSnapshot(host)
  })

  disposeTableTool(draw)
  renderTableToolIfNeeded({ draw, isTable, isReadonly })

  applyInlinePointerEffects({
    draw,
    evt,
    element: curElement,
    position: targetPosition,
    isReadonly
  })
}
