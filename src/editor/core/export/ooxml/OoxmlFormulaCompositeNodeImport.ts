import { IFormulaNode } from '../../../interface/Formula'
import {
  getOoxmlChildElement as getFirstChildElement,
  getOoxmlChildElements as getChildElements,
  getOoxmlPrefixedAttribute
} from './OoxmlDom'
import { resolveOoxmlFormulaAccentCommand } from './OoxmlFormulaSymbolMap'

type OoxmlFormulaContainerParser = (
  element: Element | undefined
) => IFormulaNode

/** 解析 m:acc/m:bar 装饰结构，使用 group.value 保存一元 LaTeX 装饰命令。 */
export function parseOoxmlAccentFormulaNode(
  element: Element,
  defaultCommand: string,
  parseContainer: OoxmlFormulaContainerParser
): IFormulaNode {
  const accentChar = getOoxmlPrefixedAttribute(
    getFirstChildElement(getFirstChildElement(element, 'accPr'), 'chr'),
    'm',
    'val'
  )
  const command = resolveOoxmlFormulaAccentCommand(accentChar, defaultCommand)
  return {
    type: 'group',
    value: command,
    children: [parseContainer(getFirstChildElement(element, 'e'))]
  }
}

/** 创建一元 LaTeX 命令分组节点，用于 boxed、phantom、overbrace 等装饰结构。 */
export function createOoxmlUnaryCommandFormulaNode(
  command: string,
  contentElement: Element | undefined,
  parseContainer: OoxmlFormulaContainerParser
): IFormulaNode {
  return {
    type: 'group',
    value: command,
    children: [parseContainer(contentElement)]
  }
}

/** 解析 m:d 分隔符结构，保留起止符号和可选分隔符。 */
export function parseOoxmlDelimiterFormulaNode(
  element: Element,
  parseContainer: OoxmlFormulaContainerParser
): IFormulaNode {
  const properties = getFirstChildElement(element, 'dPr')
  const beginChar =
    getOoxmlPrefixedAttribute(
      getFirstChildElement(properties, 'begChr'),
      'm',
      'val'
    ) ||
    '('
  const endChar =
    getOoxmlPrefixedAttribute(
      getFirstChildElement(properties, 'endChr'),
      'm',
      'val'
    ) ||
    ')'
  const separatorChar =
    getOoxmlPrefixedAttribute(
      getFirstChildElement(properties, 'sepChr'),
      'm',
      'val'
    ) ||
    ','
  const expressionList = getChildElements(element, 'e')
  const children: IFormulaNode[] = [{ type: 'operator', value: beginChar }]
  expressionList.forEach((expressionElement, index) => {
    if (index > 0) {
      children.push({ type: 'operator', value: separatorChar })
    }
    children.push(parseContainer(expressionElement))
  })
  children.push({ type: 'operator', value: endChar })
  return {
    type: 'group',
    children
  }
}

/** 解析 m:eqArr 方程组，复用 matrix 节点表达多行公式。 */
export function parseOoxmlEquationArrayFormulaNode(
  element: Element,
  parseContainer: OoxmlFormulaContainerParser
): IFormulaNode {
  return {
    type: 'matrix',
    rows: getChildElements(element, 'e').map(expressionElement => [
      parseContainer(expressionElement)
    ])
  }
}

/** 解析 m:groupChr 上/下花括号，按位置映射为 overbrace 或 underbrace。 */
export function parseOoxmlGroupCharacterFormulaNode(
  element: Element,
  parseContainer: OoxmlFormulaContainerParser
): IFormulaNode {
  const properties = getFirstChildElement(element, 'groupChrPr')
  const charValue = getOoxmlPrefixedAttribute(
    getFirstChildElement(properties, 'chr'),
    'm',
    'val'
  )
  const position = getOoxmlPrefixedAttribute(
    getFirstChildElement(properties, 'pos'),
    'm',
    'val'
  )
  const command =
    position === 'bot' || charValue === '⏟' ? '\\underbrace' : '\\overbrace'
  return createOoxmlUnaryCommandFormulaNode(
    command,
    getFirstChildElement(element, 'e'),
    parseContainer
  )
}

/** 解析 m:m 矩阵结构。 */
export function parseOoxmlMatrixFormulaNode(
  element: Element,
  parseContainer: OoxmlFormulaContainerParser
): IFormulaNode {
  return {
    type: 'matrix',
    rows: getChildElements(element, 'mr').map(rowElement => {
      return getChildElements(rowElement, 'e').map(parseContainer)
    })
  }
}
