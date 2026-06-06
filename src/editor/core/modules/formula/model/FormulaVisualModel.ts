import { IElement } from '../../../../interface/Element'
import {
  FORMULA_EMPTY_PLACEHOLDER_COLOR,
  FORMULA_EMPTY_PLACEHOLDER_TEXT,
  isFormulaEmptyPlaceholderValue
} from './FormulaTextModel'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../debug/FormulaDebugLogger'

/** 公式视觉盒子，记录测量结果和绘制入口。 */
interface IFormulaVisualBox {
  /** 盒子宽度。 */
  width: number
  /** 基线以上高度。 */
  ascent: number
  /** 基线以下高度。 */
  descent: number
  /** 绘制当前盒子。 */
  render: (
    /** Canvas 上下文。 */
    ctx: CanvasRenderingContext2D,
    /** 左侧坐标。 */
    x: number,
    /** 基线坐标。 */
    baseline: number
  ) => void
}

/** 公式测量和绘制上下文。 */
interface IFormulaVisualContext {
  /** Canvas 上下文。 */
  ctx: CanvasRenderingContext2D
  /** 基础字体。 */
  baseFont: string
  /** 基础字号。 */
  baseSize: number
  /** 文本颜色。 */
  color: string
}

/** LaTeX 命令到正文公式显示符号的映射。 */
const FORMULA_COMMAND_SYMBOL_MAP: Record<string, string> = {
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

/** 归一化可视化解析前的 LaTeX，支持业务公式中常见的括号除法写法。 */
function normalizeFormulaVisualLatex(latex: string) {
  return latex.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, '\\frac{$1}{$2}')
}

/** 根据公式复杂度计算外层安全留白，避免复杂公式压住后续文字或下一行。 */
function resolveFormulaOuterPadding(latex: string, baseSize: number) {
  const structureCount = [
    /\\frac/g,
    /\\sqrt/g,
    /\\sum/g,
    /\\int/g,
    /\^/g,
    /_/g
  ].reduce((count, pattern) => {
    return count + (latex.match(pattern) || []).length
  }, 0)
  const isComplexFormula = structureCount >= 3 || latex.length >= 24
  if (!isComplexFormula) {
    return {
      /** 左侧留白，保留公式对象和前文的分隔。 */
      left: baseSize * 0.08,
      /** 右侧留白只保留抗锯齿安全距离，正文仍应紧跟公式排版。 */
      right: baseSize * 0.12,
      /** 顶部留白，保护上标、根号线等上伸笔画。 */
      top: baseSize * 0.1,
      /** 底部留白，保护下标、分母等下伸结构。 */
      bottom: baseSize * 0.08
    }
  }
  return {
    /** 复杂公式左侧仍保持轻量留白，避免影响行首对齐。 */
    left: baseSize * 0.12,
    /** 复杂公式右侧不能占用大块空白，否则会破坏行内排版。 */
    right: baseSize * 0.16,
    /** 复杂公式顶部补偿根号、求和上限和分式高度。 */
    top: baseSize * 0.34,
    /** 复杂公式底部补偿下限、分母和整体行高。 */
    bottom: baseSize * 0.32
  }
}

/** 从 CSS font 字符串中提取字号，失败时使用默认字号。 */
function resolveFormulaFontSize(font: string, defaultSize: number) {
  const match = font.match(/(\d+(?:\.\d+)?)px/)
  return match ? Number(match[1]) : defaultSize
}

/** 替换 font 字符串中的字号，用于上下标和分式子节点。 */
function resizeFormulaFont(font: string, size: number) {
  return font.replace(/(\d+(?:\.\d+)?)px/, `${size}px`)
}

/** 生成公式专用加粗字体，让公式在正文中比普通文本更清晰。 */
function strengthenFormulaFont(font: string) {
  if (/(^|\s)(bold|[5-9]00)(\s|$)/i.test(font)) {
    return font
  }
  if (/(^|\s)[1-4]00(\s|$)/.test(font)) {
    return font.replace(/(^|\s)[1-4]00(\s|$)/, '$1600$2')
  }
  if (/(\d+(?:\.\d+)?)px/.test(font)) {
    return font.replace(/(\d+(?:\.\d+)?)px/, '600 $1px')
  }
  return `600 ${font}`
}

/** 计算公式结构线宽，分式线、根号线和上横线都使用同一套加粗规则。 */
function resolveFormulaStrokeWidth(formulaCtx: IFormulaVisualContext) {
  return Math.max(1.2, formulaCtx.baseSize / 14)
}

/** 设置公式绘制字体和颜色。 */
function applyFormulaTextStyle(ctx: IFormulaVisualContext, font: string) {
  ctx.ctx.font = font
  ctx.ctx.fillStyle = ctx.color
  ctx.ctx.strokeStyle = ctx.color
}

/** 创建普通文本公式盒子。 */
function createFormulaTextBox(text: string, formulaCtx: IFormulaVisualContext) {
  const font = formulaCtx.baseFont
  applyFormulaTextStyle(formulaCtx, font)
  const metrics = formulaCtx.ctx.measureText(text)
  const ascent =
    metrics.actualBoundingBoxAscent || formulaCtx.baseSize * 0.82
  const descent =
    metrics.actualBoundingBoxDescent || formulaCtx.baseSize * 0.22
  const box: IFormulaVisualBox = {
    width: metrics.width,
    ascent,
    descent,
    render(ctx, x, baseline) {
      applyFormulaTextStyle(formulaCtx, font)
      ctx.fillText(text, x, baseline)
    }
  }
  return box
}

/** 创建行内组合盒子。 */
function createFormulaRowBox(boxList: IFormulaVisualBox[]) {
  const width = boxList.reduce((sum, box) => sum + box.width, 0)
  const ascent = Math.max(0, ...boxList.map(box => box.ascent))
  const descent = Math.max(0, ...boxList.map(box => box.descent))
  const box: IFormulaVisualBox = {
    width,
    ascent,
    descent,
    render(ctx, x, baseline) {
      let cursorX = x
      boxList.forEach(box => {
        box.render(ctx, cursorX, baseline)
        cursorX += box.width
      })
    }
  }
  return box
}

/** 创建带安全留白的公式盒子，避免公式笔画和后续文本发生视觉贴边或堆叠。 */
function createFormulaPaddedBox(
  box: IFormulaVisualBox,
  padding: {
    /** 左侧留白。 */
    left: number
    /** 右侧留白。 */
    right: number
    /** 上方留白。 */
    top: number
    /** 下方留白。 */
    bottom: number
  }
) {
  const paddedBox: IFormulaVisualBox = {
    width: box.width + padding.left + padding.right,
    ascent: box.ascent + padding.top,
    descent: box.descent + padding.bottom,
    render(ctx, x, baseline) {
      box.render(ctx, x + padding.left, baseline)
    }
  }
  return paddedBox
}

/** 创建行内缩放盒，保留公式上下结构，同时避免复杂公式把正文行高撑得过大。 */
function createFormulaInlineScaledBox(
  box: IFormulaVisualBox,
  baseSize: number
) {
  const height = box.ascent + box.descent
  const maxInlineHeight = baseSize * 3.2
  if (height <= maxInlineHeight) {
    return box
  }
  const scale = Math.max(0.72, maxInlineHeight / height)
  const scaledBox: IFormulaVisualBox = {
    width: box.width * scale,
    ascent: box.ascent * scale,
    descent: box.descent * scale,
    render(ctx, x, baseline) {
      ctx.save()
      ctx.translate(x, baseline)
      ctx.scale(scale, scale)
      box.render(ctx, 0, 0)
      ctx.restore()
    }
  }
  return scaledBox
}

/** 创建分式盒子，按上下结构绘制分子、分母和分数线。 */
function createFormulaFractionBox(
  numerator: IFormulaVisualBox,
  denominator: IFormulaVisualBox,
  formulaCtx: IFormulaVisualContext
) {
  const gap = formulaCtx.baseSize * 0.22
  const padding = formulaCtx.baseSize * 0.18
  const strokePadding = resolveFormulaStrokeWidth(formulaCtx)
  const width = Math.max(numerator.width, denominator.width) + padding * 2
  const ascent = numerator.ascent + numerator.descent + gap * 2 + strokePadding
  const descent = denominator.ascent + denominator.descent + gap * 2 + strokePadding
  const box: IFormulaVisualBox = {
    width,
    ascent,
    descent,
    render(ctx, x, baseline) {
      ctx.save()
      ctx.strokeStyle = formulaCtx.color
      ctx.lineWidth = resolveFormulaStrokeWidth(formulaCtx)
      const lineY = baseline - gap
      ctx.beginPath()
      ctx.moveTo(x, lineY)
      ctx.lineTo(x + width, lineY)
      ctx.stroke()
      numerator.render(
        ctx,
        x + (width - numerator.width) / 2,
        lineY - gap - numerator.descent
      )
      denominator.render(
        ctx,
        x + (width - denominator.width) / 2,
        lineY + gap + denominator.ascent
      )
      ctx.restore()
    }
  }
  return box
}

/** 创建根式盒子，绘制根号折线和顶部横线。 */
function createFormulaSqrtBox(
  radicand: IFormulaVisualBox,
  formulaCtx: IFormulaVisualContext
) {
  const padding = formulaCtx.baseSize * 0.22
  const signWidth = formulaCtx.baseSize * 0.7
  const width = signWidth + radicand.width + padding
  const topPadding = formulaCtx.baseSize * 0.42
  const strokePadding = resolveFormulaStrokeWidth(formulaCtx)
  const ascent = radicand.ascent + topPadding + strokePadding
  const descent = radicand.descent + strokePadding
  const box: IFormulaVisualBox = {
    width,
    ascent,
    descent,
    render(ctx, x, baseline) {
      ctx.save()
      ctx.strokeStyle = formulaCtx.color
      ctx.lineWidth = resolveFormulaStrokeWidth(formulaCtx)
      const topY = baseline - radicand.ascent - topPadding * 0.72
      const bottomY = baseline + Math.max(1, descent * 0.25)
      const midY = baseline - formulaCtx.baseSize * 0.35
      ctx.beginPath()
      ctx.moveTo(x + signWidth * 0.08, midY)
      ctx.lineTo(x + signWidth * 0.28, midY)
      ctx.lineTo(x + signWidth * 0.42, bottomY)
      ctx.lineTo(x + signWidth * 0.68, topY)
      ctx.lineTo(x + width, topY)
      ctx.stroke()
      radicand.render(ctx, x + signWidth + padding * 0.4, baseline)
      ctx.restore()
    }
  }
  return box
}

/** 创建上下标盒子，使用小字号并按数学公式位置偏移。 */
function createFormulaScriptBox(
  base: IFormulaVisualBox,
  script: IFormulaVisualBox,
  type: 'superscript' | 'subscript',
  formulaCtx: IFormulaVisualContext
) {
  const scriptShift = formulaCtx.baseSize * 0.52
  const scriptGap = formulaCtx.baseSize * 0.05
  const width = base.width + script.width + scriptGap
  const ascent =
    type === 'superscript'
      ? Math.max(base.ascent, scriptShift + script.ascent + scriptGap)
      : base.ascent
  const descent =
    type === 'subscript'
      ? Math.max(base.descent, scriptShift + script.descent + scriptGap)
      : base.descent
  const box: IFormulaVisualBox = {
    width,
    ascent,
    descent,
    render(ctx, x, baseline) {
      base.render(ctx, x, baseline)
      const scriptBaseline =
        type === 'superscript' ? baseline - scriptShift : baseline + scriptShift
      script.render(ctx, x + base.width + scriptGap, scriptBaseline)
    }
  }
  return box
}

/** 创建同时包含上下标的盒子，让求和、变量等结构按同一个宽度整体排版。 */
function createFormulaSubSupBox(
  base: IFormulaVisualBox,
  subscript: IFormulaVisualBox,
  superscript: IFormulaVisualBox,
  formulaCtx: IFormulaVisualContext
) {
  const scriptGap = formulaCtx.baseSize * 0.08
  const stackWidth = Math.max(subscript.width, superscript.width)
  const width = base.width + scriptGap + stackWidth
  const supShift = formulaCtx.baseSize * 0.5
  const subShift = formulaCtx.baseSize * 0.38
  const ascent = Math.max(
    base.ascent,
    supShift + superscript.ascent + formulaCtx.baseSize * 0.06
  )
  const descent = Math.max(
    base.descent,
    subShift + subscript.descent + formulaCtx.baseSize * 0.06
  )
  const box: IFormulaVisualBox = {
    width,
    ascent,
    descent,
    render(ctx, x, baseline) {
      base.render(ctx, x, baseline)
      const stackX = x + base.width + scriptGap
      superscript.render(
        ctx,
        stackX + (stackWidth - superscript.width) / 2,
        baseline - supShift
      )
      subscript.render(
        ctx,
        stackX + (stackWidth - subscript.width) / 2,
        baseline + subShift
      )
    }
  }
  return box
}

/** 创建带上横线的重音盒子，用于 \bar{x} 这类统计公式。 */
function createFormulaBarBox(
  base: IFormulaVisualBox,
  formulaCtx: IFormulaVisualContext
) {
  const gap = formulaCtx.baseSize * 0.12
  const strokePadding = resolveFormulaStrokeWidth(formulaCtx)
  const box: IFormulaVisualBox = {
    width: base.width,
    ascent: base.ascent + gap + strokePadding,
    descent: base.descent,
    render(ctx, x, baseline) {
      base.render(ctx, x, baseline)
      ctx.save()
      ctx.strokeStyle = formulaCtx.color
      ctx.lineWidth = resolveFormulaStrokeWidth(formulaCtx)
      const lineY = baseline - base.ascent - gap
      ctx.beginPath()
      ctx.moveTo(x, lineY)
      ctx.lineTo(x + base.width, lineY)
      ctx.stroke()
      ctx.restore()
    }
  }
  return box
}

/** 公式 LaTeX 解析器，覆盖正文第一批需要的分式、根式、上下标和常用符号。 */
class FormulaVisualParser {
  /** 当前解析游标。 */
  private index = 0

  /** 初始化解析器。 */
  constructor(
    /** 待解析的 LaTeX 字符串。 */
    private readonly latex: string,
    /** 公式绘制上下文。 */
    private readonly formulaCtx: IFormulaVisualContext
  ) {}

  /** 解析完整公式。 */
  public parse() {
    return this.parseExpression()
  }

  /** 解析表达式直到遇到指定结束符。 */
  private parseExpression(stopChar = ''): IFormulaVisualBox {
    const boxList: IFormulaVisualBox[] = []
    while (this.index < this.latex.length) {
      if (stopChar && this.latex[this.index] === stopChar) {
        this.index++
        break
      }
      boxList.push(this.parseScriptableAtom())
    }
    return createFormulaRowBox(boxList)
  }

  /** 解析可追加上下标的基础原子。 */
  private parseScriptableAtom() {
    const baseBox = this.parseAtom()
    let subscriptBox: IFormulaVisualBox | null = null
    let superscriptBox: IFormulaVisualBox | null = null
    while (this.latex[this.index] === '^' || this.latex[this.index] === '_') {
      const mark = this.latex[this.index]
      this.index++
      const script = this.parseScriptBox()
      if (mark === '^') {
        superscriptBox = script
      } else {
        subscriptBox = script
      }
    }
    if (subscriptBox && superscriptBox) {
      return createFormulaSubSupBox(
        baseBox,
        subscriptBox,
        superscriptBox,
        this.formulaCtx
      )
    }
    if (superscriptBox) {
      return createFormulaScriptBox(
        baseBox,
        superscriptBox,
        'superscript',
        this.formulaCtx
      )
    }
    if (subscriptBox) {
      return createFormulaScriptBox(
        baseBox,
        subscriptBox,
        'subscript',
        this.formulaCtx
      )
    }
    return baseBox
  }

  /** 解析单个公式原子。 */
  private parseAtom(): IFormulaVisualBox {
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

  /** 使用小字号解析上下标内容。 */
  private parseScriptBox() {
    const scriptSize = Math.max(8, this.formulaCtx.baseSize * 0.65)
    const scriptCtx = {
      ...this.formulaCtx,
      baseSize: scriptSize,
      baseFont: resizeFormulaFont(this.formulaCtx.baseFont, scriptSize)
    }
    if (this.latex[this.index] === '{') {
      this.index++
      const parser = new FormulaVisualParser(
        this.readGroupContent(),
        scriptCtx
      )
      return parser.parse()
    }
    const value = this.latex[this.index] || ''
    this.index++
    return createFormulaTextBox(value, scriptCtx)
  }

  /** 读取当前花括号组内容，支持一层嵌套。 */
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

  /** 解析 LaTeX 命令。 */
  private parseCommand() {
    this.index++
    const command = this.readCommandName()
    if (command === 'frac') {
      const numerator = this.parseRequiredGroup()
      const denominator = this.parseRequiredGroup()
      return createFormulaFractionBox(numerator, denominator, this.formulaCtx)
    }
    if (command === 'sqrt') {
      return createFormulaSqrtBox(this.parseRequiredGroup(), this.formulaCtx)
    }
    if (command === 'bar' || command === 'overline') {
      return createFormulaBarBox(this.parseRequiredGroup(), this.formulaCtx)
    }
    return createFormulaTextBox(
      FORMULA_COMMAND_SYMBOL_MAP[command] || command,
      this.formulaCtx
    )
  }

  /** 读取命令名称。 */
  private readCommandName() {
    let command = ''
    while (/[A-Za-z%]/.test(this.latex[this.index] || '')) {
      command += this.latex[this.index]
      this.index++
    }
    return command || this.latex[this.index++] || ''
  }

  /** 解析命令后的必填花括号组。 */
  private parseRequiredGroup() {
    if (this.latex[this.index] !== '{') {
      return createFormulaTextBox('', this.formulaCtx)
    }
    this.index++
    const parser = new FormulaVisualParser(
      this.readGroupContent(),
      this.formulaCtx
    )
    return parser.parse()
  }

  /** 解析连续普通文本，遇到命令、花括号或上下标时停止。 */
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
    return createFormulaTextBox(text || ' ', this.formulaCtx)
  }
}

/** 创建公式视觉盒子，用于正文 Canvas 原生测量和绘制。 */
export function createFormulaVisualBox(payload: {
  /** Canvas 上下文。 */
  ctx: CanvasRenderingContext2D
  /** 公式 LaTeX。 */
  latex: string
  /** 元素字体。 */
  font: string
  /** 默认字号。 */
  defaultSize: number
  /** 公式元素，用于读取颜色。 */
  element: IElement
  /** 默认颜色。 */
  defaultColor: string
  /** 调试来源，用于区分测量、主线程渲染和 worker 渲染。 */
  debugSource?: string
}) {
  const baseSize = resolveFormulaFontSize(payload.font, payload.defaultSize)
  const formulaCtx: IFormulaVisualContext = {
    ctx: payload.ctx,
    baseFont: strengthenFormulaFont(payload.font),
    baseSize,
    color: payload.element.color || payload.defaultColor
  }
  const sourceLatex = payload.latex.trim()
  if (isFormulaEmptyPlaceholderValue(sourceLatex)) {
    const placeholderCtx = {
      ...formulaCtx,
      // 空白公式只显示灰色占位，真实公式内容仍然保持为空。
      color:
        payload.element.formula?.placeholderColor ||
        FORMULA_EMPTY_PLACEHOLDER_COLOR
    }
    const placeholderText =
      payload.element.formula?.placeholderText || FORMULA_EMPTY_PLACEHOLDER_TEXT
    const placeholderBox = createFormulaPaddedBox(createFormulaTextBox(placeholderText, placeholderCtx), {
      left: baseSize * 0.08,
      right: baseSize * 0.08,
      top: baseSize * 0.08,
      bottom: baseSize * 0.08
    })
    if (isFormulaDebugEnabled()) {
      logFormulaDebug('visual-box', {
        source: payload.debugSource || 'unknown',
        kind: 'placeholder',
        id: payload.element.id,
        latex: sourceLatex,
        width: roundFormulaDebugNumber(placeholderBox.width),
        ascent: roundFormulaDebugNumber(placeholderBox.ascent),
        descent: roundFormulaDebugNumber(placeholderBox.descent),
        baseSize: roundFormulaDebugNumber(baseSize)
      })
    }
    return placeholderBox
  }
  const latex = normalizeFormulaVisualLatex(sourceLatex)
  const visualBox = new FormulaVisualParser(latex, formulaCtx).parse()
  const paddedBox = createFormulaPaddedBox(
    visualBox,
    resolveFormulaOuterPadding(latex, baseSize)
  )
  const inlineBox = createFormulaInlineScaledBox(paddedBox, baseSize)
  if (isFormulaDebugEnabled()) {
    logFormulaDebug('visual-box', {
      source: payload.debugSource || 'unknown',
      kind: 'formula',
      id: payload.element.id,
      rawLatex: sourceLatex,
      normalizedLatex: latex,
      width: roundFormulaDebugNumber(inlineBox.width),
      ascent: roundFormulaDebugNumber(inlineBox.ascent),
      descent: roundFormulaDebugNumber(inlineBox.descent),
      innerWidth: roundFormulaDebugNumber(visualBox.width),
      innerAscent: roundFormulaDebugNumber(visualBox.ascent),
      innerDescent: roundFormulaDebugNumber(visualBox.descent),
      baseSize: roundFormulaDebugNumber(baseSize)
    })
  }
  return inlineBox
}
