import { IFormulaNode } from '../../../interface/Formula'

/** 获取指定元素下所有匹配 localName 的后代元素，用于读取 m:r/m:t 文本。 */
function getDescendantElements(element: Element | undefined, localName: string) {
  if (!element) return []
  return Array.from(element.getElementsByTagName('*')).filter(
    child => child.localName === localName
  )
}

/** 解析 OOXML 公式文本 run。 */
export function parseOoxmlFormulaRunNode(element: Element): IFormulaNode {
  return {
    type: 'text',
    value: getDescendantElements(element, 't')
      .map(textElement => textElement.textContent || '')
      .join('')
  }
}
