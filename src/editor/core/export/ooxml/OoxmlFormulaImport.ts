import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { IFormulaNode } from '../../../interface/Formula'
import { completeFormulaDerivedFormats } from '../../modules/formula/model/FormulaSerializer'
import { getOoxmlChildElements as getChildElements } from './OoxmlDom'
import { createLatexFromImportedFormulaNode } from './OoxmlFormulaLatexAdapter'
import { parseOoxmlFormulaChildNodes } from './OoxmlFormulaNodeImport'

/** 解析 m:oMath 为内部公式元素，保留结构化 AST 与原始 OOXML 片段。 */
export function parseOoxmlMathElement(mathElement: Element): IElement {
  const ast: IFormulaNode = {
    type: 'root',
    children: parseOoxmlFormulaChildNodes(mathElement)
  }
  const latex = createLatexFromImportedFormulaNode(ast)
  const ooxml = new XMLSerializer().serializeToString(mathElement)
  const formula = completeFormulaDerivedFormats({
    sourceFormat: 'ooxml',
    latex,
    ooxml,
    ast
  })
  return {
    type: ElementType.LATEX,
    value: latex,
    formula
  }
}

/** 解析 m:oMathPara 块级公式，内部每个 m:oMath 仍恢复为独立公式元素。 */
export function parseOoxmlMathParagraphElement(mathParagraphElement: Element) {
  const mathElementList = getChildElements(mathParagraphElement, 'oMath')
  if (!mathElementList.length) {
    return [parseOoxmlMathElement(mathParagraphElement)]
  }
  return mathElementList.map(parseOoxmlMathElement)
}
