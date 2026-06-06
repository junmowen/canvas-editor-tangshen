/** OOXML 数学符号到内部 LaTeX 序列化文本的常用命令映射。 */
const OOXML_FORMULA_SYMBOL_LATEX_MAP: Record<string, string> = {
  '∑': '\\sum',
  '∫': '\\int',
  '∏': '\\prod',
  '∐': '\\coprod',
  '∞': '\\infty',
  '±': '\\pm',
  '×': '\\times',
  '·': '\\cdot',
  '≤': '\\le',
  '≥': '\\ge',
  '≈': '\\approx',
  '→': '\\rightarrow',
  π: '\\pi',
  μ: '\\mu',
  σ: '\\sigma',
  Δ: '\\Delta'
}

/** OOXML accent 字符到内部 LaTeX 命令的映射。 */
const OOXML_FORMULA_ACCENT_LATEX_MAP: Record<string, string> = {
  '\u0302': '\\hat',
  '\u0304': '\\bar',
  '\u0307': '\\dot',
  '\u0308': '\\ddot',
  '^': '\\hat',
  '¯': '\\bar',
  '.': '\\dot',
  '..': '\\ddot'
}

/** 把 OOXML 数学符号转换成内部 LaTeX 序列化值，未知符号保留原值。 */
export function normalizeOoxmlFormulaSymbolValue(
  value: string | null | undefined
) {
  const normalizedValue = value || ''
  return OOXML_FORMULA_SYMBOL_LATEX_MAP[normalizedValue] || normalizedValue
}

/** 把 OOXML accent 字符转换成内部 LaTeX 命令，未知符号使用默认命令。 */
export function resolveOoxmlFormulaAccentCommand(
  value: string | null | undefined,
  defaultCommand: string
) {
  return OOXML_FORMULA_ACCENT_LATEX_MAP[value || ''] || defaultCommand
}
