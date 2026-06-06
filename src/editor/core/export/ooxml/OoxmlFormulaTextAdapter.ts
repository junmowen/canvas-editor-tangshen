import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { resolveFormulaDisplayText } from '../../modules/formula/model/FormulaTextModel'

/** 把缺少结构化模型的公式适配成普通文本 run 元素。 */
export function createOoxmlFormulaTextRunElement(element: IElement): IElement {
  return {
    ...element,
    type: ElementType.TEXT,
    value:
      element.formula?.displayText ||
      resolveFormulaDisplayText(element.value || '') ||
      ''
  }
}
