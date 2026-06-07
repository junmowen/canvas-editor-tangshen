import { IElementPosition } from '../../../interface/Element'
import { escapePrintSvgAttr, escapePrintSvgText, measurePrintSvgTextWidth } from './core'

interface IPrintSvgFormulaContext {
  font: string
  size: number
  color: string
  weight: number
}

interface IPrintSvgFormulaBox {
  width: number
  ascent: number
  descent: number
  render: (x: number, baseline: number) => string
}

const FORMULA_SYMBOL_MAP: Record<string, string> = {
  times: '×',
  cdot: '·',
  pm: '±',
  pi: 'π',
  mu: 'μ',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  theta: 'θ',
  lambda: 'λ',
  eta: 'η',
  sigma: 'σ',
  rho: 'ρ',
  Delta: 'Δ',
  le: '≤',
  ge: '≥',
  approx: '≈',
  rightarrow: '→',
  to: '→',
  sum: '∑',
  int: '∫',
  infty: '∞',
  circ: '°',
  '%': '%'
}

function resizeFormulaSvgContext(
  context: IPrintSvgFormulaContext,
  size: number
): IPrintSvgFormulaContext {
  return {
    ...context,
    size
  }
}

function measureFormulaSvgText(text: string, context: IPrintSvgFormulaContext) {
  return measurePrintSvgTextWidth(
    text,
    `${context.weight} ${context.size}px ${context.font}`
  )
}

function createFormulaSvgTextBox(
  text: string,
  context: IPrintSvgFormulaContext
): IPrintSvgFormulaBox {
  const width = measureFormulaSvgText(text, context)
  const ascent = context.size * 0.82
  const descent = context.size * 0.22
  return {
    width,
    ascent,
    descent,
    render(x, baseline) {
      return `<text x="${x}" y="${baseline}" font-family="${escapePrintSvgAttr(context.font)}" font-size="${context.size}" font-weight="${context.weight}" fill="${escapePrintSvgAttr(context.color)}">${escapePrintSvgText(text)}</text>`
    }
  }
}

function createFormulaSvgRowBox(boxList: IPrintSvgFormulaBox[]) {
  const width = boxList.reduce((sum, box) => sum + box.width, 0)
  const ascent = Math.max(0, ...boxList.map(box => box.ascent))
  const descent = Math.max(0, ...boxList.map(box => box.descent))
  return {
    width,
    ascent,
    descent,
    render(x: number, baseline: number) {
      let cursorX = x
      return boxList
        .map(box => {
          const content = box.render(cursorX, baseline)
          cursorX += box.width
          return content
        })
        .join('')
    }
  }
}

function createFormulaSvgScriptBox(
  base: IPrintSvgFormulaBox,
  script: IPrintSvgFormulaBox,
  type: 'subscript' | 'superscript',
  context: IPrintSvgFormulaContext
) {
  const shift = context.size * 0.52
  const gap = context.size * 0.05
  const width = base.width + gap + script.width
  const ascent =
    type === 'superscript'
      ? Math.max(base.ascent, shift + script.ascent + gap)
      : base.ascent
  const descent =
    type === 'subscript'
      ? Math.max(base.descent, shift + script.descent + gap)
      : base.descent
  return {
    width,
    ascent,
    descent,
    render(x: number, baseline: number) {
      const scriptBaseline =
        type === 'superscript' ? baseline - shift : baseline + shift
      return (
        base.render(x, baseline) +
        script.render(x + base.width + gap, scriptBaseline)
      )
    }
  }
}

function createFormulaSvgSubSupBox(
  base: IPrintSvgFormulaBox,
  subscript: IPrintSvgFormulaBox,
  superscript: IPrintSvgFormulaBox,
  context: IPrintSvgFormulaContext
) {
  const gap = context.size * 0.08
  const stackWidth = Math.max(subscript.width, superscript.width)
  const width = base.width + gap + stackWidth
  const supShift = context.size * 0.5
  const subShift = context.size * 0.38
  const ascent = Math.max(base.ascent, supShift + superscript.ascent)
  const descent = Math.max(base.descent, subShift + subscript.descent)
  return {
    width,
    ascent,
    descent,
    render(x: number, baseline: number) {
      const stackX = x + base.width + gap
      return (
        base.render(x, baseline) +
        superscript.render(
          stackX + (stackWidth - superscript.width) / 2,
          baseline - supShift
        ) +
        subscript.render(
          stackX + (stackWidth - subscript.width) / 2,
          baseline + subShift
        )
      )
    }
  }
}

function createFormulaSvgFractionBox(
  numerator: IPrintSvgFormulaBox,
  denominator: IPrintSvgFormulaBox,
  context: IPrintSvgFormulaContext
) {
  const gap = context.size * 0.22
  const padding = context.size * 0.18
  const strokeWidth = Math.max(1.2, context.size / 14)
  const width = Math.max(numerator.width, denominator.width) + padding * 2
  const ascent = numerator.ascent + numerator.descent + gap * 2 + strokeWidth
  const descent =
    denominator.ascent + denominator.descent + gap * 2 + strokeWidth
  return {
    width,
    ascent,
    descent,
    render(x: number, baseline: number) {
      const lineY = baseline - gap
      return [
        `<path d="${escapePrintSvgAttr(`M ${x} ${lineY} L ${x + width} ${lineY}`)}" fill="none" stroke="${escapePrintSvgAttr(context.color)}" stroke-width="${strokeWidth}"/>`,
        numerator.render(
          x + (width - numerator.width) / 2,
          lineY - gap - numerator.descent
        ),
        denominator.render(
          x + (width - denominator.width) / 2,
          lineY + gap + denominator.ascent
        )
      ].join('')
    }
  }
}

function createFormulaSvgSqrtBox(
  radicand: IPrintSvgFormulaBox,
  context: IPrintSvgFormulaContext
) {
  const padding = context.size * 0.22
  const signWidth = context.size * 0.7
  const width = signWidth + radicand.width + padding
  const topPadding = context.size * 0.42
  const strokeWidth = Math.max(1.2, context.size / 14)
  const ascent = radicand.ascent + topPadding + strokeWidth
  const descent = radicand.descent + strokeWidth
  return {
    width,
    ascent,
    descent,
    render(x: number, baseline: number) {
      const topY = baseline - radicand.ascent - topPadding * 0.72
      const bottomY = baseline + Math.max(1, descent * 0.25)
      const midY = baseline - context.size * 0.35
      const d = [
        `M ${x + signWidth * 0.08} ${midY}`,
        `L ${x + signWidth * 0.28} ${midY}`,
        `L ${x + signWidth * 0.42} ${bottomY}`,
        `L ${x + signWidth * 0.68} ${topY}`,
        `L ${x + width} ${topY}`
      ].join(' ')
      return (
        `<path d="${escapePrintSvgAttr(d)}" fill="none" stroke="${escapePrintSvgAttr(context.color)}" stroke-width="${strokeWidth}"/>` +
        radicand.render(x + signWidth + padding * 0.4, baseline)
      )
    }
  }
}

class PrintSvgFormulaParser {
  private index = 0

  public constructor(
    private readonly latex: string,
    private readonly context: IPrintSvgFormulaContext
  ) {}

  public parse() {
    return this.parseExpression()
  }

  private parseExpression(stopChar = ''): IPrintSvgFormulaBox {
    const boxList: IPrintSvgFormulaBox[] = []
    while (this.index < this.latex.length) {
      if (stopChar && this.latex[this.index] === stopChar) {
        this.index++
        break
      }
      boxList.push(this.parseScriptableAtom())
    }
    return createFormulaSvgRowBox(boxList)
  }

  private parseScriptableAtom() {
    const baseBox = this.parseAtom()
    let subscriptBox: IPrintSvgFormulaBox | null = null
    let superscriptBox: IPrintSvgFormulaBox | null = null
    while (this.latex[this.index] === '^' || this.latex[this.index] === '_') {
      const mark = this.latex[this.index]
      this.index++
      const scriptBox = this.parseScriptBox()
      if (mark === '^') {
        superscriptBox = scriptBox
      } else {
        subscriptBox = scriptBox
      }
    }
    if (subscriptBox && superscriptBox) {
      return createFormulaSvgSubSupBox(
        baseBox,
        subscriptBox,
        superscriptBox,
        this.context
      )
    }
    if (subscriptBox) {
      return createFormulaSvgScriptBox(
        baseBox,
        subscriptBox,
        'subscript',
        this.context
      )
    }
    if (superscriptBox) {
      return createFormulaSvgScriptBox(
        baseBox,
        superscriptBox,
        'superscript',
        this.context
      )
    }
    return baseBox
  }

  private parseAtom(): IPrintSvgFormulaBox {
    const char = this.latex[this.index]
    if (char === '{') {
      this.index++
      return this.parseExpression('}')
    }
    if (char === '\\') {
      return this.parseCommand()
    }
    return this.parsePlainText()
  }

  private parseScriptBox() {
    const scriptContext = resizeFormulaSvgContext(
      this.context,
      Math.max(8, this.context.size * 0.65)
    )
    if (this.latex[this.index] === '{') {
      this.index++
      return new PrintSvgFormulaParser(
        this.readGroupContent(),
        scriptContext
      ).parse()
    }
    const value = this.latex[this.index] || ''
    this.index++
    return createFormulaSvgTextBox(value, scriptContext)
  }

  private readGroupContent() {
    let depth = 1
    let content = ''
    while (this.index < this.latex.length && depth > 0) {
      const char = this.latex[this.index]
      this.index++
      if (char === '{') {
        depth++
        content += char
      } else if (char === '}') {
        depth--
        if (depth > 0) {
          content += char
        }
      } else {
        content += char
      }
    }
    return content
  }

  private parseCommand() {
    this.index++
    const command = this.readCommandName()
    if (command === 'frac') {
      const numerator = this.parseRequiredGroup()
      const denominator = this.parseRequiredGroup()
      return createFormulaSvgFractionBox(numerator, denominator, this.context)
    }
    if (command === 'sqrt') {
      return createFormulaSvgSqrtBox(this.parseRequiredGroup(), this.context)
    }
    return createFormulaSvgTextBox(
      FORMULA_SYMBOL_MAP[command] || command,
      this.context
    )
  }

  private readCommandName() {
    let command = ''
    while (/[A-Za-z%]/.test(this.latex[this.index] || '')) {
      command += this.latex[this.index]
      this.index++
    }
    return command || this.latex[this.index++] || ''
  }

  private parseRequiredGroup() {
    if (this.latex[this.index] !== '{') {
      return createFormulaSvgTextBox('', this.context)
    }
    this.index++
    return new PrintSvgFormulaParser(
      this.readGroupContent(),
      this.context
    ).parse()
  }

  private parsePlainText() {
    let text = ''
    while (this.index < this.latex.length) {
      const char = this.latex[this.index]
      if (char === '\\' || char === '{' || char === '}' || char === '^' || char === '_') {
        break
      }
      text += char
      this.index++
    }
    return createFormulaSvgTextBox(text || ' ', this.context)
  }
}

/** 创建结构化公式 SVG，避免 PDF 导出依赖 Unicode 上下标字形。 */
export function createPrintSvgFormula(position: IElementPosition) {
  const element = position.element
  if (!element) return ''
  const latex = element.formula?.latex ?? element.value
  if (!latex) return ''
  const size = element.actualSize || element.size || 16
  const context: IPrintSvgFormulaContext = {
    font: element.font || 'Microsoft YaHei',
    size,
    color: element.color || '#000000',
    weight: element.bold ? 700 : 600
  }
  const box = new PrintSvgFormulaParser(latex, context).parse()
  return `<g data-ce-formula="true">${box.render(
    position.coordinate.leftTop[0],
    position.coordinate.leftTop[1] + position.ascent
  )}</g>`
}
