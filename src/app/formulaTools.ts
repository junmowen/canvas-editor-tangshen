import { Dialog } from '../components/dialog/Dialog'
import { ElementType } from '../editor'
import {
  FORMULA_EMPTY_PLACEHOLDER_COLOR,
  FORMULA_EMPTY_PLACEHOLDER_TEXT
} from '../editor/core/modules/formula/model/FormulaTextModel'
import type { IElement, IFormulaNode, IRange } from '../editor'
import type { FormulaDomain, IFormulaSymbol } from '../editor'
import type { IRegisterContextMenu } from '../editor/interface/contextmenu/ContextMenu'
import type { CanvasEditorAppContext } from './types'

export const APP_FORMULA_TEMPLATES = [
  { label: '分式', value: 'template:fraction', latex: '\\frac{a}{b}' },
  { label: '根式', value: 'template:sqrt', latex: '\\sqrt{x}' },
  { label: '上标', value: 'template:superscript', latex: 'x^{2}' },
  { label: '下标', value: 'template:subscript', latex: 'A_{i}' },
  { label: '上下标', value: 'template:subsup', latex: 'A_{i}^{2}' },
  {
    label: '矩阵',
    value: 'template:matrix',
    latex: '\\begin{matrix}a&b\\\\c&d\\end{matrix}'
  }
]

const FORMULA_DOMAIN_LABEL_MAP: Record<FormulaDomain, string> = {
  math: '数学',
  physics: '物理',
  chemistry: '化学',
  hospital: '医院',
  factory: '工厂'
}

function getDialogValue(
  payload: { name: string; value: string }[],
  name: string
) {
  return payload.find(item => item.name === name)?.value.trim() || ''
}

function createFormulaTextNode(value: string): IFormulaNode {
  return {
    type: 'text',
    value
  }
}

function createFormulaAstFromLatex(latex: string): IFormulaNode {
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

function createFormulaId() {
  return `formula-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getFormulaLatex(element?: IElement | null) {
  return element?.formula?.latex ?? element?.value ?? ''
}

function getFallbackInsertRange(ctx: CanvasEditorAppContext): IRange {
  const main = ctx.editor.command.getValue().data.main
  const index = Math.max(0, main.length - 1)
  return {
    startIndex: index,
    endIndex: index
  }
}

function normalizeInsertRange(
  ctx: CanvasEditorAppContext,
  range: IRange
): IRange {
  if (Number.isInteger(range.startIndex) && range.startIndex >= 0) {
    return range
  }
  return getFallbackInsertRange(ctx)
}

function restoreInsertRange(ctx: CanvasEditorAppContext, range: IRange) {
  ctx.editor.command.executeSetRange(
    range.startIndex,
    range.endIndex,
    range.tableId,
    range.startTdIndex,
    range.endTdIndex,
    range.startTrIndex,
    range.endTrIndex
  )
}

export function createFormulaElement(
  latex: string,
  options: {
    id?: string
    formulaId?: string
    displayMode?: 'inline' | 'block'
    domainTags?: FormulaDomain[]
    symbolIds?: string[]
  } = {}
): IElement {
  const id = options.id || createFormulaId()
  const formulaId = options.formulaId || id
  return {
    id,
    type: ElementType.LATEX,
    value: latex,
    formula: {
      id: formulaId,
      displayMode: options.displayMode || 'inline',
      sourceFormat: 'latex',
      latex,
      placeholderLatex: '\\Box',
      placeholderText: FORMULA_EMPTY_PLACEHOLDER_TEXT,
      placeholderColor: FORMULA_EMPTY_PLACEHOLDER_COLOR,
      ast: createFormulaAstFromLatex(latex),
      domainTags: options.domainTags || [],
      symbolIds: options.symbolIds || []
    }
  }
}

export function insertFormulaElement(
  ctx: CanvasEditorAppContext,
  latex = '',
  displayMode: 'inline' | 'block' = 'inline',
  options: {
    domainTags?: FormulaDomain[]
    symbolIds?: string[]
  } = {}
) {
  restoreInsertRange(
    ctx,
    normalizeInsertRange(ctx, ctx.editor.command.getRange())
  )
  ctx.editor.command.executeInsertElementList([
    createFormulaElement(latex, {
      displayMode,
      domainTags: options.domainTags,
      symbolIds: options.symbolIds
    })
  ])
}

function createFormulaPickerButton(label: string, onClick: () => void) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.onclick = onClick
  return button
}

function groupFormulaSymbols(symbolList: IFormulaSymbol[]) {
  return symbolList.reduce<Record<FormulaDomain, IFormulaSymbol[]>>(
    (groupMap, symbol) => {
      groupMap[symbol.domain].push(symbol)
      return groupMap
    },
    {
      math: [],
      physics: [],
      chemistry: [],
      hospital: [],
      factory: []
    }
  )
}

export function openFormulaPicker(ctx: CanvasEditorAppContext) {
  const existingPicker = ctx.root.querySelector<HTMLElement>(
    '.ce-app-formula-picker'
  )
  if (existingPicker) {
    existingPicker.classList.add('is-visible')
    return
  }
  const picker = document.createElement('div')
  picker.className = 'ce-app-formula-picker is-visible'

  const header = document.createElement('div')
  header.className = 'ce-app-formula-picker__header'
  const title = document.createElement('span')
  title.textContent = '公式'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'x'
  closeButton.onclick = () => picker.remove()
  header.append(title, closeButton)

  const actions = document.createElement('div')
  actions.className = 'ce-app-formula-picker__actions'
  actions.append(
    createFormulaPickerButton('空白公式', () => {
      insertFormulaElement(ctx)
      picker.remove()
    }),
    createFormulaPickerButton('自定义公式', () => {
      picker.remove()
      openFormulaDialog(ctx)
    })
  )

  const templateSection = document.createElement('section')
  templateSection.className = 'ce-app-formula-picker__section'
  const templateTitle = document.createElement('h4')
  templateTitle.textContent = '常用模板'
  const templateList = document.createElement('div')
  templateList.className = 'ce-app-formula-picker__list'
  APP_FORMULA_TEMPLATES.forEach(template => {
    templateList.append(
      createFormulaPickerButton(template.label, () => {
        insertFormulaElement(ctx, template.latex)
        picker.remove()
      })
    )
  })
  templateSection.append(templateTitle, templateList)

  const symbolSection = document.createElement('section')
  symbolSection.className = 'ce-app-formula-picker__section'
  const symbolTitle = document.createElement('h4')
  symbolTitle.textContent = '专业符号'
  symbolSection.append(symbolTitle)
  const groupedSymbolMap = groupFormulaSymbols(
    ctx.editor.command.getFormulaSymbolList()
  )
  Object.entries(groupedSymbolMap).forEach(([domain, symbolList]) => {
    if (!symbolList.length) return
    const domainTitle = document.createElement('div')
    domainTitle.className = 'ce-app-formula-picker__domain'
    domainTitle.textContent =
      FORMULA_DOMAIN_LABEL_MAP[domain as FormulaDomain] || domain
    const symbolListNode = document.createElement('div')
    symbolListNode.className = 'ce-app-formula-picker__list'
    symbolList.slice(0, 24).forEach(symbol => {
      symbolListNode.append(
        createFormulaPickerButton(symbol.label, () => {
          insertFormulaElement(ctx, symbol.latex, 'inline', {
            domainTags: [symbol.domain],
            symbolIds: [symbol.id]
          })
          picker.remove()
        })
      )
    })
    symbolSection.append(domainTitle, symbolListNode)
  })

  picker.append(header, actions, templateSection, symbolSection)
  picker.onclick = evt => evt.stopPropagation()
  ctx.root.append(picker)
}

export function openFormulaDialog(
  ctx: CanvasEditorAppContext,
  options: {
    editElement?: IElement
  } = {}
) {
  const { editElement } = options
  const insertRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
  new Dialog({
    title: editElement ? '编辑公式' : '自定义公式',
    data: [
      {
        type: 'select',
        label: '显示',
        name: 'displayMode',
        value: editElement?.formula?.displayMode || 'inline',
        options: [
          { label: '行内公式', value: 'inline' },
          { label: '独立公式', value: 'block' }
        ]
      },
      {
        type: 'textarea',
        label: 'LaTeX',
        name: 'latex',
        value: getFormulaLatex(editElement) || '\\frac{a}{b}',
        required: true,
        width: 500,
        height: 160,
        placeholder: '请输入 LaTeX'
      }
    ],
    onConfirm: payload => {
      const latex = getDialogValue(payload, 'latex')
      if (!latex) return
      const formulaElement = createFormulaElement(latex, {
        id: editElement?.id,
        formulaId: editElement?.formula?.id || editElement?.id,
        displayMode:
          getDialogValue(payload, 'displayMode') === 'block'
            ? 'block'
            : 'inline'
      })
      if (editElement?.id) {
        ctx.editor.command.executeUpdateElementById({
          id: editElement.id,
          properties: {
            type: ElementType.LATEX,
            value: formulaElement.value,
            formula: formulaElement.formula
          }
        })
        return
      }
      restoreInsertRange(ctx, insertRange)
      ctx.editor.command.executeInsertElementList([formulaElement])
    }
  })
}

export function handleFormulaMenu(
  ctx: CanvasEditorAppContext,
  payload?: string | number
) {
  const value = String(payload || 'blank')
  if (value === 'custom') {
    openFormulaDialog(ctx)
    return
  }
  if (value === 'blank') {
    insertFormulaElement(ctx)
    return
  }
  const template = APP_FORMULA_TEMPLATES.find(item => item.value === value)
  if (template) {
    insertFormulaElement(ctx, template.latex)
  }
}

export function getFormulaContextMenus(
  ctx: CanvasEditorAppContext
): IRegisterContextMenu[] {
  return [
    {
      key: 'formula-edit',
      name: '编辑公式',
      when: payload =>
        !payload.isReadonly &&
        !payload.editorHasSelection &&
        payload.startElement?.type === ElementType.LATEX,
      callback: (_command, context) => {
        if (!context.startElement) return
        openFormulaDialog(ctx, {
          editElement: context.startElement
        })
      }
    }
  ]
}
