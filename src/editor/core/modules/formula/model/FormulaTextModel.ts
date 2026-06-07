/** 上标字符映射，用于把常见公式指数转成可参与文本排版的字符。 */
/** 空白公式在正文中的占位文本，提示用户点击后可以直接编辑公式。 */
export const FORMULA_EMPTY_PLACEHOLDER_TEXT = '请输入公式'

/** 空白公式占位文本颜色，使用弱提示灰色避免被误认为正式内容。 */
export const FORMULA_EMPTY_PLACEHOLDER_COLOR = '#9ca3af'

/** 判断公式值是否只是占位，不应该当成真实公式渲染或导出。 */
export function isFormulaEmptyPlaceholderValue(value: string | undefined | null) {
  const normalizedValue = (value || '').trim()
  return (
    !normalizedValue ||
    normalizedValue === FORMULA_EMPTY_PLACEHOLDER_TEXT
  )
}

const SUPERSCRIPT_CHAR_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  i: 'ⁱ'
}

/** 下标字符映射，用于把常见公式下标转成可参与文本排版的字符。 */
const SUBSCRIPT_CHAR_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  h: 'ₕ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  l: 'ₗ',
  m: 'ₘ',
  n: 'ₙ',
  o: 'ₒ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
  x: 'ₓ'
}

/** 上标字符反向映射，用于把用户直接编辑的正常公式转回内部公式表达。 */
const SUPERSCRIPT_REVERSE_CHAR_MAP: Record<string, string> = Object.entries(
  SUPERSCRIPT_CHAR_MAP
).reduce<Record<string, string>>((map, [source, display]) => {
  map[display] = source
  return map
}, {})

/** 下标字符反向映射，用于把用户直接编辑的正常公式转回内部公式表达。 */
const SUBSCRIPT_REVERSE_CHAR_MAP: Record<string, string> = Object.entries(
  SUBSCRIPT_CHAR_MAP
).reduce<Record<string, string>>((map, [source, display]) => {
  map[display] = source
  return map
}, {})

/** LaTeX 命令到文本符号的基础映射。 */
const LATEX_SYMBOL_MAP: Record<string, string> = {
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

/** 文本符号到 LaTeX 命令的反向映射，用于就地编辑后保存内部公式。 */
const DISPLAY_SYMBOL_LATEX_MAP: Record<string, string> = Object.entries(
  LATEX_SYMBOL_MAP
).reduce<Record<string, string>>((map, [command, symbol]) => {
  map[symbol] = command
  return map
}, {})

/** 把普通字符映射成上标或下标字符，缺失映射时保留原文。 */
function mapScriptText(
  value: string,
  map: Record<string, string>
) {
  return value
    .split('')
    .map(char => map[char] || char)
    .join('')
}

/** 替换一层 LaTeX 命令，供公式文本控件排版和命中使用。 */
function replaceLatexCommand(value: string) {
  let result = value
  Object.entries(LATEX_SYMBOL_MAP).forEach(([command, symbol]) => {
    result = result.split(command).join(symbol)
  })
  return result
}

/** 读取 LaTeX 命令名称。 */
function readLatexCommand(value: string, start: number) {
  let index = start + 1
  let command = '\\'
  while (index < value.length && /[A-Za-z]/.test(value[index])) {
    command += value[index]
    index++
  }
  if (command === '\\' && index < value.length) {
    command += value[index]
    index++
  }
  return { command, index }
}

/** 跳过公式里的空白字符。 */
function skipFormulaWhitespace(value: string, start: number) {
  let index = start
  while (index < value.length && /\s/.test(value[index])) {
    index++
  }
  return index
}

/** 读取一组括号内容，支持嵌套花括号。 */
function readLatexGroup(value: string, start: number, open: string, close: string) {
  let index = skipFormulaWhitespace(value, start)
  if (value[index] !== open) {
    return null
  }
  let depth = 0
  const contentStart = index + 1
  while (index < value.length) {
    const char = value[index]
    if (char === open) {
      depth++
    } else if (char === close) {
      depth--
      if (depth === 0) {
        return {
          content: value.slice(contentStart, index),
          index: index + 1
        }
      }
    }
    index++
  }
  return null
}

/** 读取脚标内容，支持 `{...}` 和单字符写法。 */
function readLatexScript(value: string, start: number) {
  const group = readLatexGroup(value, start, '{', '}')
  if (group) {
    return group
  }
  const index = skipFormulaWhitespace(value, start)
  return {
    content: value[index] || '',
    index: Math.min(value.length, index + 1)
  }
}

/** 把矩阵内容压成单行展示文本，避免 begin/end 命令泄露到正文排版。 */
function parseLatexMatrixDisplayText(content: string) {
  return content
    .split('\\\\')
    .map(row =>
      row
        .split('&')
        .map(cell => parseLatexDisplayText(cell.trim()))
        .filter(Boolean)
        .join(',')
    )
    .filter(Boolean)
    .join(';')
}

/** 递归解析一段 LaTeX，输出普通文本可渲染的公式展示值。 */
function parseLatexDisplayText(value: string): string {
  let result = ''
  let index = 0
  while (index < value.length) {
    const char = value[index]
    if (char === '\\') {
      const command = readLatexCommand(value, index)
      index = command.index
      if (command.command === '\\begin') {
        const environment = readLatexGroup(value, index, '{', '}')
        if (environment?.content === 'matrix') {
          const endMarker = '\\end{matrix}'
          const endIndex = value.indexOf(endMarker, environment.index)
          if (endIndex >= 0) {
            result += parseLatexMatrixDisplayText(
              value.slice(environment.index, endIndex)
            )
            index = endIndex + endMarker.length
            continue
          }
        }
      }
      if (command.command === '\\frac') {
        const numerator = readLatexGroup(value, index, '{', '}')
        const denominator = numerator
          ? readLatexGroup(value, numerator.index, '{', '}')
          : null
        if (numerator && denominator) {
          result += `(${parseLatexDisplayText(numerator.content)})/(${parseLatexDisplayText(
            denominator.content
          )})`
          index = denominator.index
          continue
        }
      }
      if (command.command === '\\sqrt') {
        const rootIndex = readLatexGroup(value, index, '[', ']')
        const radicand = readLatexGroup(
          value,
          rootIndex ? rootIndex.index : index,
          '{',
          '}'
        )
        if (radicand) {
          const rootText = rootIndex
            ? mapScriptText(parseLatexDisplayText(rootIndex.content), SUPERSCRIPT_CHAR_MAP)
            : ''
          result += `${rootText}√(${parseLatexDisplayText(radicand.content)})`
          index = radicand.index
          continue
        }
      }
      if (command.command === '\\bar') {
        const group = readLatexGroup(value, index, '{', '}')
        if (group) {
          result += `${parseLatexDisplayText(group.content)}̄`
          index = group.index
          continue
        }
      }
      if (
        command.command === '\\boxed' ||
        command.command === '\\overbrace' ||
        command.command === '\\underbrace' ||
        command.command === '\\phantom'
      ) {
        const group = readLatexGroup(value, index, '{', '}')
        if (group) {
          result += parseLatexDisplayText(group.content)
          index = group.index
          continue
        }
      }
      if (command.command === '\\left' || command.command === '\\right') {
        continue
      }
      result += LATEX_SYMBOL_MAP[command.command] || command.command.replace(/^\\/, '')
      continue
    }
    if (char === '^' || char === '_') {
      const script = readLatexScript(value, index + 1)
      result += mapScriptText(
        parseLatexDisplayText(script.content),
        char === '^' ? SUPERSCRIPT_CHAR_MAP : SUBSCRIPT_CHAR_MAP
      )
      index = script.index
      continue
    }
    if (char === '{' || char === '}') {
      index++
      continue
    }
    result += char
    index++
  }
  return replaceLatexCommand(result)
}

/** 把 LaTeX 片段转换成可参与行布局的文本公式展示值。 */
export function resolveFormulaDisplayText(latex: string) {
  const result = latex.trim()
  if (isFormulaEmptyPlaceholderValue(result)) {
    return FORMULA_EMPTY_PLACEHOLDER_TEXT
  }
  return parseLatexDisplayText(result)
}

/** 判断字符是否是公式展示态中的上标字符。 */
function isFormulaSuperscriptChar(char: string) {
  return !!SUPERSCRIPT_REVERSE_CHAR_MAP[char]
}

/** 判断字符是否是公式展示态中的下标字符。 */
function isFormulaSubscriptChar(char: string) {
  return !!SUBSCRIPT_REVERSE_CHAR_MAP[char]
}

/** 读取连续上标或下标字符，并转回普通脚本文本。 */
function readFormulaScriptText(payload: {
  /** 被读取的公式展示文本。 */
  value: string
  /** 起始下标。 */
  start: number
  /** 字符反向映射表。 */
  map: Record<string, string>
  /** 字符判断函数。 */
  predicate: (char: string) => boolean
}) {
  const { value, start, map, predicate } = payload
  let index = start
  let text = ''
  while (index < value.length && predicate(value[index])) {
    text += map[value[index]]
    index++
  }
  return {
    /** 脚本文本。 */
    text,
    /** 读取结束位置。 */
    index
  }
}

/** 把可读公式展示文本转回内部公式表达，供页面内公式控件直接编辑后保存。 */
export function normalizeFormulaDisplayTextToLatex(displayText: string) {
  const value = displayText.trim()
  if (isFormulaEmptyPlaceholderValue(value)) {
    return ''
  }
  let result = ''
  let index = 0
  while (index < value.length) {
    const char = value[index]
    if (isFormulaSuperscriptChar(char)) {
      const script = readFormulaScriptText({
        value,
        start: index,
        map: SUPERSCRIPT_REVERSE_CHAR_MAP,
        predicate: isFormulaSuperscriptChar
      })
      result += `^{${script.text}}`
      index = script.index
      continue
    }
    if (isFormulaSubscriptChar(char)) {
      const script = readFormulaScriptText({
        value,
        start: index,
        map: SUBSCRIPT_REVERSE_CHAR_MAP,
        predicate: isFormulaSubscriptChar
      })
      result += `_{${script.text}}`
      index = script.index
      continue
    }
    result += DISPLAY_SYMBOL_LATEX_MAP[char] || char
    index++
  }
  // 常见根式展示值直接转回根式结构，复杂节点级编辑后续由公式 AST 编辑器接管。
  result = result.replace(/√\(([^()]+)\)/g, '\\sqrt{$1}')
  // 只把完整的 `(分子)/(分母)` 展示值还原为分式，避免 `mg/(kg·d)` 被误判为分式。
  result = result.replace(/^\(([^()]+)\)\/\(([^()]+)\)$/g, '\\frac{$1}{$2}')
  return result
}
