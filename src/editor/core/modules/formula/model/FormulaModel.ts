import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { IFormula, IFormulaNode } from '../../../../interface/Formula'
import {
  completeFormulaDerivedFormats,
  parseFormulaMathMLToAst
} from './FormulaSerializer'

/** LaTeX命令到公式符号的映射，用于导出 OOXML 时保留可读公式结构。 */
const FORMULA_AST_SYMBOL_MAP: Record<string, string> = {
  '\\times': '×',
  '\\cdot': '·',
  '\\pm': '±',
  '\\pi': 'π',
  '\\mu': 'μ',
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\theta': 'θ',
  '\\lambda': 'λ',
  '\\eta': 'η',
  '\\sigma': 'σ',
  '\\rho': 'ρ',
  '\\Delta': 'Δ',
  '\\sum': '∑',
  '\\int': '∫',
  '\\infty': '∞',
  '\\le': '≤',
  '\\ge': '≥',
  '\\approx': '≈',
  '\\rightarrow': '→',
  '\\to': '→',
  '\\%': '%',
  '\\circ': '°'
}

/** LaTeX解析结果，携带节点列表和下一段读取位置。 */
interface IFormulaAstParseResult {
  /** 解析出来的公式节点。 */
  children: IFormulaNode[]
  /** 下一次读取的源码下标。 */
  index: number
}

/** 读取 LaTeX 命令名，支持 \frac、\sqrt 以及希腊字母等命令。 */
function readFormulaLatexCommand(latex: string, start: number) {
  let index = start + 1
  while (index < latex.length && /[A-Za-z]/.test(latex[index])) {
    index++
  }
  if (index === start + 1) {
    index++
  }
  return {
    command: latex.slice(start, index),
    index
  }
}

/** 读取一个花括号分组，分组不存在时退回读取单个节点。 */
function readFormulaLatexArgument(latex: string, start: number) {
  if (latex[start] === '{') {
    const result = parseFormulaLatexSequence(latex, start + 1, '}')
    return {
      node: {
        type: 'group',
        children: result.children
      } as IFormulaNode,
      index: result.index + 1
    }
  }
  const result = parseFormulaLatexSequence(latex, start, undefined, 1)
  return {
    node: result.children[0] || ({ type: 'text', value: '' } as IFormulaNode),
    index: result.index
  }
}

/** 判断节点是否是空白文本，避免序列化出多余的空公式节点。 */
function isFormulaEmptyTextNode(node: IFormulaNode | undefined) {
  return node?.type === 'text' && !node.value
}

/** 将上下标附着到前一个公式节点，支持先下标后上标或先上标后下标。 */
function attachFormulaScriptNode(
  children: IFormulaNode[],
  scriptType: 'subscript' | 'superscript',
  scriptNode: IFormulaNode
) {
  const base = children.pop() || ({ type: 'text', value: '' } as IFormulaNode)
  if (isFormulaEmptyTextNode(base)) {
    children.push({
      type: scriptType,
      base,
      [scriptType]: scriptNode
    } as IFormulaNode)
    return
  }
  if (scriptType === 'superscript' && base.type === 'subscript') {
    children.push({
      type: 'subsup',
      base: base.base,
      subscript: base.subscript,
      superscript: scriptNode
    })
    return
  }
  if (scriptType === 'subscript' && base.type === 'superscript') {
    children.push({
      type: 'subsup',
      base: base.base,
      superscript: base.superscript,
      subscript: scriptNode
    })
    return
  }
  children.push({
    type: scriptType,
    base,
    [scriptType]: scriptNode
  } as IFormulaNode)
}

/** 解析 LaTeX 序列，覆盖常用上下标、分式、根式和符号。 */
function parseFormulaLatexSequence(
  latex: string,
  start = 0,
  endChar?: string,
  maxNodeCount = Infinity
): IFormulaAstParseResult {
  const children: IFormulaNode[] = []
  let index = start
  while (index < latex.length && children.length < maxNodeCount) {
    const char = latex[index]
    if (endChar && char === endChar) break
    if (char === '{') {
      const result = parseFormulaLatexSequence(latex, index + 1, '}')
      children.push(...result.children)
      index = result.index + 1
      continue
    }
    if (char === '}') break
    if (char === '_' || char === '^') {
      const argument = readFormulaLatexArgument(latex, index + 1)
      attachFormulaScriptNode(
        children,
        char === '_' ? 'subscript' : 'superscript',
        argument.node
      )
      index = argument.index
      continue
    }
    if (char === '\\') {
      const { command, index: commandEndIndex } = readFormulaLatexCommand(
        latex,
        index
      )
      if (command === '\\frac') {
        const numerator = readFormulaLatexArgument(latex, commandEndIndex)
        const denominator = readFormulaLatexArgument(latex, numerator.index)
        children.push({
          type: 'fraction',
          numerator: numerator.node,
          denominator: denominator.node
        })
        index = denominator.index
        continue
      }
      if (command === '\\sqrt') {
        const radicand = readFormulaLatexArgument(latex, commandEndIndex)
        children.push({
          type: 'sqrt',
          radicand: radicand.node
        })
        index = radicand.index
        continue
      }
      if (command === '\\left' || command === '\\right') {
        index = commandEndIndex
        continue
      }
      children.push({
        type: FORMULA_AST_SYMBOL_MAP[command] ? 'symbol' : 'text',
        value: FORMULA_AST_SYMBOL_MAP[command] || command.replace(/^\\/, '')
      })
      index = commandEndIndex
      continue
    }
    children.push({
      type: /[=+\-*/(),]/.test(char) ? 'operator' : 'text',
      value: char
    })
    index++
  }
  return {
    children,
    index
  }
}

/** 创建 LaTeX 公式 AST，用于结构化公式派生和 OOXML 公式导出。 */
export function createFormulaAstFromLatex(latex: string): IFormulaNode {
  const children = parseFormulaLatexSequence(latex).children
  return {
    type: 'root',
    children
  }
}

/** 根据 MathML 文本生成结构化公式模型，用于专业系统交换和导入回显。 */
export function createFormulaFromMathML(mathML: string, id?: string): IFormula {
  return completeFormulaDerivedFormats({
    id,
    displayMode: 'inline',
    sourceFormat: 'mathml',
    mathML,
    ast: parseFormulaMathMLToAst(mathML)
  })
}

/** 读取 LATEX 元素已经携带的结构化公式模型。 */
export function normalizeFormulaFromElement(
  element: IElement
): IFormula | null {
  if (element.type !== ElementType.LATEX) {
    return null
  }
  if (element.formula) {
    return completeFormulaDerivedFormats(element.formula)
  }
  return null
}
