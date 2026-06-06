import {
  BlockType,
  ControlType,
  Editor,
  EDITOR_COMPONENT,
  EditorComponent,
  ElementType,
  FormulaDomain,
  IBlock,
  IElement,
  IFormulaNode,
  IFormulaSymbol,
  TableDisplay,
  splitText
} from '../../editor'
import {
  FORMULA_EMPTY_PLACEHOLDER_COLOR,
  FORMULA_EMPTY_PLACEHOLDER_TEXT,
  isFormulaEmptyPlaceholderValue,
  normalizeFormulaDisplayTextToLatex,
  resolveFormulaDisplayText
} from '../../editor/core/modules/formula/model/FormulaTextModel'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../../editor/core/modules/formula/debug/FormulaDebugLogger'
import { LaTexParticle } from '../../editor/core/modules/image/particle/latex/LaTexParticle'
import prism from 'prismjs'
import { Dialog } from '../../components/dialog/Dialog'
import { formatPrismToken } from '../utils/prism'

/** 公式模板项，用于公式菜单快速插入常用结构。 */
interface IFormulaTemplate {
  /** 模板标识，用于测试、统计和 AST 推断。 */
  id: string
  /** 模板展示名称。 */
  label: string
  /** 插入到 LaTeX 文本框中的片段。 */
  latex: string
}

/** 公式快捷菜单二级公式项，用于从类目菜单直接插入业务公式。 */
interface IFormulaQuickItem {
  /** 展示名称，显示在类目二级菜单中。 */
  label: string
  /** 点击后插入的 LaTeX 内容。 */
  latex: string
  /** 公式所属领域标签，用于后续业务筛选和导出映射。 */
  domainTags?: FormulaDomain[]
  /** 来源符号库 ID，用于记录公式由哪个专业符号插入。 */
  symbolIds?: string[]
}

/** 公式快捷菜单一级类目。 */
interface IFormulaQuickCategory {
  /** 类目标识，用于测试和 DOM 数据属性。 */
  id: string
  /** 类目名称。 */
  label: string
  /** 类目下可直接插入的公式项。 */
  itemList: IFormulaQuickItem[]
}

/** 公式领域筛选项，覆盖数学、物理、化学、医院和工厂专业符号。 */
const FORMULA_DOMAIN_FILTER_LIST: { label: string; value: FormulaDomain | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '数学', value: 'math' },
  { label: '物理', value: 'physics' },
  { label: '化学', value: 'chemistry' },
  { label: '医院', value: 'hospital' },
  { label: '工厂', value: 'factory' }
]

/** 常用公式结构模板，作为专业公式面板的第一批可视化入口。 */
const FORMULA_TEMPLATE_LIST: IFormulaTemplate[] = [
  { id: 'fraction', label: '分式', latex: '\\frac{a}{b}' },
  { id: 'sqrt', label: '根式', latex: '\\sqrt{x}' },
  { id: 'superscript', label: '上标', latex: 'x^{2}' },
  { id: 'subscript', label: '下标', latex: 'A_{i}' },
  { id: 'subsup', label: '上下标', latex: 'A_{i}^{2}' },
  { id: 'matrix', label: '矩阵', latex: '\\begin{matrix}a&b\\\\c&d\\end{matrix}' }
]

/** 数学公式快捷项保留真实公式，结构类模板继续放在自定义公式编辑器中。 */
const MATH_QUICK_FORMULA_LIST: IFormulaQuickItem[] = [
  {
    label: '勾股定理',
    latex: 'a^{2}+b^{2}=c^{2}',
    domainTags: ['math']
  },
  {
    label: '二次公式',
    latex: 'x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}',
    domainTags: ['math']
  },
  {
    label: '圆面积',
    latex: 'S=\\pi r^{2}',
    domainTags: ['math']
  },
  {
    label: '圆周长',
    latex: 'C=2\\pi r',
    domainTags: ['math']
  },
  {
    label: '算术平均值',
    latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i',
    domainTags: ['math']
  },
  {
    label: '标准差',
    latex: '\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2}',
    domainTags: ['math']
  }
]

/** 空白公式控件的占位 LaTeX，真实公式内容仍保持为空。 */
const FORMULA_PLACEHOLDER_LATEX = '\\Box'

/** 把普通文本包装成公式 AST 文本节点。 */
function createFormulaTextNode(value: string): IFormulaNode {
  return {
    type: 'text',
    value
  }
}

/** 根据面板插入内容生成最小结构化 AST，后续可继续替换为完整解析器。 */
function createFormulaAstFromMenu(latex: string): IFormulaNode {
  const fractionMatch = latex.match(/^\\frac\{(.+)\}\{(.+)\}$/)
  if (fractionMatch) {
    return {
      type: 'fraction',
      numerator: createFormulaTextNode(fractionMatch[1]),
      denominator: createFormulaTextNode(fractionMatch[2])
    }
  }
  const sqrtMatch = latex.match(/^\\sqrt\{(.+)\}$/)
  if (sqrtMatch) {
    return {
      type: 'sqrt',
      radicand: createFormulaTextNode(sqrtMatch[1])
    }
  }
  const isSimpleScriptLatex = !/[=+\-]/.test(latex)
  if (!isSimpleScriptLatex) {
    return {
      type: 'root',
      children: [createFormulaTextNode(latex)]
    }
  }
  const subSupMatch = latex.match(/^([A-Za-z0-9\\]+)_\{(.+)\}\^\{(.+)\}$/)
  if (subSupMatch) {
    return {
      type: 'subsup',
      base: createFormulaTextNode(subSupMatch[1]),
      subscript: createFormulaTextNode(subSupMatch[2]),
      superscript: createFormulaTextNode(subSupMatch[3])
    }
  }
  const supMatch = latex.match(/^([A-Za-z0-9\\]+)\^\{(.+)\}$/)
  if (supMatch) {
    return {
      type: 'superscript',
      base: createFormulaTextNode(supMatch[1]),
      superscript: createFormulaTextNode(supMatch[2])
    }
  }
  const subMatch = latex.match(/^([A-Za-z0-9\\]+)_\{(.+)\}$/)
  if (subMatch) {
    return {
      type: 'subscript',
      base: createFormulaTextNode(subMatch[1]),
      subscript: createFormulaTextNode(subMatch[2])
    }
  }
  if (latex.includes('\\begin{matrix}')) {
    return {
      type: 'matrix',
      rows: [
        [createFormulaTextNode('a'), createFormulaTextNode('b')],
        [createFormulaTextNode('c'), createFormulaTextNode('d')]
      ]
    }
  }
  return {
    type: 'root',
    children: [createFormulaTextNode(latex)]
  }
}

/** 生成公式唯一标识，便于后续通过 API 查询结构化公式。 */
function createFormulaId() {
  return `formula-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** 将专业符号库条目转换为快捷菜单公式项。 */
function createQuickItemFromSymbol(symbol: IFormulaSymbol): IFormulaQuickItem {
  return {
    label: symbol.label,
    latex: symbol.latex,
    domainTags: [symbol.domain],
    symbolIds: [symbol.id]
  }
}

/** 去重同一类目下相同公式，避免快捷模板和符号库重复展示。 */
function uniqueFormulaQuickItemList(itemList: IFormulaQuickItem[]) {
  const usedKeySet = new Set<string>()
  return itemList.filter(item => {
    const key = item.symbolIds?.join('|') || item.latex
    if (usedKeySet.has(key) || usedKeySet.has(item.latex)) {
      return false
    }
    usedKeySet.add(key)
    usedKeySet.add(item.latex)
    return true
  })
}

/** 构建工具栏公式快捷类目，一级显示领域，二级显示可直接插入的具体公式。 */
function createFormulaQuickCategoryList(
  symbolList: IFormulaSymbol[]
): IFormulaQuickCategory[] {
  const mathList = symbolList
    .filter(symbol => symbol.domain === 'math')
    .map(createQuickItemFromSymbol)
  const physicsList = symbolList
    .filter(symbol => symbol.domain === 'physics')
    .map(createQuickItemFromSymbol)
  const chemistryList = symbolList
    .filter(symbol => symbol.domain === 'chemistry')
    .map(createQuickItemFromSymbol)
  const hospitalList = symbolList
    .filter(symbol => symbol.domain === 'hospital')
    .map(createQuickItemFromSymbol)
  const factorySymbolList = symbolList.filter(symbol => symbol.domain === 'factory')
  const factoryList = factorySymbolList.map(createQuickItemFromSymbol)
  return [
    {
      id: 'math',
      label: '数学',
      itemList: uniqueFormulaQuickItemList([
        ...MATH_QUICK_FORMULA_LIST,
        ...mathList
      ])
    },
    {
      id: 'physics',
      label: '物理',
      itemList: physicsList
    },
    {
      id: 'chemistry',
      label: '化学',
      itemList: chemistryList
    },
    {
      id: 'hospital',
      label: '医院',
      itemList: hospitalList
    },
    {
      id: 'factory',
      label: '工厂',
      itemList: factoryList
    }
  ].filter(category => category.itemList.length)
}

/** 创建可编辑公式元素，统一菜单直插、弹窗插入和页面内编辑的数据结构。 */
function createFormulaElement(
  latex: string,
  options: {
    /** 元素 ID，编辑已有公式时保持原 ID 不变。 */
    id?: string
    /** 公式模型 ID，导入导出和业务绑定时需要稳定保留。 */
    formulaId?: string
    /** 公式展示方式，默认按行内公式插入。 */
    displayMode?: 'inline' | 'block'
    /** 公式命中的专业领域标签。 */
    domainTags?: FormulaDomain[]
    /** 公式使用过的专业符号 ID。 */
    symbolIds?: string[]
  } = {}
): IElement {
  const formulaId = options.formulaId || options.id || createFormulaId()
  return {
    id: options.id || formulaId,
    type: ElementType.LATEX,
    value: latex,
    formula: {
      id: formulaId,
      displayMode: options.displayMode || 'inline',
      sourceFormat: 'latex',
      latex,
      placeholderLatex: FORMULA_PLACEHOLDER_LATEX,
      placeholderText: FORMULA_EMPTY_PLACEHOLDER_TEXT,
      placeholderColor: FORMULA_EMPTY_PLACEHOLDER_COLOR,
      ast: createFormulaAstFromMenu(latex),
      domainTags: options.domainTags || [],
      symbolIds: options.symbolIds || []
    }
  }
}

/** 读取公式真实 LaTeX，空白公式控件不把占位符当作用户内容。 */
function getFormulaLatex(element: IElement) {
  const latex = element.formula?.latex ?? element.value ?? ''
  return isFormulaEmptyPlaceholderValue(latex) ? '' : latex
}

/** 插入公式控件，latex 为空时插入可点击编辑的空白公式对象。 */
function insertFormulaElement(
  instance: Editor,
  latex = '',
  options: {
    /** 公式所属领域标签，用于业务和导出链路识别来源。 */
    domainTags?: FormulaDomain[]
    /** 来源符号库 ID，用于保留专业公式菜单插入来源。 */
    symbolIds?: string[]
  } = {}
) {
  instance.command.executeInsertElementList([
    createFormulaElement(latex, {
      domainTags: options.domainTags,
      symbolIds: options.symbolIds
    })
  ])
}

/** 更新已有公式控件，保持对象 ID 和展示方式稳定。 */
function updateFormulaElement(instance: Editor, element: IElement, latex: string) {
  if (!element.id) return
  const formulaElement = createFormulaElement(latex, {
    id: element.id,
    formulaId: element.formula?.id || element.id,
    displayMode: element.formula?.displayMode || 'inline',
    domainTags: element.formula?.domainTags,
    symbolIds: element.formula?.symbolIds
  })
  instance.command.executeUpdateElementById({
    id: element.id,
    properties: {
      type: ElementType.LATEX,
      value: formulaElement.value,
      formula: formulaElement.formula
    }
  })
}

/** 打开公式面板的配置，支持新增公式和编辑已有公式。 */
interface IOpenFormulaDialogOption {
  /** 当前正在编辑的公式元素，传入后确认按钮会更新该元素。 */
  editElement?: IElement
}

/** 打开专业公式插入面板，支持模板、专业符号库和结构化公式数据写入。 */
function openFormulaDialog(
  instance: Editor,
  options: IOpenFormulaDialogOption = {}
) {
  const { editElement } = options
  const symbolList: IFormulaSymbol[] = instance.command.getFormulaSymbolList()
  const selectedSymbolIdSet = new Set<string>(editElement?.formula?.symbolIds || [])
  let activeDomain: FormulaDomain | 'all' = 'all'
  let keyword = ''

  const mask = document.createElement('div')
  mask.classList.add('formula-dialog-mask')
  mask.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
  const container = document.createElement('div')
  container.classList.add('formula-dialog-container')
  container.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
  const dialog = document.createElement('div')
  dialog.classList.add('formula-dialog')
  container.append(dialog)

  const title = document.createElement('div')
  title.classList.add('formula-dialog__title')
  const titleText = document.createElement('span')
  titleText.innerText = editElement ? '编辑公式' : '公式'
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.innerText = '×'
  title.append(titleText, closeBtn)
  dialog.append(title)

  const body = document.createElement('div')
  body.classList.add('formula-dialog__body')
  const leftPanel = document.createElement('div')
  leftPanel.classList.add('formula-dialog__panel')
  const rightPanel = document.createElement('div')
  rightPanel.classList.add('formula-dialog__editor')
  body.append(leftPanel, rightPanel)
  dialog.append(body)

  const templateTitle = document.createElement('div')
  templateTitle.classList.add('formula-dialog__section-title')
  templateTitle.innerText = '常用结构'
  const templateList = document.createElement('div')
  templateList.classList.add('formula-dialog__template-list')
  leftPanel.append(templateTitle, templateList)

  const filterTitle = document.createElement('div')
  filterTitle.classList.add('formula-dialog__section-title')
  filterTitle.innerText = '专业符号'
  const domainList = document.createElement('div')
  domainList.classList.add('formula-dialog__domain-list')
  const searchInput = document.createElement('input')
  searchInput.classList.add('formula-dialog__search')
  searchInput.placeholder = '搜索符号、单位或专业词'
  const symbolContainer = document.createElement('div')
  symbolContainer.classList.add('formula-dialog__symbol-list')
  leftPanel.append(filterTitle, domainList, searchInput, symbolContainer)

  const modeRow = document.createElement('label')
  modeRow.classList.add('formula-dialog__mode')
  const modeText = document.createElement('span')
  modeText.innerText = '展示方式'
  const modeSelect = document.createElement('select')
  modeSelect.innerHTML = `
    <option value="inline">行内公式</option>
    <option value="block">独立公式</option>
  `
  modeSelect.value = editElement?.formula?.displayMode || 'inline'
  modeRow.append(modeText, modeSelect)
  const textarea = document.createElement('textarea')
  textarea.classList.add('formula-dialog__textarea')
  textarea.placeholder = '输入 LaTeX，或从左侧插入结构和专业符号'
  textarea.value = editElement ? getFormulaLatex(editElement) : ''
  const previewTitle = document.createElement('div')
  previewTitle.classList.add('formula-dialog__section-title')
  previewTitle.innerText = '预览'
  const preview = document.createElement('div')
  preview.classList.add('formula-dialog__preview')
  rightPanel.append(modeRow, textarea, previewTitle, preview)

  const footer = document.createElement('div')
  footer.classList.add('formula-dialog__footer')
  const cancelBtn = document.createElement('button')
  cancelBtn.type = 'button'
  cancelBtn.innerText = '取消'
  const confirmBtn = document.createElement('button')
  confirmBtn.type = 'button'
  confirmBtn.innerText = editElement ? '更新公式' : '插入公式'
  confirmBtn.classList.add('formula-dialog__confirm')
  footer.append(cancelBtn, confirmBtn)
  dialog.append(footer)

  /** 关闭公式面板并把焦点还给编辑器输入区。 */
  const dispose = () => {
    mask.remove()
    container.remove()
    document.querySelector<HTMLTextAreaElement>('.ce-inputarea')?.focus()
  }

  /** 在当前光标处插入公式片段，保持用户已输入内容。 */
  const insertLatexFragment = (latex: string) => {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    textarea.value =
      textarea.value.slice(0, start) + latex + textarea.value.slice(end)
    const nextCursor = start + latex.length
    textarea.setSelectionRange(nextCursor, nextCursor)
    textarea.focus()
    renderPreview()
  }

  /** 根据筛选条件刷新专业符号列表。 */
  const renderSymbolList = () => {
    symbolContainer.innerHTML = ''
    const normalizedKeyword = keyword.trim().toLowerCase()
    const filteredSymbolList = symbolList.filter(symbol => {
      const isDomainMatched = activeDomain === 'all' || symbol.domain === activeDomain
      const keywordSource = [
        symbol.label,
        symbol.category,
        symbol.description,
        symbol.latex,
        ...symbol.keywords
      ].join(' ').toLowerCase()
      return isDomainMatched && (!normalizedKeyword || keywordSource.includes(normalizedKeyword))
    })
    filteredSymbolList.forEach(symbol => {
      const button = document.createElement('button')
      button.type = 'button'
      button.classList.add('formula-dialog__symbol')
      button.dataset.symbolId = symbol.id
      if (selectedSymbolIdSet.has(symbol.id)) {
        button.classList.add('active')
      }
      button.innerHTML = `
        <span>${symbol.label}</span>
        <code>${symbol.latex}</code>
      `
      button.title = symbol.description
      button.onclick = () => {
        selectedSymbolIdSet.add(symbol.id)
        insertLatexFragment(symbol.latex)
        renderSymbolList()
      }
      symbolContainer.append(button)
    })
  }

  /** 刷新预览，复用编辑器 LaTeX SVG 渲染能力展示真实公式形态。 */
  function renderPreview() {
    const latex = textarea.value.trim()
    preview.innerHTML = ''
    if (!latex) {
      preview.innerText = '请选择结构或输入公式'
      return
    }
    try {
      const { svg, width, height } = LaTexParticle.convertLaTextToSVG(latex)
      const image = document.createElement('img')
      image.classList.add('formula-dialog__preview-image')
      image.src = svg
      image.alt = latex
      image.style.width = `${Math.max(1, width)}px`
      image.style.height = `${Math.max(1, height)}px`
      preview.append(image)
    } catch (error) {
      const errorMessage = document.createElement('span')
      errorMessage.classList.add('formula-dialog__preview-error')
      errorMessage.innerText = '公式暂无法预览，请检查 LaTeX 结构'
      preview.append(errorMessage)
    }
  }

  FORMULA_TEMPLATE_LIST.forEach(template => {
    const button = document.createElement('button')
    button.type = 'button'
    button.classList.add('formula-dialog__template')
    button.dataset.templateId = template.id
    button.innerText = template.label
    button.onclick = () => insertLatexFragment(template.latex)
    templateList.append(button)
  })

  FORMULA_DOMAIN_FILTER_LIST.forEach(item => {
    const button = document.createElement('button')
    button.type = 'button'
    button.innerText = item.label
    button.dataset.domain = item.value
    if (item.value === activeDomain) {
      button.classList.add('active')
    }
    button.onclick = () => {
      activeDomain = item.value
      domainList.querySelectorAll('button').forEach(domainButton => {
        domainButton.classList.toggle('active', domainButton === button)
      })
      renderSymbolList()
    }
    domainList.append(button)
  })

  searchInput.oninput = () => {
    keyword = searchInput.value
    renderSymbolList()
  }
  textarea.oninput = renderPreview
  closeBtn.onclick = dispose
  cancelBtn.onclick = dispose
  confirmBtn.onclick = () => {
    const latex = textarea.value.trim()
    if (!latex && !editElement) return
    const usedSymbolList = symbolList.filter(symbol =>
      selectedSymbolIdSet.has(symbol.id)
    )
    const domainTags = Array.from(
      new Set(usedSymbolList.map(symbol => symbol.domain))
    )
    const formulaElement = createFormulaElement(latex, {
      id: editElement?.id,
      formulaId: editElement?.formula?.id || editElement?.id,
      displayMode: modeSelect.value === 'block' ? 'block' : 'inline',
      domainTags,
      symbolIds: Array.from(selectedSymbolIdSet)
    })
    if (editElement?.id) {
      instance.command.executeUpdateElementById({
        id: editElement.id,
        properties: {
          type: ElementType.LATEX,
          value: formulaElement.value,
          formula: formulaElement.formula
        }
      })
    } else {
      instance.command.executeInsertElementList([formulaElement])
    }
    dispose()
  }

  document.body.append(mask, container)
  renderPreview()
  renderSymbolList()
  textarea.focus()
}

/** 页面内公式命中目标，描述公式控件和覆盖层定位信息。 */
interface IFormulaInlineEditTarget {
  /** 被点击的公式元素。 */
  element: IElement
  /** 公式所在页面包装器，覆盖层直接挂载在这里。 */
  pageWrapper: HTMLDivElement
  /** 覆盖层左侧位置。 */
  left: number
  /** 覆盖层顶部位置。 */
  top: number
  /** 覆盖层宽度。 */
  width: number
  /** 覆盖层高度。 */
  height: number
}

/** 当前页面内公式编辑器销毁函数，确保同一时间只有一个公式处于编辑态。 */
let activeFormulaInlineEditorDispose: (() => void) | null = null

/** 页面内公式可视编辑节点，负责 DOM 展示和回写内部公式表达。 */
interface IFormulaInlineVisualNode {
  /** 节点 DOM。 */
  element: HTMLElement
  /** 从当前 DOM 内容读取内部公式表达。 */
  getLatex: () => string
  /** 聚焦当前节点内第一个可编辑字段。 */
  focus: () => void
}

/** 读取花括号包裹内容，返回内容和结束位置。 */
function readFormulaInlineGroup(latex: string, startIndex: number) {
  let depth = 0
  let content = ''
  let index = startIndex
  while (index < latex.length) {
    const char = latex[index]
    if (char === '{') {
      if (depth > 0) {
        content += char
      }
      depth++
    } else if (char === '}') {
      depth--
      if (depth <= 0) {
        index++
        break
      }
      content += char
    } else {
      content += char
    }
    index++
  }
  return {
    /** 花括号内部内容。 */
    content,
    /** 花括号结束后的下一个位置。 */
    nextIndex: index
  }
}

/** 创建公式内可编辑字段。 */
function createFormulaInlineField(
  value: string,
  className = ''
) {
  const field = document.createElement('span')
  field.classList.add('formula-inline-editor__field')
  if (className) {
    field.classList.add(className)
  }
  field.contentEditable = 'plaintext-only'
  field.spellcheck = false
  field.innerText = resolveFormulaDisplayText(value)
  return field
}

/** 聚焦并选中一个公式字段。 */
function focusFormulaInlineField(field: HTMLElement) {
  field.focus()
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(field)
  selection?.removeAllRanges()
  selection?.addRange(range)
}

/** 创建公式纯文本节点，用户看到的是普通符号而不是 LaTeX 命令。 */
function createFormulaInlineTextNode(latex: string): IFormulaInlineVisualNode {
  const field = createFormulaInlineField(latex)
  return {
    element: field,
    getLatex: () => normalizeFormulaDisplayTextToLatex(field.innerText),
    focus: () => focusFormulaInlineField(field)
  }
}

/** 创建公式分式节点，分子和分母保持上下结构可编辑。 */
function createFormulaInlineFractionNode(
  numeratorLatex: string,
  denominatorLatex: string
): IFormulaInlineVisualNode {
  const fraction = document.createElement('span')
  fraction.classList.add('formula-inline-editor__fraction')
  const numerator = buildFormulaInlineVisualEditor(numeratorLatex, false)
  const denominator = buildFormulaInlineVisualEditor(denominatorLatex, false)
  numerator.element.classList.add('formula-inline-editor__fraction-numerator')
  denominator.element.classList.add('formula-inline-editor__fraction-denominator')
  fraction.append(numerator.element, denominator.element)
  return {
    element: fraction,
    getLatex: () => `\\frac{${numerator.getLatex()}}{${denominator.getLatex()}}`,
    focus: () => numerator.focus()
  }
}

/** 创建公式根式节点，根号和横线保持公式形态。 */
function createFormulaInlineSqrtNode(radicandLatex: string): IFormulaInlineVisualNode {
  const sqrt = document.createElement('span')
  sqrt.classList.add('formula-inline-editor__sqrt')
  const sign = document.createElement('span')
  sign.classList.add('formula-inline-editor__sqrt-sign')
  sign.innerText = '√'
  const radicand = buildFormulaInlineVisualEditor(radicandLatex, false)
  radicand.element.classList.add('formula-inline-editor__sqrt-radicand')
  sqrt.append(sign, radicand.element)
  return {
    element: sqrt,
    getLatex: () => `\\sqrt{${radicand.getLatex()}}`,
    focus: () => radicand.focus()
  }
}

/** 创建公式上下标节点，脚标字段可直接编辑。 */
function createFormulaInlineScriptNode(
  baseNode: IFormulaInlineVisualNode,
  scriptLatex: string,
  mark: '^' | '_'
): IFormulaInlineVisualNode {
  const wrapper = document.createElement('span')
  wrapper.classList.add('formula-inline-editor__script')
  const script = createFormulaInlineField(
    scriptLatex,
    'formula-inline-editor__field--script'
  )
  const scriptElement = document.createElement(mark === '^' ? 'sup' : 'sub')
  scriptElement.classList.add(
    mark === '^'
      ? 'formula-inline-editor__script-sup'
      : 'formula-inline-editor__script-sub'
  )
  scriptElement.append(script)
  wrapper.append(baseNode.element, scriptElement)
  return {
    element: wrapper,
    getLatex: () =>
      `${baseNode.getLatex()}${mark}{${normalizeFormulaDisplayTextToLatex(
        script.innerText
      )}}`,
    focus: () => focusFormulaInlineField(script)
  }
}

/** 创建公式上下标组合节点，适配求和等上下限结构。 */
function createFormulaInlineSubSupNode(
  baseNode: IFormulaInlineVisualNode,
  subscriptLatex: string,
  superscriptLatex: string
): IFormulaInlineVisualNode {
  const wrapper = document.createElement('span')
  wrapper.classList.add('formula-inline-editor__subsup')
  const scriptStack = document.createElement('span')
  scriptStack.classList.add('formula-inline-editor__subsup-stack')
  const supField = createFormulaInlineField(
    superscriptLatex,
    'formula-inline-editor__field--script'
  )
  const subField = createFormulaInlineField(
    subscriptLatex,
    'formula-inline-editor__field--script'
  )
  const sup = document.createElement('span')
  sup.classList.add('formula-inline-editor__subsup-sup')
  const sub = document.createElement('span')
  sub.classList.add('formula-inline-editor__subsup-sub')
  sup.append(supField)
  sub.append(subField)
  scriptStack.append(sup, sub)
  wrapper.append(baseNode.element, scriptStack)
  return {
    element: wrapper,
    getLatex: () =>
      `${baseNode.getLatex()}_{${normalizeFormulaDisplayTextToLatex(
        subField.innerText
      )}}^{${normalizeFormulaDisplayTextToLatex(supField.innerText)}}`,
    focus: () => focusFormulaInlineField(subField)
  }
}

/** 读取上下标内容，支持花括号脚标和单字符脚标。 */
function readFormulaInlineScript(latex: string, startIndex: number) {
  if (latex[startIndex] === '{') {
    return readFormulaInlineGroup(latex, startIndex)
  }
  return {
    /** 脚标内容。 */
    content: latex[startIndex] || '',
    /** 脚标结束后的下一个位置。 */
    nextIndex: startIndex + 1
  }
}

/** 解析一段公式为可视编辑节点列表。 */
function parseFormulaInlineVisualNodeList(latex: string): IFormulaInlineVisualNode[] {
  const nodeList: IFormulaInlineVisualNode[] = []
  let index = 0
  let textBuffer = ''

  /** 提交当前普通文本缓冲区。 */
  const flushText = () => {
    if (!textBuffer) return
    nodeList.push(createFormulaInlineTextNode(textBuffer))
    textBuffer = ''
  }

  while (index < latex.length) {
    const char = latex[index]
    if (char === '\\') {
      flushText()
      let command = ''
      index++
      while (/[A-Za-z%]/.test(latex[index] || '')) {
        command += latex[index]
        index++
      }
      if (command === 'frac' && latex[index] === '{') {
        const numerator = readFormulaInlineGroup(latex, index)
        const denominator = readFormulaInlineGroup(latex, numerator.nextIndex)
        nodeList.push(
          createFormulaInlineFractionNode(numerator.content, denominator.content)
        )
        index = denominator.nextIndex
        continue
      }
      if (command === 'sqrt' && latex[index] === '{') {
        const radicand = readFormulaInlineGroup(latex, index)
        nodeList.push(createFormulaInlineSqrtNode(radicand.content))
        index = radicand.nextIndex
        continue
      }
      textBuffer += `\\${command}`
      continue
    }
    if (char === '^' || char === '_') {
      flushText()
      if (!nodeList.length) {
        textBuffer += char
        index++
        continue
      }
      index++
      const firstMark = char as '^' | '_'
      const firstScript = readFormulaInlineScript(latex, index)
      const nextMark = latex[firstScript.nextIndex]
      const baseNode = nodeList.pop()!
      if (
        (nextMark === '^' || nextMark === '_') &&
        nextMark !== firstMark
      ) {
        const secondScript = readFormulaInlineScript(
          latex,
          firstScript.nextIndex + 1
        )
        const subscriptLatex =
          firstMark === '_' ? firstScript.content : secondScript.content
        const superscriptLatex =
          firstMark === '^' ? firstScript.content : secondScript.content
        nodeList.push(
          createFormulaInlineSubSupNode(
            baseNode,
            subscriptLatex,
            superscriptLatex
          )
        )
        index = secondScript.nextIndex
        continue
      }
      nodeList.push(createFormulaInlineScriptNode(baseNode, firstScript.content, firstMark))
      index = firstScript.nextIndex
      continue
    }
    textBuffer += char
    index++
  }
  flushText()
  return nodeList
}

/** 构建页面内公式可视编辑器，根节点和子节点共用同一套回写逻辑。 */
function buildFormulaInlineVisualEditor(
  latex: string,
  isRoot = true
): IFormulaInlineVisualNode {
  const container = document.createElement('span')
  container.classList.add(
    isRoot ? 'formula-inline-editor__input' : 'formula-inline-editor__group'
  )
  const nodeList = parseFormulaInlineVisualNodeList(latex)
  if (!nodeList.length) {
    // 空公式进入就地编辑时保留一个可输入字段，避免只有空浮层无法落焦。
    nodeList.push(createFormulaInlineTextNode(''))
  }
  nodeList.forEach(node => container.append(node.element))
  return {
    element: container,
    getLatex: () => nodeList.map(node => node.getLatex()).join(''),
    focus: () => {
      const firstField = container.querySelector<HTMLElement>(
        '.formula-inline-editor__field'
      )
      if (firstField) {
        focusFormulaInlineField(firstField)
      }
    }
  }
}

/** 读取编辑器内部 Draw 门面，用于 demo 层把鼠标坐标换算到公式元素位置。 */
function getInternalDraw(instance: Editor) {
  return (instance as unknown as { draw?: any }).draw
}

/** 根据鼠标事件解析被点击的公式控件。 */
function resolveFormulaInlineEditTarget(
  instance: Editor,
  evt: MouseEvent
): IFormulaInlineEditTarget | null {
  const debugFormulaClick = isFormulaDebugEnabled()
  const draw = getInternalDraw(instance)
  if (!draw) {
    if (debugFormulaClick) {
      logFormulaDebug('inline-edit-target', {
        reason: 'missing-draw',
        clientX: roundFormulaDebugNumber(evt.clientX),
        clientY: roundFormulaDebugNumber(evt.clientY)
      })
    }
    return null
  }
  const pagePoint = draw.getCoordinate().getPointerCoordinates(evt).page
  if (!pagePoint) {
    if (debugFormulaClick) {
      logFormulaDebug('inline-edit-target', {
        reason: 'missing-page-point',
        clientX: roundFormulaDebugNumber(evt.clientX),
        clientY: roundFormulaDebugNumber(evt.clientY)
      })
    }
    return null
  }
  const positionContext = draw.getCoordinate().getPositionByXY({
    x: pagePoint.x,
    y: pagePoint.y,
    pageNo: pagePoint.pageNo
  })
  if (debugFormulaClick) {
    logFormulaDebug('inline-click', {
      clientX: roundFormulaDebugNumber(evt.clientX),
      clientY: roundFormulaDebugNumber(evt.clientY),
      pageNo: pagePoint.pageNo,
      pageX: roundFormulaDebugNumber(pagePoint.x),
      pageY: roundFormulaDebugNumber(pagePoint.y),
      positionIndex: positionContext.index,
      hitTargetIndex: positionContext.hitTargetIndex,
      isFormulaEdgeHit: positionContext.isFormulaEdgeHit,
      isDirectHit: positionContext.isDirectHit
    })
  }
  if (positionContext.isFormulaEdgeHit) {
    if (debugFormulaClick) {
      logFormulaDebug('inline-edit-target', {
        reason: 'formula-edge-hit',
        pageNo: pagePoint.pageNo,
        pageX: roundFormulaDebugNumber(pagePoint.x),
        pageY: roundFormulaDebugNumber(pagePoint.y),
        positionIndex: positionContext.index,
        hitTargetIndex: positionContext.hitTargetIndex
      })
    }
    return null
  }
  const targetIndex = positionContext.hitTargetIndex ?? positionContext.index
  if (targetIndex < 0) {
    if (debugFormulaClick) {
      logFormulaDebug('inline-edit-target', {
        reason: 'invalid-target-index',
        pageNo: pagePoint.pageNo,
        pageX: roundFormulaDebugNumber(pagePoint.x),
        pageY: roundFormulaDebugNumber(pagePoint.y),
        positionIndex: positionContext.index,
        hitTargetIndex: positionContext.hitTargetIndex
      })
    }
    return null
  }
  const element =
    draw.getObjectResolver().getOriginalMainElementList()[targetIndex] ||
    positionContext.element
  if (element?.type !== ElementType.LATEX) {
    if (debugFormulaClick) {
      logFormulaDebug('inline-edit-target', {
        reason: 'not-latex',
        targetIndex,
        elementType: element?.type,
        elementValue: element?.value,
        pageNo: pagePoint.pageNo,
        pageX: roundFormulaDebugNumber(pagePoint.x),
        pageY: roundFormulaDebugNumber(pagePoint.y)
      })
    }
    return null
  }
  const position = draw
    .getCoordinate()
    .getMainPositionList()
    .find((item: any) => {
      return item.pageNo === pagePoint.pageNo && item.index === targetIndex
    })
  const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[pagePoint.pageNo]
  if (!position || !pageWrapper) {
    if (debugFormulaClick) {
      logFormulaDebug('inline-edit-target', {
        reason: !position ? 'missing-position' : 'missing-page-wrapper',
        targetIndex,
        elementId: element.id,
        latex: element.formula?.latex ?? element.value,
        pageNo: pagePoint.pageNo,
        pageX: roundFormulaDebugNumber(pagePoint.x),
        pageY: roundFormulaDebugNumber(pagePoint.y)
      })
    }
    return null
  }
  const { leftTop, rightTop, leftBottom, rightBottom } = position.coordinate
  const left = Math.min(leftTop[0], leftBottom[0], rightTop[0], rightBottom[0])
  const right = Math.max(leftTop[0], leftBottom[0], rightTop[0], rightBottom[0])
  const top = Math.min(leftTop[1], rightTop[1])
  const bottom = Math.max(leftBottom[1], rightBottom[1])
  if (debugFormulaClick) {
    logFormulaDebug('inline-edit-target', {
      reason: 'open',
      targetIndex,
      elementId: element.id,
      latex: element.formula?.latex ?? element.value,
      pageNo: pagePoint.pageNo,
      pageX: roundFormulaDebugNumber(pagePoint.x),
      pageY: roundFormulaDebugNumber(pagePoint.y),
      left: roundFormulaDebugNumber(left),
      right: roundFormulaDebugNumber(right),
      top: roundFormulaDebugNumber(top),
      bottom: roundFormulaDebugNumber(bottom),
      width: roundFormulaDebugNumber(right - left),
      height: roundFormulaDebugNumber(bottom - top)
    })
  }
  return {
    element,
    pageWrapper,
    left,
    top,
    // 页面内公式编辑器需要贴合公式本体，避免表现成下拉弹层。
    width: Math.max(44, right - left + 12),
    height: Math.max(24, bottom - top + 8)
  }
}

/** 打开页面内公式编辑器，按 WPS 类似的就地文本控件直接修改公式。 */
function openFormulaInlineEditor(
  instance: Editor,
  target: IFormulaInlineEditTarget
) {
  activeFormulaInlineEditorDispose?.()
  let isDisposed = false
  const panel = document.createElement('div')
  panel.classList.add('formula-inline-editor')
  panel.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
  panel.style.left = `${target.left}px`
  panel.style.top = `${Math.max(0, target.top - 2)}px`
  panel.style.minWidth = `${target.width}px`
  panel.style.minHeight = `${target.height}px`

  const visualEditor = buildFormulaInlineVisualEditor(getFormulaLatex(target.element))
  panel.append(visualEditor.element)
  if (isFormulaDebugEnabled()) {
    logFormulaDebug('inline-edit-open', {
      elementId: target.element.id,
      latex: target.element.formula?.latex ?? target.element.value,
      left: roundFormulaDebugNumber(target.left),
      top: roundFormulaDebugNumber(target.top),
      width: roundFormulaDebugNumber(target.width),
      height: roundFormulaDebugNumber(target.height)
    })
  }

  /** 销毁页面内编辑器，避免覆盖层残留到下一次编辑。 */
  const dispose = () => {
    if (isDisposed) return
    isDisposed = true
    document.removeEventListener('mousedown', handleOutsideMousedown, true)
    panel.remove()
    if (activeFormulaInlineEditorDispose === dispose) {
      activeFormulaInlineEditorDispose = null
    }
  }

  /** 提交页面内编辑内容并回写结构化公式模型。 */
  const commit = () => {
    if (isDisposed) return
    updateFormulaElement(instance, target.element, visualEditor.getLatex())
    dispose()
  }

  /** 点击编辑器外部时提交公式内容。 */
  function handleOutsideMousedown(evt: MouseEvent) {
    if (panel.contains(evt.target as Node)) return
    commit()
  }

  panel.addEventListener('mousedown', evt => evt.stopPropagation())
  panel.addEventListener('click', evt => evt.stopPropagation())
  panel.onkeydown = evt => {
    if (evt.key === 'Escape') {
      evt.preventDefault()
      dispose()
      return
    }
    if (evt.key === 'Enter' && (evt.ctrlKey || evt.metaKey)) {
      evt.preventDefault()
      commit()
    }
  }

  target.pageWrapper.append(panel)
  activeFormulaInlineEditorDispose = dispose
  window.setTimeout(() => {
    document.addEventListener('mousedown', handleOutsideMousedown, true)
    visualEditor.focus()
  })
}

/** 注册页面内公式点击编辑能力。 */
function setupFormulaInlineEditor(instance: Editor) {
  instance.eventBus.on('click', evt => {
    if ((evt.target as HTMLElement).closest('.formula-inline-editor')) return
    const target = resolveFormulaInlineEditTarget(instance, evt)
    if (!target) return
    openFormulaInlineEditor(instance, target)
  })
}

/** 渲染公式快捷下拉菜单，一级为类目，悬停类目展示二级具体公式。 */
function renderFormulaQuickMenu(
  root: HTMLDivElement,
  categoryList: IFormulaQuickCategory[]
) {
  const list = root.querySelector<HTMLUListElement>('ul')
  if (!list) return
  const clearActiveCategory = () => {
    root.querySelectorAll('.formula-menu-category.active').forEach(item => {
      item.classList.remove('active')
    })
  }
  list.querySelectorAll('[data-formula-category]').forEach(item => item.remove())
  categoryList.forEach(category => {
    const categoryItem = document.createElement('li')
    categoryItem.classList.add('formula-menu-category')
    categoryItem.dataset.formulaCategory = category.id
    const label = document.createElement('span')
    label.innerText = category.label
    const arrow = document.createElement('span')
    arrow.classList.add('formula-menu-category__arrow')
    arrow.innerText = '›'
    const subList = document.createElement('ul')
    subList.classList.add('formula-menu-sublist')
    category.itemList.forEach(item => {
      const formulaItem = document.createElement('li')
      formulaItem.dataset.formulaLatex = item.latex
      formulaItem.dataset.formulaDomainTags = item.domainTags?.join(',') || ''
      formulaItem.dataset.formulaSymbolIds = item.symbolIds?.join(',') || ''
      const itemLabel = document.createElement('span')
      itemLabel.classList.add('formula-menu-sublist__label')
      itemLabel.innerText = item.label
      const preview = document.createElement('span')
      preview.classList.add('formula-menu-sublist__preview')
      try {
        // 快捷菜单直接展示公式预览，避免用户只看到 LaTeX 原文无法判断具体含义。
        const { svg, width, height } = LaTexParticle.convertLaTextToSVG(item.latex)
        const image = document.createElement('img')
        image.src = svg
        image.alt = item.latex
        image.style.width = `${Math.max(1, width)}px`
        image.style.height = `${Math.max(1, height)}px`
        preview.append(image)
      } catch (error) {
        const fallback = document.createElement('code')
        fallback.innerText = item.latex
        preview.append(fallback)
      }
      formulaItem.append(itemLabel, preview)
      subList.append(formulaItem)
    })
    categoryItem.append(label, arrow, subList)
    categoryItem.onmouseenter = () => {
      clearActiveCategory()
      categoryItem.classList.add('active')
    }
    list.append(categoryItem)
  })
  root.onmouseleave = clearActiveCategory
}

/** 读取弹窗字段值，统一去掉首尾空格，避免控件业务标识写入不可见字符。 */
function getControlDialogValue(
  payload: { name: string; value: string }[],
  name: string
) {
  return payload.find(item => item.name === name)?.value.trim() || ''
}

/** 解析控件值集 JSON，失败时给出明确提示，避免插入不可用的选择控件。 */
function parseControlValueSets(value: string) {
  if (!value) return []
  try {
    const valueSets = JSON.parse(value)
    if (!Array.isArray(valueSets)) {
      window.alert('值集必须是数组')
      return null
    }
    return valueSets
  } catch (error) {
    window.alert('值集 JSON 解析失败')
    return null
  }
}

/** 生成控件通用配置字段，覆盖业务绑定、前后缀和必填规则。 */
function createControlCommonDialogData() {
  return [
    {
      type: 'text',
      label: '控件ID',
      name: 'controlId',
      placeholder: '可选，例如 patient-name'
    },
    {
      type: 'text',
      label: '概念ID',
      name: 'conceptId',
      placeholder: '可选，例如 patientName'
    },
    {
      type: 'text',
      label: '业务字段',
      name: 'externalId',
      placeholder: '可选，例如 patient.name'
    },
    {
      type: 'text',
      label: '前缀',
      name: 'prefix',
      value: '{',
      placeholder: '可选'
    },
    {
      type: 'text',
      label: '后缀',
      name: 'postfix',
      value: '}',
      placeholder: '可选'
    },
    {
      type: 'select',
      label: '必填',
      name: 'required',
      value: 'false',
      options: [
        {
          label: '否',
          value: 'false'
        },
        {
          label: '是',
          value: 'true'
        }
      ]
    }
  ]
}

/** 根据通用字段组装控件入口元素和控件基础属性。 */
function createControlElementFromDialog(
  payload: { name: string; value: string }[],
  control: IElement['control']
): IElement {
  const controlId = getControlDialogValue(payload, 'controlId')
  const conceptId = getControlDialogValue(payload, 'conceptId')
  const externalId = getControlDialogValue(payload, 'externalId')
  const prefix = getControlDialogValue(payload, 'prefix')
  const postfix = getControlDialogValue(payload, 'postfix')
  const required = getControlDialogValue(payload, 'required') === 'true'
  return {
    type: ElementType.CONTROL,
    value: '',
    ...(controlId ? { controlId } : {}),
    ...(externalId ? { externalId } : {}),
    control: {
      ...control!,
      ...(conceptId ? { conceptId } : {}),
      ...(prefix ? { prefix } : {}),
      ...(postfix ? { postfix } : {}),
      ...(required ? { required } : {})
    }
  }
}

/** 读取同步校验配置，当前 demo 用于文本、数值和手机号等业务字段。 */
function getControlValidateRules(payload: { name: string; value: string }[]) {
  const pattern = getControlDialogValue(payload, 'pattern')
  const message = getControlDialogValue(payload, 'validateMessage')
  return pattern
    ? [
        {
          pattern,
          message: message || '控件格式不正确'
        }
      ]
    : undefined
}

/** 生成控件业务融合手动测试文档，覆盖业务绑定、远程选项、校验高亮和 API 回填。 */
function createControlBusinessDemoElementList(): IElement[] {
  return [
    {
      value: '控件业务融合测试\n',
      size: 20,
      bold: true
    },
    {
      value: '患者姓名：'
    },
    {
      type: ElementType.CONTROL,
      value: '',
      controlId: 'demo-patient-name',
      externalId: 'patient.name',
      control: {
        type: ControlType.TEXT,
        value: null,
        placeholder: '请输入患者姓名',
        required: true,
        prefix: '{',
        postfix: '}'
      }
    },
    {
      value: '\n省份：'
    },
    {
      type: ElementType.CONTROL,
      value: '',
      controlId: 'demo-province',
      externalId: 'patient.province',
      control: {
        type: ControlType.SELECT,
        value: null,
        code: 'gd',
        placeholder: '请选择省份',
        prefix: '{',
        postfix: '}',
        valueSets: [
          {
            value: '广东',
            code: 'gd'
          },
          {
            value: '浙江',
            code: 'zj'
          }
        ]
      }
    },
    {
      value: '\n城市：'
    },
    {
      type: ElementType.CONTROL,
      value: '',
      controlId: 'demo-city',
      externalId: 'patient.city',
      control: {
        type: ControlType.SELECT,
        value: null,
        code: 'sz',
        placeholder: '请选择城市',
        prefix: '{',
        postfix: '}',
        valueSets: [],
        remote: {
          source: 'city-dict',
          loading: false
        }
      }
    },
    {
      value: '\n手机号：'
    },
    {
      type: ElementType.CONTROL,
      value: '',
      controlId: 'demo-phone',
      externalId: 'patient.phone',
      control: {
        type: ControlType.TEXT,
        value: [
          {
            value: '13800138000'
          }
        ],
        placeholder: '请输入手机号',
        validateRules: [
          {
            pattern: '^1\\d{10}$',
            message: '手机号格式不正确'
          }
        ],
        prefix: '{',
        postfix: '}'
      }
    },
    {
      value:
        '\n\n操作说明：点击顶部“API”控件按钮会重置到此文档，自动远程加载城市候选项，并对必填姓名执行高亮校验；控制台可查看 API 返回值。'
    }
  ]
}

export function setupInsertMenus(instance: Editor) {
  // 4. | 表格 | 图片 | 超链接 | 分割线 | 水印 | 代码块 | 分隔符 | 控件 | 复选框 | LaTeX | 日期选择器
  const tableDom = document.querySelector<HTMLDivElement>('.menu-item__table')!
  const tablePanelContainer = document.querySelector<HTMLDivElement>(
    '.menu-item__table__collapse'
  )!
  const tableClose = document.querySelector<HTMLDivElement>('.table-close')!
  const tableTitle = document.querySelector<HTMLDivElement>('.table-select')!
  const tablePanel = document.querySelector<HTMLDivElement>('.table-panel')!
  const tableDisplayInlineDom = document.querySelector<HTMLInputElement>(
    '.table-display-inline'
  )!
  // 绘制行列
  const tableCellList: HTMLDivElement[][] = []
  for (let i = 0; i < 10; i++) {
    const tr = document.createElement('tr')
    tr.classList.add('table-row')
    const trCellList: HTMLDivElement[] = []
    for (let j = 0; j < 10; j++) {
      const td = document.createElement('td')
      td.classList.add('table-cel')
      tr.append(td)
      trCellList.push(td)
    }
    tablePanel.append(tr)
    tableCellList.push(trCellList)
  }
  let colIndex = 0
  let rowIndex = 0
  // 移除所有格选择
  function removeAllTableCellSelect() {
    tableCellList.forEach(tr => {
      tr.forEach(td => td.classList.remove('active'))
    })
  }
  // 设置标题内容
  function setTableTitle(payload: string) {
    tableTitle.innerText = payload
  }
  // 恢复初始状态
  function recoveryTable() {
    // 还原选择样式、标题、选择行列
    removeAllTableCellSelect()
    setTableTitle('插入')
    colIndex = 0
    rowIndex = 0
    tableDisplayInlineDom.checked = false
    // 隐藏panel
    tablePanelContainer.style.display = 'none'
  }
  tableDom.onclick = function () {
    console.log('table')
    tablePanelContainer!.style.display = 'block'
  }
  tablePanel.onmousemove = function (evt) {
    const celSize = 16
    const rowMarginTop = 10
    const celMarginRight = 6
    const { offsetX, offsetY } = evt
    // 移除所有选择
    removeAllTableCellSelect()
    colIndex = Math.ceil(offsetX / (celSize + celMarginRight)) || 1
    rowIndex = Math.ceil(offsetY / (celSize + rowMarginTop)) || 1
    // 改变选择样式
    tableCellList.forEach((tr, trIndex) => {
      tr.forEach((td, tdIndex) => {
        if (tdIndex < colIndex && trIndex < rowIndex) {
          td.classList.add('active')
        }
      })
    })
    // 改变表格标题
    setTableTitle(`${rowIndex}×${colIndex}`)
  }
  tableClose.onclick = function () {
    recoveryTable()
  }
  tablePanel.onclick = function () {
    // 应用选择
    instance.command.executeInsertTable(rowIndex, colIndex, {
      tableDisplay: tableDisplayInlineDom.checked
        ? TableDisplay.INLINE
        : TableDisplay.BLOCK
    })
    recoveryTable()
  }

  const imageDom = document.querySelector<HTMLDivElement>('.menu-item__image')!
  const imageFileDom = document.querySelector<HTMLInputElement>('#image')!
  imageDom.onclick = function () {
    imageFileDom.click()
  }
  imageFileDom.onchange = function () {
    const file = imageFileDom.files![0]!
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)
    fileReader.onload = function () {
      // 计算宽高
      const image = new Image()
      const value = fileReader.result as string
      image.src = value
      image.onload = function () {
        instance.command.executeImage({
          value,
          width: image.width,
          height: image.height
        })
        imageFileDom.value = ''
      }
    }
  }

  const hyperlinkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__hyperlink'
  )!
  hyperlinkDom.onclick = function () {
    console.log('hyperlink')
    new Dialog({
      title: '超链接',
      data: [
        {
          type: 'text',
          label: '文本',
          name: 'name',
          required: true,
          placeholder: '请输入文本',
          value: instance.command.getRangeText()
        },
        {
          type: 'text',
          label: '链接',
          name: 'url',
          required: true,
          placeholder: '请输入链接'
        }
      ],
      onConfirm: payload => {
        const name = payload.find(p => p.name === 'name')?.value
        if (!name) return
        const url = payload.find(p => p.name === 'url')?.value
        if (!url) return
        instance.command.executeHyperlink({
          type: ElementType.HYPERLINK,
          value: '',
          url,
          valueList: splitText(name).map(n => ({
            value: n,
            size: 16
          }))
        })
      }
    })
  }

  const separatorDom = document.querySelector<HTMLDivElement>(
    '.menu-item__separator'
  )!
  const separatorOptionDom =
    separatorDom.querySelector<HTMLDivElement>('.options')!
  separatorDom.onclick = function () {
    console.log('separator')
    separatorOptionDom.classList.toggle('visible')
  }
  separatorOptionDom.onmousedown = function (evt) {
    let payload: number[] = []
    const li = evt.target as HTMLLIElement
    const separatorDash = li.dataset.separator?.split(',').map(Number)
    if (separatorDash) {
      const isSingleLine = separatorDash.every(d => d === 0)
      if (!isSingleLine) {
        payload = separatorDash
      }
    }
    instance.command.executeSeparator(payload)
  }

  const pageBreakDom = document.querySelector<HTMLDivElement>(
    '.menu-item__page-break'
  )!
  pageBreakDom.onclick = function () {
    console.log('pageBreak')
    instance.command.executePageBreak()
  }

  const watermarkDom = document.querySelector<HTMLDivElement>(
    '.menu-item__watermark'
  )!
  const watermarkOptionDom =
    watermarkDom.querySelector<HTMLDivElement>('.options')!
  watermarkDom.onclick = function () {
    console.log('watermark')
    watermarkOptionDom.classList.toggle('visible')
  }
  watermarkOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const menu = li.dataset.menu!
    watermarkOptionDom.classList.toggle('visible')
    if (menu === 'add') {
      new Dialog({
        title: '水印',
        data: [
          {
            type: 'text',
            label: '内容',
            name: 'data',
            required: true,
            placeholder: '请输入内容'
          },
          {
            type: 'color',
            label: '颜色',
            name: 'color',
            required: true,
            value: '#AEB5C0'
          },
          {
            type: 'number',
            label: '字体大小',
            name: 'size',
            required: true,
            value: '120'
          },
          {
            type: 'number',
            label: '透明度',
            name: 'opacity',
            required: true,
            value: '0.3'
          },
          {
            type: 'select',
            label: '重复',
            name: 'repeat',
            value: '0',
            required: false,
            options: [
              {
                label: '不重复',
                value: '0'
              },
              {
                label: '重复',
                value: '1'
              }
            ]
          },
          {
            type: 'number',
            label: '水平间隔',
            name: 'horizontalGap',
            required: false,
            value: '10'
          },
          {
            type: 'number',
            label: '垂直间隔',
            name: 'verticalGap',
            required: false,
            value: '10'
          }
        ],
        onConfirm: payload => {
          const nullableIndex = payload.findIndex(p => !p.value)
          if (~nullableIndex) return
          const watermark = payload.reduce((pre, cur) => {
            pre[cur.name] = cur.value
            return pre
          }, <any>{})
          const repeat = watermark.repeat === '1'
          instance.command.executeAddWatermark({
            data: watermark.data,
            color: watermark.color,
            size: Number(watermark.size),
            opacity: Number(watermark.opacity),
            repeat,
            gap:
              repeat && watermark.horizontalGap && watermark.verticalGap
                ? [
                    Number(watermark.horizontalGap),
                    Number(watermark.verticalGap)
                  ]
                : undefined
          })
        }
      })
    } else {
      instance.command.executeDeleteWatermark()
    }
  }

  const codeblockDom = document.querySelector<HTMLDivElement>(
    '.menu-item__codeblock'
  )!
  codeblockDom.onclick = function () {
    console.log('codeblock')
    new Dialog({
      title: '代码块',
      data: [
        {
          type: 'textarea',
          name: 'codeblock',
          placeholder: '请输入代码',
          width: 500,
          height: 300
        }
      ],
      onConfirm: payload => {
        const codeblock = payload.find(p => p.name === 'codeblock')?.value
        if (!codeblock) return
        const codeblockExtension = 'codeblock'
        const tokenList = prism.tokenize(codeblock, prism.languages.javascript)
        const formatTokenList = formatPrismToken(tokenList)
        const elementList: IElement[] = []
        for (let i = 0; i < formatTokenList.length; i++) {
          const formatToken = formatTokenList[i]
          const tokenStringList = splitText(formatToken.content)
          for (let j = 0; j < tokenStringList.length; j++) {
            const value = tokenStringList[j]
            const element: IElement = {
              value,
              extension: codeblockExtension
            }
            if (formatToken.color) {
              element.color = formatToken.color
            }
            if (formatToken.bold) {
              element.bold = true
            }
            if (formatToken.italic) {
              element.italic = true
            }
            elementList.push(element)
          }
        }
        elementList.unshift({
          value: '\n',
          extension: codeblockExtension
        })
        instance.command.executeInsertElementList(elementList)
      }
    })
  }

  const controlDom = document.querySelector<HTMLDivElement>(
    '.menu-item__control'
  )!
  const controlOptionDom = controlDom.querySelector<HTMLDivElement>('.options')!
  controlDom.onclick = function () {
    console.log('control')
    controlOptionDom.classList.toggle('visible')
  }
  controlOptionDom.onmousedown = function (evt) {
    controlOptionDom.classList.toggle('visible')
    const li = evt.target as HTMLLIElement
    const type = <ControlType>li.dataset.control
    const valueSetPlaceholder = `请输入值集JSON，例：\n[{\n  "value": "有",\n  "code": "yes"\n}]`
    switch (type) {
      case ControlType.TEXT:
      case ControlType.NUMBER:
        new Dialog({
          title: type === ControlType.TEXT ? '文本控件' : '数值控件',
          data: [
            ...createControlCommonDialogData(),
            {
              type: 'text',
              label: '占位符',
              name: 'placeholder',
              required: true,
              placeholder: '请输入占位符'
            },
            {
              type: 'text',
              label: '默认值',
              name: 'value',
              placeholder: '请输入默认值'
            },
            {
              type: 'text',
              label: '正则校验',
              name: 'pattern',
              value: type === ControlType.NUMBER ? '^-?\\d+(\\.\\d+)?$' : '',
              placeholder: '可选，例如 ^1\\d{10}$'
            },
            {
              type: 'text',
              label: '失败提示',
              name: 'validateMessage',
              value: type === ControlType.NUMBER ? '请输入合法数值' : '',
              placeholder: '可选，例如 手机号格式不正确'
            }
          ],
          onConfirm: payload => {
            const placeholder = getControlDialogValue(payload, 'placeholder')
            if (!placeholder) return
            const value = getControlDialogValue(payload, 'value')
            instance.command.executeInsertControl(
              createControlElementFromDialog(payload, {
                type,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder,
                validateRules: getControlValidateRules(payload)
              })
            )
          }
        })
        break
      case ControlType.SELECT:
        new Dialog({
          title: '下拉控件',
          data: [
            ...createControlCommonDialogData(),
            {
              type: 'text',
              label: '占位符',
              name: 'placeholder',
              required: true,
              placeholder: '请输入占位符'
            },
            {
              type: 'text',
              label: '默认编码',
              name: 'code',
              placeholder: '请输入默认 code'
            },
            {
              type: 'textarea',
              label: '值集',
              name: 'valueSets',
              required: true,
              height: 110,
              placeholder: valueSetPlaceholder
            },
            {
              type: 'text',
              label: '远程源',
              name: 'remoteSource',
              placeholder: '可选，例如 city-dict'
            }
          ],
          onConfirm: payload => {
            const placeholder = getControlDialogValue(payload, 'placeholder')
            if (!placeholder) return
            const valueSets = parseControlValueSets(
              getControlDialogValue(payload, 'valueSets')
            )
            if (!valueSets) return
            const code = getControlDialogValue(payload, 'code')
            const remoteSource = getControlDialogValue(payload, 'remoteSource')
            instance.command.executeInsertControl(
              createControlElementFromDialog(payload, {
                type,
                code,
                value: null,
                placeholder,
                valueSets,
                ...(remoteSource
                  ? {
                      remote: {
                        source: remoteSource,
                        loading: false
                      }
                    }
                  : {})
              })
            )
          }
        })
        break
      case ControlType.CHECKBOX:
      case ControlType.RADIO:
        new Dialog({
          title: type === ControlType.CHECKBOX ? '复选框控件' : '单选框控件',
          data: [
            ...createControlCommonDialogData(),
            {
              type: 'text',
              label: '默认编码',
              name: 'code',
              placeholder:
                type === ControlType.CHECKBOX
                  ? '多个值以英文逗号分割'
                  : '请输入默认 code'
            },
            {
              type: 'textarea',
              label: '值集',
              name: 'valueSets',
              required: true,
              height: 110,
              placeholder: valueSetPlaceholder
            }
          ],
          onConfirm: payload => {
            const valueSets = parseControlValueSets(
              getControlDialogValue(payload, 'valueSets')
            )
            if (!valueSets) return
            const code = getControlDialogValue(payload, 'code')
            instance.command.executeInsertControl(
              createControlElementFromDialog(payload, {
                type,
                code,
                value: null,
                valueSets
              })
            )
          }
        })
        break
      case ControlType.DATE:
        new Dialog({
          title: '日期控件',
          data: [
            ...createControlCommonDialogData(),
            {
              type: 'text',
              label: '占位符',
              name: 'placeholder',
              required: true,
              placeholder: '请输入占位符'
            },
            {
              type: 'text',
              label: '默认值',
              name: 'value',
              placeholder: '请输入默认值'
            },
            {
              type: 'select',
              label: '日期格式',
              name: 'dateFormat',
              value: 'yyyy-MM-dd hh:mm:ss',
              required: true,
              options: [
                {
                  label: 'yyyy',
                  value: 'yyyy'
                },
                {
                  label: 'yyyy-MM',
                  value: 'yyyy-MM'
                },
                {
                  label: 'yyyy-MM-dd hh:mm:ss',
                  value: 'yyyy-MM-dd hh:mm:ss'
                },
                {
                  label: 'yyyy-MM-dd',
                  value: 'yyyy-MM-dd'
                }
              ]
            }
          ],
          onConfirm: payload => {
            const placeholder = getControlDialogValue(payload, 'placeholder')
            if (!placeholder) return
            const value = getControlDialogValue(payload, 'value')
            const dateFormat = getControlDialogValue(payload, 'dateFormat')
            instance.command.executeInsertControl(
              createControlElementFromDialog(payload, {
                type,
                dateFormat,
                value: value
                  ? [
                      {
                        value
                      }
                    ]
                  : null,
                placeholder
              })
            )
          }
        })
        break
      default:
        break
    }
  }

  const controlBusinessDom = document.querySelector<HTMLDivElement>(
    '.menu-item__control-business'
  )!
  controlBusinessDom.onclick = async function () {
    console.log('control-business-demo')
    instance.command.executeUpdateOptions({
      controlRemoteOptionLoader: async ({ option }) => {
        // 模拟业务远程字典接口，手动测试时可在控制台观察 loading/error/requestId 状态。
        await new Promise(resolve => window.setTimeout(resolve, 200))
        if (option.source !== 'city-dict') {
          throw new Error('未知远程字典')
        }
        const province = (option.params as { province?: string } | undefined)
          ?.province
        return {
          valueSets:
            province === 'zj'
              ? [
                  {
                    value: '杭州',
                    code: 'hz'
                  },
                  {
                    value: '宁波',
                    code: 'nb'
                  }
                ]
              : [
                  {
                    value: '深圳',
                    code: 'sz'
                  },
                  {
                    value: '广州',
                    code: 'gz'
                  }
                ],
          remote: {
            source: option.source,
            requestId: option.requestId
          }
        }
      }
    })
    instance.command.executeSetValue({
      main: createControlBusinessDemoElementList()
    })
    const remoteResult =
      await instance.command.executeLoadControlRemoteOptions({
        externalId: 'patient.city',
        source: 'city-dict',
        requestId: `demo-city-${Date.now()}`,
        params: {
          province: 'gd'
        },
        isSubmitHistory: false
      })
    const validateResult = instance.command.executeValidateControl({
      isApplyHighlight: true,
      highlightColor: '#ff4d4f',
      highlightAlpha: 0.28
    })
    console.log('控件远程选项加载结果：', remoteResult)
    console.log('控件校验结果：', validateResult)
    window.alert(
      `控件业务融合测试已加载。\n远程选项成功数：${remoteResult.successCount}\n校验失败数：${validateResult.failureList.length}\n姓名为空会被红色高亮。`
    )
  }

  const checkboxDom = document.querySelector<HTMLDivElement>(
    '.menu-item__checkbox'
  )!
  checkboxDom.onclick = function () {
    console.log('checkbox')
    instance.command.executeInsertElementList([
      {
        type: ElementType.CHECKBOX,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const radioDom = document.querySelector<HTMLDivElement>('.menu-item__radio')!
  radioDom.onclick = function () {
    console.log('radio')
    instance.command.executeInsertElementList([
      {
        type: ElementType.RADIO,
        checkbox: {
          value: false
        },
        value: ''
      }
    ])
  }

  const latexDom = document.querySelector<HTMLDivElement>('.menu-item__latex')!
  const latexOptionDom =
    latexDom.querySelector<HTMLDivElement>('.formula-menu-options')!
  renderFormulaQuickMenu(
    latexOptionDom,
    createFormulaQuickCategoryList(instance.command.getFormulaSymbolList())
  )
  /** 隐藏公式快捷菜单并清理当前悬停类目，避免下次打开残留二级菜单。 */
  const hideFormulaQuickMenu = () => {
    latexOptionDom.classList.remove('visible')
    latexOptionDom
      .querySelectorAll('.formula-menu-category.active')
      .forEach(item => item.classList.remove('active'))
  }
  latexDom.onclick = function (evt) {
    evt.stopPropagation()
    latexOptionDom.classList.toggle('visible')
    // 公式菜单靠近工具栏右侧时自动向左展开，避免常用公式项被窗口裁切。
    const bodyRect = document.body.getBoundingClientRect()
    const optionRect = latexOptionDom.getBoundingClientRect()
    if (optionRect.left + optionRect.width > bodyRect.width) {
      latexOptionDom.style.right = '0px'
      latexOptionDom.style.left = 'unset'
    } else {
      latexOptionDom.style.right = 'unset'
      latexOptionDom.style.left = '0px'
    }
    // 二级公式列表优先向右展开，右侧空间不足且左侧足够时改向左展开。
    latexOptionDom.classList.toggle(
      'formula-menu-options--submenu-left',
      optionRect.left + optionRect.width + 280 > bodyRect.width &&
        optionRect.left > 280
    )
  }
  latexOptionDom.onclick = evt => {
    evt.stopPropagation()
    const item = (evt.target as HTMLElement).closest<HTMLLIElement>('li')
    if (!item) return
    const action = item.dataset.formulaAction
    if (action === 'custom') {
      hideFormulaQuickMenu()
      openFormulaDialog(instance)
      return
    }
    if (action === 'blank') {
      hideFormulaQuickMenu()
      insertFormulaElement(instance)
      return
    }
    const latex = item.dataset.formulaLatex
    if (latex) {
      hideFormulaQuickMenu()
      insertFormulaElement(instance, latex, {
        domainTags: item.dataset.formulaDomainTags
          ?.split(',')
          .filter(Boolean) as FormulaDomain[] | undefined,
        symbolIds: item.dataset.formulaSymbolIds?.split(',').filter(Boolean)
      })
    }
  }
  document.addEventListener('click', () => {
    hideFormulaQuickMenu()
  })
  setupFormulaInlineEditor(instance)
  instance.register.contextMenuList([
    {
      key: 'formula-edit',
      name: '编辑公式',
      when: payload => {
        return (
          !payload.isReadonly &&
          !payload.editorHasSelection &&
          payload.startElement?.type === ElementType.LATEX
        )
      },
      callback: (_command, context) => {
        if (!context.startElement) return
        openFormulaDialog(instance, {
          editElement: context.startElement
        })
      }
    }
  ])

  const dateDom = document.querySelector<HTMLDivElement>('.menu-item__date')!
  const dateDomOptionDom = dateDom.querySelector<HTMLDivElement>('.options')!
  dateDom.onclick = function () {
    console.log('date')
    dateDomOptionDom.classList.toggle('visible')
    // 定位调整
    const bodyRect = document.body.getBoundingClientRect()
    const dateDomOptionRect = dateDomOptionDom.getBoundingClientRect()
    if (dateDomOptionRect.left + dateDomOptionRect.width > bodyRect.width) {
      dateDomOptionDom.style.right = '0px'
      dateDomOptionDom.style.left = 'unset'
    } else {
      dateDomOptionDom.style.right = 'unset'
      dateDomOptionDom.style.left = '0px'
    }
    // 当前日期
    const date = new Date()
    const year = date.getFullYear().toString()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    const yearMonthString = `${year}-${month}`
    const dateString = `${year}-${month}-${day}`
    const dateTimeString = `${dateString} ${hour}:${minute}:${second}`
    dateDomOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => {
        if (li.dataset.format === 'yyyy') {
          li.innerText = year
        } else if (li.dataset.format === 'yyyy-MM') {
          li.innerText = yearMonthString
        } else if (li.dataset.format === 'yyyy-MM-dd') {
          li.innerText = dateString
        } else if (li.dataset.format === 'yyyy-MM-dd hh:mm:ss') {
          li.innerText = dateTimeString
        }
      })
  }
  dateDomOptionDom.onmousedown = function (evt) {
    const li = evt.target as HTMLLIElement
    const dateFormat = li.dataset.format!
    dateDomOptionDom.classList.toggle('visible')
    instance.command.executeInsertElementList([
      {
        type: ElementType.DATE,
        value: '',
        dateFormat,
        valueList: [
          {
            value: li.innerText.trim()
          }
        ]
      }
    ])
  }

  const blockDom = document.querySelector<HTMLDivElement>('.menu-item__block')!
  blockDom.onclick = function () {
    console.log('block')
    new Dialog({
      title: '内容块',
      data: [
        {
          type: 'select',
          label: '类型',
          name: 'type',
          value: 'iframe',
          required: true,
          options: [
            {
              label: '网址',
              value: 'iframe'
            },
            {
              label: '视频',
              value: 'video'
            }
          ]
        },
        {
          type: 'number',
          label: '宽度',
          name: 'width',
          placeholder: '请输入宽度（默认页面内宽度）'
        },
        {
          type: 'number',
          label: '高度',
          name: 'height',
          required: true,
          placeholder: '请输入高度'
        },
        {
          type: 'input',
          label: '地址',
          name: 'src',
          required: false,
          placeholder: '请输入地址'
        },
        {
          type: 'textarea',
          label: 'HTML',
          height: 100,
          name: 'srcdoc',
          required: false,
          placeholder: '请输入HTML代码（仅网址类型有效）'
        }
      ],
      onConfirm: payload => {
        const type = payload.find(p => p.name === 'type')?.value
        if (!type) return
        const width = payload.find(p => p.name === 'width')?.value
        const height = payload.find(p => p.name === 'height')?.value
        if (!height) return
        // 地址或HTML代码至少存在一项
        const src = payload.find(p => p.name === 'src')?.value
        const srcdoc = payload.find(p => p.name === 'srcdoc')?.value
        const block: IBlock = {
          type: <BlockType>type
        }
        if (block.type === BlockType.IFRAME) {
          if (!src && !srcdoc) return
          block.iframeBlock = {
            src,
            srcdoc
          }
        } else if (block.type === BlockType.VIDEO) {
          if (!src) return
          block.videoBlock = {
            src
          }
        }
        const blockElement: IElement = {
          type: ElementType.BLOCK,
          value: '',
          height: Number(height),
          block
        }
        if (width) {
          blockElement.width = Number(width)
        }
        instance.command.executeInsertElementList([blockElement])
      }
    })
  }

  return {
    separatorDom,
    separatorOptionDom
  }
}
