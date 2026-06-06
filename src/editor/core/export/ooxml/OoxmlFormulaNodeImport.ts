import { IFormulaNode } from '../../../interface/Formula'
import {
  getOoxmlChildElement as getFirstChildElement,
  getOoxmlChildElements as getChildElements,
  getOoxmlPrefixedAttribute,
  isOoxmlElement as isOoxmlFormulaElement
} from './OoxmlDom'
import { normalizeOoxmlFormulaSymbolValue } from './OoxmlFormulaSymbolMap'
import { parseOoxmlFormulaRunNode } from './OoxmlFormulaRunImport'
import {
  createOoxmlUnaryCommandFormulaNode,
  parseOoxmlAccentFormulaNode,
  parseOoxmlDelimiterFormulaNode,
  parseOoxmlEquationArrayFormulaNode,
  parseOoxmlGroupCharacterFormulaNode,
  parseOoxmlMatrixFormulaNode
} from './OoxmlFormulaCompositeNodeImport'

/** 把公式容器节点解析为单个 AST 节点，多节点时保留 group 分组。 */
function parseOoxmlFormulaContainerNode(element: Element | undefined): IFormulaNode {
  const children = parseOoxmlFormulaChildNodes(element)
  if (children.length === 1) return children[0]
  return {
    type: 'group',
    children
  }
}

/** 给大型运算符附加上下限，复用现有上下标节点避免引入新模型。 */
function attachOoxmlFormulaLimitNodes(payload: {
  /** 运算符或函数基节点。 */
  base: IFormulaNode
  /** 下限节点。 */
  subscript?: IFormulaNode
  /** 上限节点。 */
  superscript?: IFormulaNode
}) {
  if (payload.subscript && payload.superscript) {
    return {
      type: 'subsup',
      base: payload.base,
      subscript: payload.subscript,
      superscript: payload.superscript
    } as IFormulaNode
  }
  if (payload.subscript) {
    return {
      type: 'subscript',
      base: payload.base,
      subscript: payload.subscript
    } as IFormulaNode
  }
  if (payload.superscript) {
    return {
      type: 'superscript',
      base: payload.base,
      superscript: payload.superscript
    } as IFormulaNode
  }
  return payload.base
}

/** 解析 m:nary 大型运算符，覆盖求和、积分、乘积及其上下限。 */
function parseOoxmlNaryFormulaNode(element: Element): IFormulaNode {
  const properties = getFirstChildElement(element, 'naryPr')
  const subscriptElement = getFirstChildElement(element, 'sub')
  const superscriptElement = getFirstChildElement(element, 'sup')
  const operatorChar =
    getOoxmlPrefixedAttribute(
      getFirstChildElement(properties, 'chr'),
      'm',
      'val'
    ) ||
    '∑'
  const operatorNode = attachOoxmlFormulaLimitNodes({
    base: {
      type: 'operator',
      value: normalizeOoxmlFormulaSymbolValue(operatorChar)
    },
    subscript: subscriptElement
      ? parseOoxmlFormulaContainerNode(subscriptElement)
      : undefined,
    superscript: superscriptElement
      ? parseOoxmlFormulaContainerNode(superscriptElement)
      : undefined
  })
  return {
    type: 'group',
    children: [
      operatorNode,
      parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e'))
    ]
  }
}

/** 解析 m:limLow/m:limUpp，把极限下标或上标附着到基节点。 */
function parseOoxmlLimitFormulaNode(
  element: Element,
  limitType: 'subscript' | 'superscript'
): IFormulaNode {
  const base = parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e'))
  const limit = parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'lim'))
  return limitType === 'subscript'
    ? {
        type: 'subscript',
        base,
        subscript: limit
      }
    : {
        type: 'superscript',
        base,
        superscript: limit
      }
}

/** 解析 m:func 函数结构，导入为函数名加括号的可读结构。 */
function parseOoxmlFunctionFormulaNode(element: Element): IFormulaNode {
  return {
    type: 'group',
    children: [
      parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'fName')),
      { type: 'operator', value: '(' },
      parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e')),
      { type: 'operator', value: ')' }
    ]
  }
}

/** 解析 OOXML 公式中的一个结构节点。 */
function parseOoxmlFormulaNode(element: Element): IFormulaNode | undefined {
  if (isOoxmlFormulaElement(element, 'r')) return parseOoxmlFormulaRunNode(element)
  if (isOoxmlFormulaElement(element, 'f')) {
    return {
      type: 'fraction',
      numerator: parseOoxmlFormulaContainerNode(
        getFirstChildElement(element, 'num')
      ),
      denominator: parseOoxmlFormulaContainerNode(
        getFirstChildElement(element, 'den')
      )
    }
  }
  if (isOoxmlFormulaElement(element, 'rad')) {
    const degree = getFirstChildElement(element, 'deg')
    const index = degree ? parseOoxmlFormulaContainerNode(degree) : undefined
    return {
      type: 'sqrt',
      ...(index ? { index } : {}),
      radicand: parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e'))
    }
  }
  if (isOoxmlFormulaElement(element, 'sSub')) {
    return {
      type: 'subscript',
      base: parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e')),
      subscript: parseOoxmlFormulaContainerNode(
        getFirstChildElement(element, 'sub')
      )
    }
  }
  if (isOoxmlFormulaElement(element, 'sSup')) {
    return {
      type: 'superscript',
      base: parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e')),
      superscript: parseOoxmlFormulaContainerNode(
        getFirstChildElement(element, 'sup')
      )
    }
  }
  if (isOoxmlFormulaElement(element, 'sSubSup')) {
    return {
      type: 'subsup',
      base: parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e')),
      subscript: parseOoxmlFormulaContainerNode(
        getFirstChildElement(element, 'sub')
      ),
      superscript: parseOoxmlFormulaContainerNode(
        getFirstChildElement(element, 'sup')
      )
    }
  }
  if (isOoxmlFormulaElement(element, 'nary')) {
    return parseOoxmlNaryFormulaNode(element)
  }
  if (isOoxmlFormulaElement(element, 'limLow')) {
    return parseOoxmlLimitFormulaNode(element, 'subscript')
  }
  if (isOoxmlFormulaElement(element, 'limUpp')) {
    return parseOoxmlLimitFormulaNode(element, 'superscript')
  }
  if (isOoxmlFormulaElement(element, 'func')) {
    return parseOoxmlFunctionFormulaNode(element)
  }
  if (isOoxmlFormulaElement(element, 'acc')) {
    return parseOoxmlAccentFormulaNode(
      element,
      '\\hat',
      parseOoxmlFormulaContainerNode
    )
  }
  if (isOoxmlFormulaElement(element, 'bar')) {
    return parseOoxmlAccentFormulaNode(
      element,
      '\\bar',
      parseOoxmlFormulaContainerNode
    )
  }
  if (isOoxmlFormulaElement(element, 'd')) {
    return parseOoxmlDelimiterFormulaNode(
      element,
      parseOoxmlFormulaContainerNode
    )
  }
  if (isOoxmlFormulaElement(element, 'eqArr')) {
    return parseOoxmlEquationArrayFormulaNode(
      element,
      parseOoxmlFormulaContainerNode
    )
  }
  if (isOoxmlFormulaElement(element, 'groupChr')) {
    return parseOoxmlGroupCharacterFormulaNode(
      element,
      parseOoxmlFormulaContainerNode
    )
  }
  if (isOoxmlFormulaElement(element, 'borderBox')) {
    return createOoxmlUnaryCommandFormulaNode(
      '\\boxed',
      getFirstChildElement(element, 'e'),
      parseOoxmlFormulaContainerNode
    )
  }
  if (isOoxmlFormulaElement(element, 'phant')) {
    return createOoxmlUnaryCommandFormulaNode(
      '\\phantom',
      getFirstChildElement(element, 'e'),
      parseOoxmlFormulaContainerNode
    )
  }
  if (isOoxmlFormulaElement(element, 'box')) {
    return parseOoxmlFormulaContainerNode(getFirstChildElement(element, 'e'))
  }
  if (isOoxmlFormulaElement(element, 'm')) {
    return parseOoxmlMatrixFormulaNode(element, parseOoxmlFormulaContainerNode)
  }
  if (
    isOoxmlFormulaElement(element, 'e') ||
    isOoxmlFormulaElement(element, 'num') ||
    isOoxmlFormulaElement(element, 'den') ||
    isOoxmlFormulaElement(element, 'sub') ||
    isOoxmlFormulaElement(element, 'sup') ||
    isOoxmlFormulaElement(element, 'deg') ||
    isOoxmlFormulaElement(element, 'fName') ||
    isOoxmlFormulaElement(element, 'lim')
  ) {
    return parseOoxmlFormulaContainerNode(element)
  }
  return undefined
}

/** 解析 OOXML 公式容器的直接子节点，跳过属性类节点。 */
export function parseOoxmlFormulaChildNodes(element: Element | undefined) {
  if (!element) return []
  return getChildElements(element).reduce<IFormulaNode[]>((children, childElement) => {
    const node = parseOoxmlFormulaNode(childElement)
    if (node) children.push(node)
    return children
  }, [])
}
