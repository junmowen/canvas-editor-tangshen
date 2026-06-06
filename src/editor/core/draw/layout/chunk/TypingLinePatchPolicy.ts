import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import {
  hasControlPatchContext,
  isPatchableTextElement
} from '../../../modules/paragraph/layout/ParagraphPatchLayoutPolicy'

/** 判断当前行元素是否适合单行正式 patch。 */
export function canPatchTypingLineElementList(
  elementList: Array<{ type?: unknown }>
) {
  return elementList.every(element => isPatchableTextElement(element as any))
}

/** 解析单行 patch 的下一行元素范围。 */
export function resolveTypingLinePatchElementRange(payload: {
  elementCount: number
  startIndex: number
  oldElementCount: number
  insertedCount: number
}) {
  const endIndex = Math.min(
    payload.elementCount - 1,
    payload.startIndex + payload.oldElementCount - 1 + payload.insertedCount
  )
  if (payload.startIndex < 0 || endIndex < payload.startIndex) {
    return null
  }
  return {
    startIndex: payload.startIndex,
    endIndex
  }
}

/** 判断单行测量结果是否仍可写回当前旧行。 */
export function getTypingLinePatchRowShapeRiskReason(rowList: IRow[]) {
  if (rowList.length !== 1) {
    return 'line-expanded'
  }
  return null
}

/** 判断单行 position 结果是否仍和行元素一一对应。 */
export function getTypingLinePatchPositionRiskReason(payload: {
  lineElementList: IElement[]
  positionList: IElementPosition[]
}) {
  if (payload.positionList.length !== payload.lineElementList.length) {
    return 'line-position-count-mismatch'
  }
  return null
}

/** 单行局部测量必须沿用旧行所在栏，否则 position 会按默认第一栏落位。 */
export function applyTypingLinePatchRowContext(payload: {
  nextRow: IRow
  sourceRow: IRow
  startY: number
}) {
  payload.nextRow.columnIndex = payload.sourceRow.columnIndex
  payload.nextRow.columns = payload.sourceRow.columns
  payload.nextRow.columnStartY = payload.startY
}

/** 复杂控件片段必须走完整 layout，避免单行 patch 丢失栏上下文或控件边界。 */
export function getTypingLineControlPatchRiskReason(elementList: IElement[]) {
  const controlElementList = elementList.filter(element =>
    hasControlPatchContext(element)
  )
  if (!controlElementList.length) {
    return null
  }
  if (
    controlElementList.some(element =>
      isTypingLineControlAffixComponent(element.controlComponent)
    )
  ) {
    return 'line-control-affix'
  }
  const controlIdSet = new Set(
    controlElementList
      .map(element => element.controlId || element.parentControlId)
      .filter(Boolean)
  )
  if (controlElementList.length > 1 || controlIdSet.size > 1) {
    return 'line-control-multi-fragment'
  }
  if (
    controlElementList.some(
      element =>
        element.controlComponent === ControlComponent.VALUE ||
        element.controlComponent === ControlComponent.PLACEHOLDER
    )
  ) {
    return 'line-control-value-fragment'
  }
  return 'line-control-fragment'
}

/** 控件前后缀/前后文本参与边界绘制，不能被当作普通文本片段替换。 */
function isTypingLineControlAffixComponent(
  component: IElement['controlComponent']
) {
  return (
    component === ControlComponent.PREFIX ||
    component === ControlComponent.POSTFIX ||
    component === ControlComponent.PRE_TEXT ||
    component === ControlComponent.POST_TEXT
  )
}
