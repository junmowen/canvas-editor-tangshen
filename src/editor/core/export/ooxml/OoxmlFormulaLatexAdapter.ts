import { IFormulaNode } from '../../../interface/Formula'
import { normalizeOoxmlFormulaSymbolValue } from './OoxmlFormulaSymbolMap'

/** 把公式 AST 重新生成 LaTeX 序列化文本，供导入后布局和备用展示复用。 */
export function createLatexFromImportedFormulaNode(node?: IFormulaNode): string {
  if (!node) return ''
  switch (node.type) {
    case 'root':
      return (node.children || []).map(createLatexFromImportedFormulaNode).join('')
    case 'group':
      if (node.value?.startsWith('\\')) {
        return `${node.value}{${(node.children || [])
          .map(createLatexFromImportedFormulaNode)
          .join('')}}`
      }
      return (node.children || []).map(createLatexFromImportedFormulaNode).join('')
    case 'fraction':
      return `\\frac{${createLatexFromImportedFormulaNode(node.numerator)}}{${createLatexFromImportedFormulaNode(node.denominator)}}`
    case 'sqrt':
      return node.index
        ? `\\sqrt[${createLatexFromImportedFormulaNode(node.index)}]{${createLatexFromImportedFormulaNode(node.radicand)}}`
        : `\\sqrt{${createLatexFromImportedFormulaNode(node.radicand)}}`
    case 'subscript':
      return `${createLatexFromImportedFormulaNode(node.base)}_{${createLatexFromImportedFormulaNode(node.subscript)}}`
    case 'superscript':
      return `${createLatexFromImportedFormulaNode(node.base)}^{${createLatexFromImportedFormulaNode(node.superscript)}}`
    case 'subsup':
      return `${createLatexFromImportedFormulaNode(node.base)}_{${createLatexFromImportedFormulaNode(node.subscript)}}^{${createLatexFromImportedFormulaNode(node.superscript)}}`
    case 'matrix':
      return `\\begin{matrix}${(node.rows || [])
        .map(row => row.map(createLatexFromImportedFormulaNode).join('&'))
        .join('\\\\')}\\end{matrix}`
    case 'operator':
    case 'symbol':
      return normalizeOoxmlFormulaSymbolValue(node.value)
    default:
      return node.value || ''
  }
}
