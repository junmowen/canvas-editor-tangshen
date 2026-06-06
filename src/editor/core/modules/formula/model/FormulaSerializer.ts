import { IFormula, IFormulaNode } from '../../../../interface/Formula'
import { resolveFormulaDisplayText } from './FormulaTextModel'

/** 转义 XML 文本内容，避免公式符号破坏 MathML/OOXML 结构。 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 获取节点列表的 MathML 串。 */
function serializeMathMLChildren(children: IFormulaNode[] = []): string {
  return children.map(serializeFormulaNodeToMathML).join('')
}

/** 获取节点列表的 OOXML 串。 */
function serializeOOXMLChildren(children: IFormulaNode[] = []): string {
  return children.map(serializeFormulaNodeToOOXML).join('')
}

/** 获取元素子节点，忽略空白文本和命名空间前缀差异。 */
function getMathMLElementChildren(element: Element): Element[] {
  return Array.from(element.childNodes).filter(
    (node): node is Element => node.nodeType === Node.ELEMENT_NODE
  )
}

/** 获取 XML 元素本地名，支持 MathML 默认命名空间和无命名空间片段。 */
function getMathMLElementName(element: Element | undefined) {
  return element?.localName || element?.nodeName.replace(/^.*:/, '') || ''
}

/** 获取 MathML 文本节点内容。 */
function getMathMLElementText(element: Element | undefined) {
  return element?.textContent || ''
}

/** 把一组 AST 节点压成单个节点，避免外层产生不必要的 group。 */
function compactFormulaChildren(children: IFormulaNode[]): IFormulaNode {
  return children.length === 1
    ? children[0]
    : {
        type: 'group',
        children
      }
}

/** 将公式 AST 转回 LaTeX 序列化文本，用于 MathML/OOXML 回导后的复制、搜索和备用显示。 */
export function createFormulaLatexFromAst(node?: IFormulaNode): string {
  if (!node) return ''
  switch (node.type) {
    case 'root':
    case 'group':
      return (node.children || []).map(createFormulaLatexFromAst).join('')
    case 'fraction':
      return `\\frac{${createFormulaLatexFromAst(node.numerator)}}{${createFormulaLatexFromAst(node.denominator)}}`
    case 'sqrt':
      return node.index
        ? `\\sqrt[${createFormulaLatexFromAst(node.index)}]{${createFormulaLatexFromAst(node.radicand)}}`
        : `\\sqrt{${createFormulaLatexFromAst(node.radicand)}}`
    case 'subscript':
      return `${createFormulaLatexFromAst(node.base)}_{${createFormulaLatexFromAst(node.subscript)}}`
    case 'superscript':
      return `${createFormulaLatexFromAst(node.base)}^{${createFormulaLatexFromAst(node.superscript)}}`
    case 'subsup':
      return `${createFormulaLatexFromAst(node.base)}_{${createFormulaLatexFromAst(node.subscript)}}^{${createFormulaLatexFromAst(node.superscript)}}`
    case 'matrix':
      return `\\begin{matrix}${(node.rows || [])
        .map(row => row.map(createFormulaLatexFromAst).join('&'))
        .join('\\\\')}\\end{matrix}`
    default:
      return node.value || ''
  }
}

/** 把 MathML 元素解析为内部公式 AST 节点。 */
function parseFormulaMathMLElement(element: Element | undefined): IFormulaNode {
  if (!element) {
    return { type: 'text', value: '' }
  }
  const children = getMathMLElementChildren(element)
  switch (getMathMLElementName(element)) {
    case 'math':
      return {
        type: 'root',
        children: children.map(parseFormulaMathMLElement)
      }
    case 'mrow':
      return {
        type: 'group',
        children: children.map(parseFormulaMathMLElement)
      }
    case 'mo':
      return { type: 'operator', value: getMathMLElementText(element) }
    case 'mi':
    case 'mn':
    case 'mtext':
      return { type: 'text', value: getMathMLElementText(element) }
    case 'mfrac':
      return {
        type: 'fraction',
        numerator: parseFormulaMathMLElement(children[0]),
        denominator: parseFormulaMathMLElement(children[1])
      }
    case 'msqrt':
      return {
        type: 'sqrt',
        radicand: compactFormulaChildren(children.map(parseFormulaMathMLElement))
      }
    case 'mroot':
      return {
        type: 'sqrt',
        radicand: parseFormulaMathMLElement(children[0]),
        index: parseFormulaMathMLElement(children[1])
      }
    case 'msub':
      return {
        type: 'subscript',
        base: parseFormulaMathMLElement(children[0]),
        subscript: parseFormulaMathMLElement(children[1])
      }
    case 'msup':
      return {
        type: 'superscript',
        base: parseFormulaMathMLElement(children[0]),
        superscript: parseFormulaMathMLElement(children[1])
      }
    case 'msubsup':
      return {
        type: 'subsup',
        base: parseFormulaMathMLElement(children[0]),
        subscript: parseFormulaMathMLElement(children[1]),
        superscript: parseFormulaMathMLElement(children[2])
      }
    case 'mtable':
      return {
        type: 'matrix',
        rows: children
          .filter(child => getMathMLElementName(child) === 'mtr')
          .map(row =>
            getMathMLElementChildren(row)
              .filter(cell => getMathMLElementName(cell) === 'mtd')
              .map(cell =>
                compactFormulaChildren(
                  getMathMLElementChildren(cell).map(parseFormulaMathMLElement)
                )
              )
          )
      }
    default:
      if (children.length) {
        return compactFormulaChildren(children.map(parseFormulaMathMLElement))
      }
      return { type: 'text', value: getMathMLElementText(element) }
  }
}

/** 将 MathML 文本解析为内部公式 AST。 */
export function parseFormulaMathMLToAst(mathML: string): IFormulaNode {
  const document = new DOMParser().parseFromString(mathML, 'application/xml')
  if (document.getElementsByTagName('parsererror').length) {
    return {
      type: 'root',
      children: [{ type: 'text', value: mathML }]
    }
  }
  const rootElement =
    getMathMLElementName(document.documentElement) === 'math'
      ? document.documentElement
      : Array.from(document.getElementsByTagName('*')).find(
          element => getMathMLElementName(element) === 'math'
        ) || document.documentElement
  const ast = parseFormulaMathMLElement(rootElement)
  return ast.type === 'root'
    ? ast
    : {
        type: 'root',
        children: [ast]
      }
}

/** 把公式 AST 节点序列化为 MathML 片段。 */
export function serializeFormulaNodeToMathML(node?: IFormulaNode): string {
  if (!node) return '<mrow/>'
  const value = escapeXml(node.value || '')
  switch (node.type) {
    case 'root':
    case 'group':
      return `<mrow>${serializeMathMLChildren(node.children)}</mrow>`
    case 'operator':
      return `<mo>${value}</mo>`
    case 'unit':
    case 'symbol':
    case 'text':
      return `<mi>${value}</mi>`
    case 'fraction':
      return `<mfrac>${serializeFormulaNodeToMathML(node.numerator)}${serializeFormulaNodeToMathML(node.denominator)}</mfrac>`
    case 'sqrt':
      if (node.index) {
        return `<mroot>${serializeFormulaNodeToMathML(node.radicand)}${serializeFormulaNodeToMathML(node.index)}</mroot>`
      }
      return `<msqrt>${serializeFormulaNodeToMathML(node.radicand)}</msqrt>`
    case 'subscript':
      return `<msub>${serializeFormulaNodeToMathML(node.base)}${serializeFormulaNodeToMathML(node.subscript)}</msub>`
    case 'superscript':
      return `<msup>${serializeFormulaNodeToMathML(node.base)}${serializeFormulaNodeToMathML(node.superscript)}</msup>`
    case 'subsup':
      return `<msubsup>${serializeFormulaNodeToMathML(node.base)}${serializeFormulaNodeToMathML(node.subscript)}${serializeFormulaNodeToMathML(node.superscript)}</msubsup>`
    case 'matrix':
      return `<mtable>${(node.rows || [])
        .map(row => {
          return `<mtr>${row
            .map(cell => `<mtd>${serializeFormulaNodeToMathML(cell)}</mtd>`)
            .join('')}</mtr>`
        })
        .join('')}</mtable>`
    default:
      return `<mi>${value}</mi>`
  }
}

/** 把公式 AST 节点序列化为 OOXML 公式片段。 */
export function serializeFormulaNodeToOOXML(node?: IFormulaNode): string {
  if (!node) return '<m:r><m:t></m:t></m:r>'
  const value = escapeXml(node.value || '')
  switch (node.type) {
    case 'root':
    case 'group':
      return serializeOOXMLChildren(node.children)
    case 'text':
    case 'symbol':
    case 'operator':
    case 'unit':
      return `<m:r><m:t>${value}</m:t></m:r>`
    case 'fraction':
      return `<m:f><m:num>${serializeFormulaNodeToOOXML(node.numerator)}</m:num><m:den>${serializeFormulaNodeToOOXML(node.denominator)}</m:den></m:f>`
    case 'sqrt':
      return `<m:rad>${node.index ? `<m:deg>${serializeFormulaNodeToOOXML(node.index)}</m:deg>` : '<m:degHide m:val="1"/>'}<m:e>${serializeFormulaNodeToOOXML(node.radicand)}</m:e></m:rad>`
    case 'subscript':
      return `<m:sSub><m:e>${serializeFormulaNodeToOOXML(node.base)}</m:e><m:sub>${serializeFormulaNodeToOOXML(node.subscript)}</m:sub></m:sSub>`
    case 'superscript':
      return `<m:sSup><m:e>${serializeFormulaNodeToOOXML(node.base)}</m:e><m:sup>${serializeFormulaNodeToOOXML(node.superscript)}</m:sup></m:sSup>`
    case 'subsup':
      return `<m:sSubSup><m:e>${serializeFormulaNodeToOOXML(node.base)}</m:e><m:sub>${serializeFormulaNodeToOOXML(node.subscript)}</m:sub><m:sup>${serializeFormulaNodeToOOXML(node.superscript)}</m:sup></m:sSubSup>`
    case 'matrix':
      return `<m:m>${(node.rows || [])
        .map(row => {
          return `<m:mr>${row
            .map(cell => `<m:e>${serializeFormulaNodeToOOXML(cell)}</m:e>`)
            .join('')}</m:mr>`
        })
        .join('')}</m:m>`
    default:
      return `<m:r><m:t>${value}</m:t></m:r>`
  }
}

/** 补齐公式模型可导出的 MathML 与 OOXML 派生字段。 */
export function completeFormulaDerivedFormats(formula: IFormula): IFormula {
  const latex = formula.latex || createFormulaLatexFromAst(formula.ast)
  // 文本型公式控件依赖 displayText 参与复制、搜索和正文备用渲染。
  const displayText =
    formula.displayText || resolveFormulaDisplayText(latex)
  return {
    ...formula,
    latex,
    displayText,
    mathML:
      formula.mathML ||
      `<math xmlns="http://www.w3.org/1998/Math/MathML">${serializeFormulaNodeToMathML(formula.ast)}</math>`,
    ooxml:
      formula.ooxml ||
      `<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">${serializeFormulaNodeToOOXML(formula.ast)}</m:oMath>`
  }
}
