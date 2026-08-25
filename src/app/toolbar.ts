import {
  BlockType,
  ElementType,
  FlexDirection,
  ImageDisplay,
  ListStyle,
  ListType,
  RowFlex,
  splitText,
  TableDisplay,
  TitleLevel,
  TextDecorationStyle,
  ControlType
} from '../editor'
import type { IBlock, IElement, IRange, ITabStop } from '../editor'
import type { IRowIndentPayload } from '../editor/interface/Element'
import type { IPageColumns } from '../editor/interface/PageColumns'
import prism from 'prismjs'
import { Dialog } from '../components/dialog/Dialog'
import { formatPrismToken } from '../demo/utils/prism'
import { openFormulaPicker } from './formulaTools'
import type {
  CanvasEditorAppContext,
  CanvasEditorAppPreset,
  ToolbarItem,
  ToolbarPatch
} from './types'

const FONT_OPTIONS = [
  { label: '微软雅黑', value: 'Microsoft YaHei' },
  { label: '华文宋体', value: '华文宋体' },
  { label: '华文黑体', value: '华文黑体' },
  { label: '华文仿宋', value: '华文仿宋' },
  { label: '华文楷体', value: '华文楷体' },
  { label: '华文琥珀', value: '华文琥珀' },
  { label: '华文隶书', value: '华文隶书' },
  { label: '华文新魏', value: '华文新魏' },
  { label: '华文行楷', value: '华文行楷' },
  { label: '华文中宋', value: '华文中宋' },
  { label: '华文彩云', value: '华文彩云' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Segoe UI', value: 'Segoe UI' },
  { label: 'Ink Free', value: 'Ink Free' },
  { label: 'Fantasy', value: 'Fantasy' }
]

const SIZE_OPTIONS = [
  { label: '初号', value: 56 },
  { label: '小初', value: 48 },
  { label: '一号', value: 34 },
  { label: '小一', value: 32 },
  { label: '二号', value: 29 },
  { label: '小二', value: 24 },
  { label: '三号', value: 21 },
  { label: '小三', value: 20 },
  { label: '四号', value: 18 },
  { label: '小四', value: 16 },
  { label: '五号', value: 14 },
  { label: '小五', value: 12 },
  { label: '六号', value: 10 },
  { label: '小六', value: 8 },
  { label: '七号', value: 7 },
  { label: '八号', value: 6 }
]

const DEFAULT_CONTROL_VALUE_SETS = JSON.stringify(
  [
    { value: '选项一', code: 'one' },
    { value: '选项二', code: 'two' }
  ],
  null,
  2
)

const TAB_STOPS_RULER_MAX_POSITION = 240
const TAB_STOPS_RULER_DUPLICATE_DISTANCE = 4
const TAB_STOP_ALIGNMENTS: Array<NonNullable<ITabStop['alignment']>> = [
  'left',
  'right',
  'center',
  'decimal',
  'bar'
]

const parseIndentChars = (value: string | number | null | undefined) => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null
  return numeric * 16
}

const formatIndentChars = (value: number | null | undefined) =>
  value ? String(value / 16) : ''

function normalizeAppTabStops(tabStops: ITabStop[] | null | undefined) {
  return (tabStops || [])
    .filter(tabStop => Number.isFinite(tabStop.position) && tabStop.position >= 0)
    .map(tabStop => ({
      position: tabStop.position,
      alignment: tabStop.alignment || 'left'
    }))
    .sort((a, b) => a.position - b.position)
}

function formatTabStopsText(tabStops: ITabStop[]) {
  return normalizeAppTabStops(tabStops)
    .map(tabStop => `${tabStop.position}:${tabStop.alignment || 'left'}`)
    .join('\n')
}

function parseTabStopsText(value: string): ITabStop[] {
  return normalizeAppTabStops(
    value
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [positionText, alignmentText = 'left'] = line.split(':')
        const alignment = alignmentText.trim()
        return {
          position: Number(positionText),
          alignment: TAB_STOP_ALIGNMENTS.includes(
            alignment as NonNullable<ITabStop['alignment']>
          )
            ? (alignment as ITabStop['alignment'])
            : 'left'
        }
      })
  )
}

function resolveListToolbarValue(ctx: CanvasEditorAppContext) {
  const rangeStyle = ctx.state.rangeStyle
  if (rangeStyle?.listType === ListType.OL) return 'ol'
  if (
    rangeStyle?.listType === ListType.UL &&
    rangeStyle.listStyle === ListStyle.CHECKBOX
  ) {
    return 'checkbox'
  }
  if (
    rangeStyle?.listType === ListType.UL &&
    rangeStyle.listStyle === ListStyle.CIRCLE
  ) {
    return 'circle'
  }
  if (
    rangeStyle?.listType === ListType.UL &&
    rangeStyle.listStyle === ListStyle.SQUARE
  ) {
    return 'square'
  }
  if (rangeStyle?.listType === ListType.UL) return 'ul'
  return 'none'
}

function getCurrentMainElement(ctx: CanvasEditorAppContext) {
  const range = ctx.editor.command.getRange()
  if (!range || range.startIndex < 0) return null
  return ctx.editor.command.getValue().data.main[range.startIndex] || null
}

function resolveTitleToolbarValue(ctx: CanvasEditorAppContext) {
  return getCurrentMainElement(ctx)?.level || ctx.state.rangeStyle?.level || 'body'
}

function resolveRowMarginToolbarValue(ctx: CanvasEditorAppContext) {
  return (
    getCurrentMainElement(ctx)?.rowMargin ??
    ctx.state.rangeStyle?.rowMargin ??
    ctx.editor.command.getOptions().defaultRowMargin ??
    1
  )
}

function hasColumnsSelection(ctx: CanvasEditorAppContext) {
  const range = ctx.editor.command.getRange()
  return !!range && range.startIndex !== range.endIndex
}

function applyPageColumns(
  ctx: CanvasEditorAppContext,
  columns: Required<IPageColumns>
) {
  if (hasColumnsSelection(ctx)) {
    ctx.editor.command.executeRowColumns(
      columns.count <= 1
        ? null
        : {
            count: columns.count,
            gap: columns.gap,
            widths: columns.widths
          }
    )
    return
  }
  ctx.editor.command.executeUpdateOptions({
    columns
  })
}

const ensureHttpUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`

function getDialogValue(
  payload: { name: string; value: string }[],
  name: string
) {
  return payload.find(item => item.name === name)?.value || ''
}

function getTrimmedDialogValue(
  payload: { name: string; value: string }[],
  name: string
) {
  return getDialogValue(payload, name).trim()
}

function parseDialogPositiveInteger(
  value: string,
  fallback: number,
  min = 1
) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.floor(numeric))
}

function parseDialogNumberList(value: string) {
  return value
    .split(',')
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item) && item > 0)
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

function ensureInsertRange(ctx: CanvasEditorAppContext) {
  restoreInsertRange(
    ctx,
    normalizeInsertRange(ctx, ctx.editor.command.getRange())
  )
}

function getDateText(format: string) {
  const date = new Date()
  const year = date.getFullYear().toString()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  const second = date.getSeconds().toString().padStart(2, '0')
  if (format === 'yyyy') return year
  if (format === 'yyyy-MM') return `${year}-${month}`
  if (format === 'yyyy-MM-dd hh:mm:ss') {
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }
  return `${year}-${month}-${day}`
}

async function readImageFile(file: File) {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  const size = await loadImageSize(url)
  return {
    url,
    ...size
  }
}

async function loadImageSize(src: string) {
  const image = new Image()
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = src
  })
  const maxWidth = 360
  const width = image.naturalWidth || maxWidth
  const height = image.naturalHeight || 240
  if (width <= maxWidth) {
    return { width, height }
  }
  return {
    width: maxWidth,
    height: Math.round((height / width) * maxWidth)
  }
}

async function chooseImage(ctx: CanvasEditorAppContext) {
  const insertRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.style.display = 'none'
  ctx.root.append(input)
  try {
    const file = await new Promise<File | null>(resolve => {
      input.onchange = () => resolve(input.files?.[0] || null)
      input.click()
    })
    if (!file) return
    const result = ctx.handlers.uploadImage
      ? await ctx.handlers.uploadImage(file, ctx)
      : await readImageFile(file)
    const size =
      result.width && result.height
        ? { width: result.width, height: result.height }
        : await loadImageSize(result.url)
    restoreInsertRange(ctx, insertRange)
    ctx.editor.command.executeImage({
      value: result.url,
      width: size.width,
      height: size.height,
      imgDisplay: ImageDisplay.INLINE
    })
  } finally {
    input.remove()
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseControlValueSets(value: string) {
  if (!value.trim()) return []
  try {
    const valueSets = JSON.parse(value)
    if (!Array.isArray(valueSets)) {
      window.alert('值集必须是数组')
      return null
    }
    return valueSets
  } catch {
    window.alert('值集 JSON 解析失败')
    return null
  }
}

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
        { label: '否', value: 'false' },
        { label: '是', value: 'true' }
      ]
    }
  ]
}

function createControlElementFromDialog(
  payload: { name: string; value: string }[],
  control: IElement['control']
): IElement {
  const controlId = getTrimmedDialogValue(payload, 'controlId')
  const conceptId = getTrimmedDialogValue(payload, 'conceptId')
  const externalId = getTrimmedDialogValue(payload, 'externalId')
  const prefix = getTrimmedDialogValue(payload, 'prefix')
  const postfix = getTrimmedDialogValue(payload, 'postfix')
  const required = getTrimmedDialogValue(payload, 'required') === 'true'
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

function getControlValidateRules(payload: { name: string; value: string }[]) {
  const pattern = getTrimmedDialogValue(payload, 'pattern')
  const message = getTrimmedDialogValue(payload, 'validateMessage')
  return pattern
    ? [
        {
          pattern,
          message: message || '控件格式不正确'
        }
      ]
    : undefined
}

function insertConfiguredControl(
  ctx: CanvasEditorAppContext,
  insertRange: IRange,
  element: IElement
) {
  restoreInsertRange(ctx, insertRange)
  ctx.editor.command.executeInsertControl(element)
}

function openControlDialog(ctx: CanvasEditorAppContext, type: ControlType) {
  const insertRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
  const valueSetPlaceholder = `请输入值集JSON，例：\n${DEFAULT_CONTROL_VALUE_SETS}`
  if (type === ControlType.TEXT || type === ControlType.NUMBER) {
    new Dialog({
      title: type === ControlType.TEXT ? '文本控件' : '数值控件',
      data: [
        ...createControlCommonDialogData(),
        {
          type: 'text',
          label: '占位符',
          name: 'placeholder',
          value: type === ControlType.NUMBER ? '请输入数字' : '请输入内容',
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
        const placeholder = getTrimmedDialogValue(payload, 'placeholder')
        if (!placeholder) return
        const value = getTrimmedDialogValue(payload, 'value')
        insertConfiguredControl(
          ctx,
          insertRange,
          createControlElementFromDialog(payload, {
            type,
            value: value ? [{ value }] : null,
            placeholder,
            validateRules: getControlValidateRules(payload)
          })
        )
      }
    })
    return
  }
  if (type === ControlType.SELECT) {
    new Dialog({
      title: '下拉控件',
      data: [
        ...createControlCommonDialogData(),
        {
          type: 'text',
          label: '占位符',
          name: 'placeholder',
          value: '请选择',
          required: true,
          placeholder: '请输入占位符'
        },
        {
          type: 'text',
          label: '默认编码',
          name: 'code',
          value: 'one',
          placeholder: '请输入默认 code'
        },
        {
          type: 'textarea',
          label: '值集',
          name: 'valueSets',
          value: DEFAULT_CONTROL_VALUE_SETS,
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
        const placeholder = getTrimmedDialogValue(payload, 'placeholder')
        const valueSets = parseControlValueSets(
          getDialogValue(payload, 'valueSets')
        )
        if (!placeholder || !valueSets) return
        const remoteSource = getTrimmedDialogValue(payload, 'remoteSource')
        insertConfiguredControl(
          ctx,
          insertRange,
          createControlElementFromDialog(payload, {
            type,
            code: getTrimmedDialogValue(payload, 'code') || null,
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
    return
  }
  if (type === ControlType.CHECKBOX || type === ControlType.RADIO) {
    new Dialog({
      title: type === ControlType.CHECKBOX ? '复选框控件' : '单选框控件',
      data: [
        ...createControlCommonDialogData(),
        {
          type: 'text',
          label: '默认编码',
          name: 'code',
          value: 'one',
          placeholder:
            type === ControlType.CHECKBOX
              ? '多个值以英文逗号分割'
              : '请输入默认 code'
        },
        {
          type: 'textarea',
          label: '值集',
          name: 'valueSets',
          value: DEFAULT_CONTROL_VALUE_SETS,
          required: true,
          height: 110,
          placeholder: valueSetPlaceholder
        }
      ],
      onConfirm: payload => {
        const valueSets = parseControlValueSets(
          getDialogValue(payload, 'valueSets')
        )
        if (!valueSets) return
        insertConfiguredControl(
          ctx,
          insertRange,
          createControlElementFromDialog(payload, {
            type,
            code: getTrimmedDialogValue(payload, 'code') || null,
            value: null,
            valueSets,
            flexDirection: FlexDirection.ROW
          })
        )
      }
    })
    return
  }
  new Dialog({
    title: '日期控件',
    data: [
      ...createControlCommonDialogData(),
      {
        type: 'text',
        label: '占位符',
        name: 'placeholder',
        value: '请选择日期',
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
          { label: 'yyyy', value: 'yyyy' },
          { label: 'yyyy-MM', value: 'yyyy-MM' },
          { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
          { label: 'yyyy-MM-dd hh:mm:ss', value: 'yyyy-MM-dd hh:mm:ss' }
        ]
      }
    ],
    onConfirm: payload => {
      const placeholder = getTrimmedDialogValue(payload, 'placeholder')
      if (!placeholder) return
      const value = getTrimmedDialogValue(payload, 'value')
      insertConfiguredControl(
        ctx,
        insertRange,
        createControlElementFromDialog(payload, {
          type,
          dateFormat: getTrimmedDialogValue(payload, 'dateFormat'),
          value: value ? [{ value }] : null,
          placeholder
        })
      )
    }
  })
}

function createControlBusinessDemoElementList(): IElement[] {
  return [
    { value: '控件业务融合测试\n', size: 20, bold: true },
    { value: '患者姓名：' },
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
    { value: '\n省份：' },
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
          { value: '广东', code: 'gd' },
          { value: '浙江', code: 'zj' }
        ]
      }
    },
    { value: '\n城市：' },
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
    { value: '\n手机号：' },
    {
      type: ElementType.CONTROL,
      value: '',
      controlId: 'demo-phone',
      externalId: 'patient.phone',
      control: {
        type: ControlType.TEXT,
        value: [{ value: '13800138000' }],
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
        '\n\nAPI 控件示例已加载：城市候选项由远程加载器回填，必填姓名会参与校验高亮。'
    }
  ]
}

async function insertControlBusinessDemo(ctx: CanvasEditorAppContext) {
  ctx.editor.command.executeUpdateOptions({
    controlRemoteOptionLoader: async ({ option }) => {
      await new Promise(resolve => window.setTimeout(resolve, 10))
      if (option.source !== 'city-dict') {
        throw new Error('未知远程字典')
      }
      const province = (option.params as { province?: string } | undefined)
        ?.province
      return {
        valueSets:
          province === 'zj'
            ? [
                { value: '杭州', code: 'hz' },
                { value: '宁波', code: 'nb' }
              ]
            : [
                { value: '深圳', code: 'sz' },
                { value: '广州', code: 'gz' }
              ],
        remote: {
          source: option.source,
          requestId: option.requestId
        }
      }
    }
  })
  ctx.editor.command.executeSetValue({
    main: createControlBusinessDemoElementList()
  })
  await ctx.editor.command.executeLoadControlRemoteOptions({
    externalId: 'patient.city',
    source: 'city-dict',
    requestId: `app-city-${Date.now()}`,
    params: {
      province: 'gd'
    },
    isSubmitHistory: false
  })
  ctx.editor.command.executeValidateControl({
    isApplyHighlight: true,
    highlightColor: '#ff4d4f',
    highlightAlpha: 0.28
  })
}

function insertInlineElement(ctx: CanvasEditorAppContext, type: ElementType) {
  ensureInsertRange(ctx)
  switch (type) {
    case ElementType.CHECKBOX:
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.CHECKBOX,
          checkbox: {
            value: false
          },
          value: ''
        }
      ])
      break
    case ElementType.RADIO:
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.RADIO,
          checkbox: {
            value: false
          },
          value: ''
        }
      ])
      break
    case ElementType.DATE:
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.DATE,
          value: '',
          dateFormat: 'yyyy-MM-dd'
        }
      ])
      break
    case ElementType.LATEX:
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.LATEX,
          value: 'x'
        }
      ])
      break
    case ElementType.BLOCK:
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.BLOCK,
          value: '',
          height: 120,
          valueList: [{ value: '内容块' }]
        }
      ])
      break
    default:
      break
  }
}

function insertChartGraphic(ctx: CanvasEditorAppContext, presetId: string) {
  const presetMap = {
    line: {
      kind: 'line',
      presetId: 'common.line.basic'
    },
    bar: {
      kind: 'line',
      presetId: 'common.bar.basic'
    },
    vitalSigns: {
      kind: 'vital-signs',
      presetId: 'medical.vitalSigns.standard'
    },
    ecg: {
      kind: 'ecg',
      presetId: 'medical.ecg.standard'
    },
    menstrual: {
      kind: 'menstrual',
      presetId: 'medical.menstrual.standard'
    },
    partogram: {
      kind: 'partogram',
      presetId: 'medical.partogram.standard'
    },
    dental: {
      kind: 'dental',
      presetId: 'medical.dental.fdi'
    },
    anesthesia: {
      kind: 'anesthesia',
      presetId: 'medical.anesthesia.standard'
    }
  } as const
  const preset = presetMap[presetId as keyof typeof presetMap] || presetMap.line
  ensureInsertRange(ctx)
  ctx.editor.command.executeInsertChartGraphic(preset)
}

export function openSearchPanel(
  ctx: CanvasEditorAppContext,
  initialKeyword = ''
) {
  const existingPanel = ctx.root.querySelector<HTMLElement>(
    '.ce-app-search-panel'
  )
  if (existingPanel) {
    existingPanel.classList.add('is-visible')
    const searchInput =
      existingPanel.querySelector<HTMLInputElement>('input[name="search"]')
    if (searchInput && initialKeyword) {
      searchInput.value = initialKeyword
      ctx.editor.command.executeSearch(initialKeyword)
      const result = ctx.editor.command.getSearchNavigateInfo()
      const resultNode =
        existingPanel.querySelector<HTMLLabelElement>('.search-result')
      if (resultNode) {
        resultNode.textContent = result ? `${result.index}/${result.count}` : ''
      }
    }
    searchInput?.focus()
    return
  }
  const panel = document.createElement('div')
  panel.className = 'ce-app-search-panel is-visible'

  const searchRow = document.createElement('div')
  searchRow.className = 'ce-app-search-panel__row'
  const searchInput = document.createElement('input')
  searchInput.name = 'search'
  searchInput.placeholder = '搜索'
  const searchResult = document.createElement('label')
  searchResult.className = 'search-result'
  const prevButton = document.createElement('button')
  prevButton.type = 'button'
  prevButton.className = 'ce-app-search-panel__nav'
  prevButton.textContent = '<'
  const nextButton = document.createElement('button')
  nextButton.type = 'button'
  nextButton.className = 'ce-app-search-panel__nav'
  nextButton.textContent = '>'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.className = 'ce-app-search-panel__close'
  closeButton.textContent = 'x'
  searchRow.append(searchInput, searchResult, prevButton, nextButton, closeButton)

  const replaceRow = document.createElement('div')
  replaceRow.className = 'ce-app-search-panel__row'
  const replaceInput = document.createElement('input')
  replaceInput.name = 'replace'
  replaceInput.placeholder = '替换'
  const replaceButton = document.createElement('button')
  replaceButton.type = 'button'
  replaceButton.className = 'ce-app-search-panel__replace'
  replaceButton.textContent = '替换'
  replaceRow.append(replaceInput, replaceButton)

  const syncSearchResult = () => {
    const result = ctx.editor.command.getSearchNavigateInfo()
    searchResult.textContent = result ? `${result.index}/${result.count}` : ''
  }
  const search = () => {
    ctx.editor.command.executeSearch(searchInput.value || null)
    syncSearchResult()
  }
  searchInput.oninput = search
  searchInput.onkeydown = evt => {
    if (evt.key === 'Enter') {
      search()
    }
  }
  prevButton.onclick = () => {
    ctx.editor.command.executeSearchNavigatePre()
    syncSearchResult()
  }
  nextButton.onclick = () => {
    ctx.editor.command.executeSearchNavigateNext()
    syncSearchResult()
  }
  replaceButton.onclick = () => {
    const searchValue = searchInput.value
    const replaceValue = replaceInput.value
    if (searchValue && searchValue !== replaceValue) {
      ctx.editor.command.executeReplace(replaceValue)
      syncSearchResult()
    }
  }
  closeButton.onclick = () => {
    searchInput.value = ''
    replaceInput.value = ''
    ctx.editor.command.executeSearch(null)
    syncSearchResult()
    panel.remove()
  }

  panel.append(searchRow, replaceRow)
  panel.onclick = evt => evt.stopPropagation()
  ctx.root.append(panel)
  if (initialKeyword) {
    searchInput.value = initialKeyword
    search()
  }
  searchInput.focus()
}

function openTablePicker(ctx: CanvasEditorAppContext) {
  const existingPicker = ctx.root.querySelector<HTMLElement>(
    '.ce-app-table-picker'
  )
  if (existingPicker) {
    existingPicker.classList.add('is-visible')
    return
  }
  const picker = document.createElement('div')
  picker.className = 'ce-app-table-picker is-visible'

  const header = document.createElement('div')
  header.className = 'ce-app-table-picker__header'
  const title = document.createElement('span')
  title.className = 'ce-app-table-picker__title'
  title.textContent = '插入'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'x'
  closeButton.onclick = () => picker.remove()
  header.append(title, closeButton)

  const inlineLabel = document.createElement('label')
  inlineLabel.className = 'ce-app-table-picker__inline'
  const inlineCheckbox = document.createElement('input')
  inlineCheckbox.type = 'checkbox'
  inlineLabel.append(inlineCheckbox, document.createTextNode('行内表格'))

  const grid = document.createElement('div')
  grid.className = 'ce-app-table-picker__grid'
  const cellList: HTMLButtonElement[] = []
  const updateActiveCell = (row: number, col: number) => {
    title.textContent = `${row}×${col}`
    cellList.forEach(cell => {
      const cellRow = Number(cell.dataset.row)
      const cellCol = Number(cell.dataset.col)
      cell.classList.toggle('active', cellRow <= row && cellCol <= col)
    })
  }
  for (let row = 1; row <= 10; row++) {
    for (let col = 1; col <= 10; col++) {
      const cell = document.createElement('button')
      cell.type = 'button'
      cell.className = 'ce-app-table-picker__cell'
      cell.dataset.row = String(row)
      cell.dataset.col = String(col)
      cell.onmouseenter = () => updateActiveCell(row, col)
      cell.onclick = () => {
        ensureInsertRange(ctx)
        ctx.editor.command.executeInsertTable(row, col, {
          tableDisplay: inlineCheckbox.checked
            ? TableDisplay.INLINE
            : TableDisplay.BLOCK
        })
        picker.remove()
      }
      cellList.push(cell)
      grid.append(cell)
    }
  }

  picker.append(header, inlineLabel, grid)
  picker.onclick = evt => evt.stopPropagation()
  ctx.root.append(picker)
}

function openRowIndentPanel(ctx: CanvasEditorAppContext) {
  const paragraphRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
  const existingPanel = ctx.root.querySelector<HTMLElement>(
    '.ce-app-row-indent-panel'
  )
  if (existingPanel) {
    existingPanel.classList.add('is-visible')
    return
  }
  const panel = document.createElement('div')
  panel.className = 'ce-app-row-indent-panel is-visible'

  const header = document.createElement('div')
  header.className = 'ce-app-tool-panel__header'
  const title = document.createElement('span')
  title.textContent = '段落缩进'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'x'
  closeButton.onclick = () => panel.remove()
  header.append(title, closeButton)

  const presetList = document.createElement('div')
  presetList.className = 'ce-app-tool-panel__button-list'
  ;[
    { label: '取消首行缩进', value: null },
    { label: '首行缩进 1 字符', value: 1 },
    { label: '首行缩进 1.5 字符', value: 1.5 },
    { label: '首行缩进 2 字符', value: 2 },
    { label: '首行缩进 3 字符', value: 3 }
  ].forEach(preset => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = preset.label
    button.onclick = () => {
      restoreInsertRange(ctx, paragraphRange)
      ctx.editor.command.executeRowIndent(parseIndentChars(preset.value))
      panel.remove()
    }
    presetList.append(button)
  })

  const custom = document.createElement('div')
  custom.className = 'ce-app-row-indent-panel__custom'
  const rangeStyle = ctx.state.rangeStyle
  const fieldConfigs: Array<{
    label: string
    name: keyof IRowIndentPayload
    value: number | null | undefined
  }> = [
    { label: '左缩进', name: 'left', value: rangeStyle?.rowIndentLeft },
    { label: '右缩进', name: 'right', value: rangeStyle?.rowIndentRight },
    { label: '首行', name: 'firstLine', value: rangeStyle?.rowIndent },
    { label: '悬挂', name: 'hanging', value: rangeStyle?.rowHangingIndent }
  ]
  const inputs = new Map<keyof IRowIndentPayload, HTMLInputElement>()
  fieldConfigs.forEach(config => {
    const label = document.createElement('label')
    const text = document.createElement('span')
    text.textContent = config.label
    const input = document.createElement('input')
    input.type = 'number'
    input.step = '0.5'
    input.min = '0'
    input.name = config.name
    input.value = formatIndentChars(config.value)
    inputs.set(config.name, input)
    label.append(text, input)
    custom.append(label)
  })
  const applyButton = document.createElement('button')
  applyButton.type = 'button'
  applyButton.className = 'ce-app-row-indent-panel__apply'
  applyButton.textContent = '应用'
  applyButton.onclick = () => {
    restoreInsertRange(ctx, paragraphRange)
    ctx.editor.command.executeRowIndent({
      left: parseIndentChars(inputs.get('left')?.value),
      right: parseIndentChars(inputs.get('right')?.value),
      firstLine: parseIndentChars(inputs.get('firstLine')?.value),
      hanging: parseIndentChars(inputs.get('hanging')?.value)
    })
    panel.remove()
  }
  custom.append(applyButton)

  panel.append(header, presetList, custom)
  panel.onclick = evt => evt.stopPropagation()
  ctx.root.append(panel)
}

function openPageColumnsPanel(ctx: CanvasEditorAppContext) {
  const existingPanel = ctx.root.querySelector<HTMLElement>(
    '.ce-app-page-columns-panel'
  )
  if (existingPanel) {
    existingPanel.classList.add('is-visible')
    return
  }
  const panel = document.createElement('div')
  panel.className = 'ce-app-page-columns-panel is-visible'

  const header = document.createElement('div')
  header.className = 'ce-app-tool-panel__header'
  const title = document.createElement('span')
  title.textContent = '分栏'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'x'
  closeButton.onclick = () => panel.remove()
  header.append(title, closeButton)

  const currentColumns = ctx.editor.command.getOptions().columns || {}
  const applyPreset = (count: number) => {
    applyPageColumns(ctx, {
      count,
      gap: currentColumns.gap ?? 24,
      widths: []
    })
    panel.remove()
  }

  const presetList = document.createElement('div')
  presetList.className = 'ce-app-tool-panel__button-list'
  ;[
    { label: '1栏', count: 1 },
    { label: '2栏', count: 2 },
    { label: '3栏', count: 3 }
  ].forEach(preset => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = preset.label
    button.classList.toggle(
      'active',
      (currentColumns.count ?? 1) === preset.count
    )
    button.onclick = () => applyPreset(preset.count)
    presetList.append(button)
  })

  const actions = document.createElement('div')
  actions.className = 'ce-app-tool-panel__actions'
  const customButton = document.createElement('button')
  customButton.type = 'button'
  customButton.textContent = '自定义'
  customButton.onclick = () => {
    new Dialog({
      title: '分栏',
      data: [
        {
          type: 'number',
          label: '栏数',
          name: 'count',
          required: true,
          value: `${currentColumns.count ?? 1}`,
          placeholder: '请输入栏数'
        },
        {
          type: 'number',
          label: '栏间距',
          name: 'gap',
          required: true,
          value: `${currentColumns.gap ?? 24}`,
          placeholder: '请输入栏间距'
        },
        {
          type: 'text',
          label: '栏宽（逗号分隔，可选）',
          name: 'widths',
          value: Array.isArray(currentColumns.widths)
            ? currentColumns.widths.join(',')
            : '',
          placeholder: '例如 120,100'
        }
      ],
      onConfirm: payload => {
        const count = parseDialogPositiveInteger(
          getDialogValue(payload, 'count'),
          currentColumns.count ?? 1,
          1
        )
        const gap = parseDialogPositiveInteger(
          getDialogValue(payload, 'gap'),
          currentColumns.gap ?? 24,
          0
        )
        const widths = parseDialogNumberList(getDialogValue(payload, 'widths'))
        applyPageColumns(ctx, {
          count,
          gap,
          widths: widths.length ? widths : currentColumns.widths || []
        })
        panel.remove()
      }
    })
  }
  actions.append(customButton)

  panel.append(header, presetList, actions)
  panel.onclick = evt => evt.stopPropagation()
  ctx.root.append(panel)
}

function openTabStopsPanel(ctx: CanvasEditorAppContext) {
  const paragraphRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
  const existingPanel = ctx.root.querySelector<HTMLElement>(
    '.ce-app-tab-stops-panel'
  )
  if (existingPanel) {
    existingPanel.classList.add('is-visible')
    return
  }
  const panel = document.createElement('div')
  panel.className = 'ce-app-tab-stops-panel is-visible'
  let currentTabStops = normalizeAppTabStops(ctx.state.rangeStyle?.tabStops)

  const header = document.createElement('div')
  header.className = 'ce-app-tool-panel__header'
  const title = document.createElement('span')
  title.textContent = '制表位'
  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'x'
  closeButton.onclick = () => panel.remove()
  header.append(title, closeButton)

  const ruler = document.createElement('div')
  ruler.className = 'ce-app-tab-stops-panel__ruler'
  const rulerLabel = document.createElement('div')
  rulerLabel.className = 'ce-app-tab-stops-panel__label'
  rulerLabel.textContent = '标尺 0 - 240'
  const rulerTrack = document.createElement('div')
  rulerTrack.className = 'ce-app-tab-stops-panel__track'
  ruler.append(rulerLabel, rulerTrack)

  const syncCommandAndHandles = (tabStops: ITabStop[] | null) => {
    currentTabStops = normalizeAppTabStops(tabStops)
    restoreInsertRange(ctx, paragraphRange)
    ctx.editor.command.executeSetTabStops(
      currentTabStops.length ? currentTabStops : null
    )
    renderHandles()
  }

  const resolveHandleLeft = (position: number, trackWidth: number) =>
    (Math.min(position, TAB_STOPS_RULER_MAX_POSITION) /
      TAB_STOPS_RULER_MAX_POSITION) *
    trackWidth

  const resolvePositionFromEvent = (evt: MouseEvent) => {
    const rect = rulerTrack.getBoundingClientRect()
    const offset = Math.min(Math.max(evt.clientX - rect.left, 0), rect.width)
    return Math.round(
      (offset / Math.max(rect.width, 1)) * TAB_STOPS_RULER_MAX_POSITION
    )
  }

  const applyRulerPosition = (position: number, targetIndex?: number) => {
    const nextTabStops = currentTabStops.slice()
    if (targetIndex !== undefined && nextTabStops[targetIndex]) {
      nextTabStops[targetIndex] = {
        ...nextTabStops[targetIndex],
        position
      }
      syncCommandAndHandles(nextTabStops)
      return
    }
    const nearestIndex = nextTabStops.findIndex(
      tabStop =>
        Math.abs(tabStop.position - position) <=
        TAB_STOPS_RULER_DUPLICATE_DISTANCE
    )
    if (nearestIndex >= 0) {
      nextTabStops[nearestIndex] = {
        ...nextTabStops[nearestIndex],
        position
      }
    } else {
      nextTabStops.push({
        position,
        alignment: currentTabStops[0]?.alignment || 'left'
      })
    }
    syncCommandAndHandles(nextTabStops)
  }

  function renderHandles() {
    rulerTrack
      .querySelectorAll('.ce-app-tab-stops-panel__handle')
      .forEach(handle => handle.remove())
    const trackWidth = rulerTrack.clientWidth || 1
    currentTabStops.forEach((tabStop, index) => {
      const handle = document.createElement('span')
      handle.className = 'ce-app-tab-stops-panel__handle'
      handle.dataset.tabStopIndex = String(index)
      handle.title = '拖动调整，双击删除'
      handle.style.left = `${resolveHandleLeft(tabStop.position, trackWidth)}px`
      rulerTrack.append(handle)
    })
  }

  const startRulerDrag = (evt: MouseEvent) => {
    const handle = (evt.target as HTMLElement).closest<HTMLElement>(
      '.ce-app-tab-stops-panel__handle'
    )
    if (!handle) return
    evt.preventDefault()
    evt.stopPropagation()
    const handleIndex = Number(handle.dataset.tabStopIndex)
    const onMouseMove = (moveEvt: MouseEvent) => {
      applyRulerPosition(resolvePositionFromEvent(moveEvt), handleIndex)
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  rulerTrack.addEventListener('mousedown', startRulerDrag)
  rulerTrack.addEventListener('click', evt => {
    if ((evt.target as HTMLElement).closest('.ce-app-tab-stops-panel__handle')) {
      return
    }
    evt.preventDefault()
    evt.stopPropagation()
    applyRulerPosition(resolvePositionFromEvent(evt))
  })
  rulerTrack.addEventListener('dblclick', evt => {
    const handle = (evt.target as HTMLElement).closest<HTMLElement>(
      '.ce-app-tab-stops-panel__handle'
    )
    if (!handle) return
    evt.preventDefault()
    evt.stopPropagation()
    const targetIndex = Number(handle.dataset.tabStopIndex)
    syncCommandAndHandles(
      currentTabStops.filter((_, index) => index !== targetIndex)
    )
  })

  const presetList = document.createElement('div')
  presetList.className = 'ce-app-tool-panel__button-list'
  ;[
    { label: '左对齐 120', alignment: 'left' },
    { label: '右对齐 120', alignment: 'right' },
    { label: '居中 120', alignment: 'center' },
    { label: '小数点 120', alignment: 'decimal' },
    { label: '竖线 120', alignment: 'bar' }
  ].forEach(preset => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = preset.label
    button.onclick = () => {
      syncCommandAndHandles([
        {
          position: 120,
          alignment: preset.alignment as ITabStop['alignment']
        }
      ])
      panel.remove()
    }
    presetList.append(button)
  })

  const actions = document.createElement('div')
  actions.className = 'ce-app-tool-panel__actions'
  const customButton = document.createElement('button')
  customButton.type = 'button'
  customButton.textContent = '自定义'
  customButton.onclick = () => {
    new Dialog({
      title: '制表位',
      data: [
        {
          type: 'textarea',
          label: '制表位',
          name: 'tabStops',
          width: 300,
          height: 120,
          value: formatTabStopsText(currentTabStops),
          placeholder: '每行一个，例如：120:left'
        }
      ],
      onConfirm: payload => {
        const tabStops = parseTabStopsText(getDialogValue(payload, 'tabStops'))
        syncCommandAndHandles(tabStops)
      }
    })
  }
  const clearButton = document.createElement('button')
  clearButton.type = 'button'
  clearButton.textContent = '清除制表位'
  clearButton.onclick = () => {
    syncCommandAndHandles(null)
    panel.remove()
  }
  actions.append(customButton, clearButton)

  panel.append(header, ruler, presetList, actions)
  panel.onclick = evt => evt.stopPropagation()
  ctx.root.append(panel)
  renderHandles()
}

function openHyperlinkDialog(ctx: CanvasEditorAppContext) {
  const insertRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
  const selectedText = ctx.editor.command.getRangeText()
  new Dialog({
    title: '超链接',
    data: [
      {
        type: 'text',
        label: '文本',
        name: 'name',
        required: true,
        placeholder: '请输入文本',
        value: selectedText
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
      const text = getTrimmedDialogValue(payload, 'name')
      const url = getTrimmedDialogValue(payload, 'url')
      if (!text || !url) return
      restoreInsertRange(ctx, insertRange)
      ctx.editor.command.executeHyperlink({
        type: ElementType.HYPERLINK,
        value: '',
        url: ensureHttpUrl(url),
        valueList: splitText(text).map(value => ({ value }))
      })
    }
  })
}

function openWatermarkDialog(ctx: CanvasEditorAppContext) {
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
        value: '10'
      },
      {
        type: 'number',
        label: '垂直间隔',
        name: 'verticalGap',
        value: '10'
      }
    ],
    onConfirm: payload => {
      const data = getDialogValue(payload, 'data')
      const color = getDialogValue(payload, 'color')
      const size = Number(getDialogValue(payload, 'size'))
      const opacity = Number(getDialogValue(payload, 'opacity'))
      if (!data || !color || !Number.isFinite(size) || !Number.isFinite(opacity)) {
        return
      }
      const repeat = getDialogValue(payload, 'repeat') === '1'
      const horizontalGap = Number(getDialogValue(payload, 'horizontalGap'))
      const verticalGap = Number(getDialogValue(payload, 'verticalGap'))
      ctx.editor.command.executeAddWatermark({
        data,
        color,
        size,
        opacity,
        repeat,
        gap:
          repeat &&
          Number.isFinite(horizontalGap) &&
          Number.isFinite(verticalGap)
            ? [horizontalGap, verticalGap]
            : undefined
      })
    }
  })
}

function openCodeblockDialog(ctx: CanvasEditorAppContext) {
  const insertRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
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
      const codeblock = getDialogValue(payload, 'codeblock')
      if (!codeblock) return
      const codeblockExtension = 'codeblock'
      const tokenList = prism.tokenize(codeblock, prism.languages.javascript)
      const formatTokenList = formatPrismToken(tokenList)
      const elementList: IElement[] = []
      for (const formatToken of formatTokenList) {
        for (const value of splitText(formatToken.content)) {
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
      restoreInsertRange(ctx, insertRange)
      ctx.editor.command.executeInsertElementList(elementList)
    }
  })
}

function insertDateElement(ctx: CanvasEditorAppContext, format: string) {
  const value = getDateText(format)
  ensureInsertRange(ctx)
  ctx.editor.command.executeInsertElementList([
    {
      type: ElementType.DATE,
      value: '',
      dateFormat: format,
      valueList: [{ value }]
    }
  ])
}

function openBlockDialog(ctx: CanvasEditorAppContext) {
  const insertRange = normalizeInsertRange(ctx, ctx.editor.command.getRange())
  new Dialog({
    title: '内容块',
    data: [
      {
        type: 'select',
        label: '类型',
        name: 'type',
        value: BlockType.IFRAME,
        required: true,
        options: [
          { label: '网址', value: BlockType.IFRAME },
          { label: '视频', value: BlockType.VIDEO }
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
        value: '180',
        required: true,
        placeholder: '请输入高度'
      },
      {
        type: 'text',
        label: '地址',
        name: 'src',
        placeholder: '请输入地址'
      },
      {
        type: 'textarea',
        label: 'HTML',
        height: 100,
        name: 'srcdoc',
        placeholder: '请输入 HTML 代码（仅网址类型有效）'
      }
    ],
    onConfirm: payload => {
      const type = getTrimmedDialogValue(payload, 'type')
      const height = Number(getTrimmedDialogValue(payload, 'height'))
      if (!type || !Number.isFinite(height)) return
      const src = getTrimmedDialogValue(payload, 'src')
      const srcdoc = getDialogValue(payload, 'srcdoc')
      const block: IBlock = {
        type: type as BlockType
      }
      if (block.type === BlockType.IFRAME) {
        if (!src && !srcdoc) return
        block.iframeBlock = { src, srcdoc }
      } else if (block.type === BlockType.VIDEO) {
        if (!src) return
        block.videoBlock = { src }
      }
      const width = Number(getTrimmedDialogValue(payload, 'width'))
      const blockElement: IElement = {
        type: ElementType.BLOCK,
        value: '',
        height,
        block
      }
      if (Number.isFinite(width) && width > 0) {
        blockElement.width = width
      }
      restoreInsertRange(ctx, insertRange)
      ctx.editor.command.executeInsertElementList([blockElement])
    }
  })
}

const minimalItems: ToolbarItem[] = [
  {
    id: 'undo',
    type: 'button',
    className: 'menu-item__undo',
    title: '撤销',
    disabled: ctx => !ctx.state.rangeStyle?.undo,
    run: ctx => ctx.editor.command.executeUndo()
  },
  {
    id: 'redo',
    type: 'button',
    className: 'menu-item__redo',
    title: '重做',
    disabled: ctx => !ctx.state.rangeStyle?.redo,
    run: ctx => ctx.editor.command.executeRedo()
  },
  {
    id: 'painter',
    type: 'button',
    className: 'menu-item__painter',
    title: '格式刷(双击可连续使用)',
    active: ctx => !!ctx.state.rangeStyle?.painter,
    run: ctx => ctx.editor.command.executePainter({ isDblclick: false }),
    runDblclick: ctx =>
      ctx.editor.command.executePainter({ isDblclick: true })
  },
  {
    id: 'format',
    type: 'button',
    className: 'menu-item__format',
    title: '清除格式',
    run: ctx => ctx.editor.command.executeFormat()
  },
  {
    id: 'format-marker',
    type: 'button',
    className: 'menu-item__format-marker',
    title: '显示/隐藏空格和换行标记',
    active: ctx => !ctx.editor.command.getOptions().lineBreak.disabled,
    run: ctx => {
      const options = ctx.editor.command.getOptions()
      ctx.editor.command.executeUpdateOptions({
        lineBreak: {
          ...options.lineBreak,
          disabled: !options.lineBreak.disabled
        }
      })
    }
  },
  { id: 'history-divider', type: 'divider' },
  {
    id: 'font',
    type: 'select',
    className: 'menu-item__font',
    title: '字体',
    value: ctx =>
      ctx.state.rangeStyle?.font ||
      ctx.editor.command.getOptions().defaultFont ||
      'Microsoft YaHei',
    options: FONT_OPTIONS,
    run: (ctx, payload) => ctx.editor.command.executeFont(String(payload))
  },
  {
    id: 'size',
    type: 'select',
    className: 'menu-item__size',
    title: '字号',
    value: ctx =>
      ctx.state.rangeStyle?.size ||
      ctx.editor.command.getOptions().defaultSize ||
      16,
    options: SIZE_OPTIONS,
    run: (ctx, payload) => ctx.editor.command.executeSize(Number(payload))
  },
  {
    id: 'size-add',
    type: 'button',
    className: 'menu-item__size-add',
    title: '增大字号',
    run: ctx => ctx.editor.command.executeSizeAdd()
  },
  {
    id: 'size-minus',
    type: 'button',
    className: 'menu-item__size-minus',
    title: '减小字号',
    run: ctx => ctx.editor.command.executeSizeMinus()
  },
  {
    id: 'bold',
    type: 'button',
    className: 'menu-item__bold',
    label: 'B',
    title: '加粗',
    active: ctx => !!ctx.state.rangeStyle?.bold,
    run: ctx => ctx.editor.command.executeBold()
  },
  {
    id: 'italic',
    type: 'button',
    className: 'menu-item__italic',
    label: 'I',
    title: '斜体',
    active: ctx => !!ctx.state.rangeStyle?.italic,
    run: ctx => ctx.editor.command.executeItalic()
  },
  {
    id: 'underline',
    type: 'button',
    className: 'menu-item__underline',
    label: 'U',
    title: '下划线',
    active: ctx => !!ctx.state.rangeStyle?.underline,
    run: ctx => ctx.editor.command.executeUnderline()
  },
  {
    id: 'underline-style',
    type: 'select',
    className: 'menu-item__underline',
    label: '',
    title: '下划线样式',
    value: TextDecorationStyle.SOLID,
    options: [
      { label: '', value: TextDecorationStyle.SOLID },
      { label: '', value: TextDecorationStyle.DOUBLE },
      { label: '', value: TextDecorationStyle.DASHED },
      { label: '', value: TextDecorationStyle.DOTTED },
      { label: '', value: TextDecorationStyle.WAVY }
    ],
    run: (ctx, payload) =>
      ctx.editor.command.executeUnderline({
        style: payload as TextDecorationStyle
      })
  },
  {
    id: 'strikeout',
    type: 'button',
    className: 'menu-item__strikeout',
    label: 'S',
    title: '删除线',
    active: ctx => !!ctx.state.rangeStyle?.strikeout,
    run: ctx => ctx.editor.command.executeStrikeout()
  },
  {
    id: 'superscript',
    type: 'button',
    className: 'menu-item__superscript',
    title: '上标',
    run: ctx => ctx.editor.command.executeSuperscript()
  },
  {
    id: 'subscript',
    type: 'button',
    className: 'menu-item__subscript',
    title: '下标',
    run: ctx => ctx.editor.command.executeSubscript()
  },
  {
    id: 'color',
    type: 'color',
    className: 'menu-item__color',
    label: 'A',
    title: '字体颜色',
    value: '#000000',
    run: (ctx, payload) => ctx.editor.command.executeColor(String(payload))
  },
  {
    id: 'highlight',
    type: 'color',
    className: 'menu-item__highlight',
    label: 'Bg',
    title: '高亮',
    value: '#ffff00',
    run: (ctx, payload) => ctx.editor.command.executeHighlight(String(payload))
  },
  { id: 'format-divider', type: 'divider' },
  {
    id: 'title',
    type: 'select',
    className: 'menu-item__title',
    title: '切换标题',
    value: ctx => resolveTitleToolbarValue(ctx),
    options: [
      { label: '正文', value: 'body' },
      { label: '标题1', value: TitleLevel.FIRST },
      { label: '标题2', value: TitleLevel.SECOND },
      { label: '标题3', value: TitleLevel.THIRD },
      { label: '标题4', value: TitleLevel.FOURTH },
      { label: '标题5', value: TitleLevel.FIFTH },
      { label: '标题6', value: TitleLevel.SIXTH }
    ],
    run: (ctx, payload) =>
      ctx.editor.command.executeTitle(
        payload === 'body' ? null : (payload as TitleLevel)
      )
  },
  {
    id: 'align-left',
    type: 'button',
    className: 'menu-item__left',
    title: '左对齐',
    active: ctx => ctx.state.rangeStyle?.rowFlex === RowFlex.LEFT,
    run: ctx => ctx.editor.command.executeRowFlex(RowFlex.LEFT)
  },
  {
    id: 'align-center',
    type: 'button',
    className: 'menu-item__center',
    title: '居中',
    active: ctx => ctx.state.rangeStyle?.rowFlex === RowFlex.CENTER,
    run: ctx => ctx.editor.command.executeRowFlex(RowFlex.CENTER)
  },
  {
    id: 'align-right',
    type: 'button',
    className: 'menu-item__right',
    title: '右对齐',
    active: ctx => ctx.state.rangeStyle?.rowFlex === RowFlex.RIGHT,
    run: ctx => ctx.editor.command.executeRowFlex(RowFlex.RIGHT)
  },
  {
    id: 'align-justify',
    type: 'button',
    className: 'menu-item__justify',
    title: '两端对齐',
    active: ctx => ctx.state.rangeStyle?.rowFlex === RowFlex.JUSTIFY,
    run: ctx => ctx.editor.command.executeRowFlex(RowFlex.JUSTIFY)
  },
  {
    id: 'align-distributed',
    type: 'button',
    className: 'menu-item__alignment',
    title: '分散对齐',
    active: ctx => ctx.state.rangeStyle?.rowFlex === RowFlex.ALIGNMENT,
    run: ctx => ctx.editor.command.executeRowFlex(RowFlex.ALIGNMENT)
  },
  {
    id: 'row-margin',
    type: 'select',
    className: 'menu-item__row-margin',
    label: '',
    title: '行间距',
    value: ctx => resolveRowMarginToolbarValue(ctx),
    options: [1, 1.25, 1.5, 1.75, 2, 2.5, 3].map(value => ({
      label: String(value),
      value
    })),
    run: (ctx, payload) => ctx.editor.command.executeRowMargin(Number(payload))
  },
  {
    id: 'page-columns',
    type: 'button',
    className: 'page-columns',
    title: '分栏',
    run: ctx => openPageColumnsPanel(ctx)
  },
  {
    id: 'tab-stops',
    type: 'button',
    className: 'menu-item__tab-stops',
    title: '制表位',
    run: ctx => openTabStopsPanel(ctx)
  },
  {
    id: 'row-indent',
    type: 'button',
    className: 'menu-item__row-indent',
    title: '段落缩进',
    run: ctx => openRowIndentPanel(ctx)
  },
  {
    id: 'list',
    type: 'select',
    className: 'menu-item__list',
    title: '列表',
    value: ctx => resolveListToolbarValue(ctx),
    options: [
      { label: '无列表', value: 'none' },
      { label: '有序列表', value: 'ol' },
      { label: '复选框列表', value: 'checkbox' },
      { label: '实心圆点列表', value: 'ul' },
      { label: '空心圆点列表', value: 'circle' },
      { label: '方块列表', value: 'square' }
    ],
    run: (ctx, payload) => {
      if (payload === 'ol') {
        ctx.editor.command.executeList(ListType.OL, ListStyle.DECIMAL)
        return
      }
      if (payload === 'ul') {
        ctx.editor.command.executeList(ListType.UL, ListStyle.DISC)
        return
      }
      if (payload === 'checkbox') {
        ctx.editor.command.executeList(ListType.UL, ListStyle.CHECKBOX)
        return
      }
      if (payload === 'circle') {
        ctx.editor.command.executeList(ListType.UL, ListStyle.CIRCLE)
        return
      }
      if (payload === 'square') {
        ctx.editor.command.executeList(ListType.UL, ListStyle.SQUARE)
        return
      }
      ctx.editor.command.executeList(null)
    }
  }
]

const standardItems: ToolbarItem[] = [
  ...minimalItems,
  { id: 'insert-divider', type: 'divider' },
  {
    id: 'table',
    type: 'button',
    className: 'menu-item__table',
    title: '插入表格',
    run: ctx => openTablePicker(ctx)
  },
  {
    id: 'image',
    type: 'button',
    className: 'menu-item__image',
    title: '插入图片',
    run: ctx => chooseImage(ctx)
  },
  {
    id: 'chart-graphic',
    type: 'select',
    className: 'menu-item__chart-graphic',
    label: '',
    title: '插入图表',
    value: 'line',
    options: [
      { label: '折线图', value: 'line' },
      { label: '柱状图', value: 'bar' },
      { label: '体温单', value: 'vitalSigns' },
      { label: '心电图', value: 'ecg' },
      { label: '月经图', value: 'menstrual' },
      { label: '产程图', value: 'partogram' },
      { label: '牙位图', value: 'dental' },
      { label: '麻醉记录', value: 'anesthesia' }
    ],
    run: (ctx, payload) => insertChartGraphic(ctx, String(payload))
  },
  {
    id: 'hyperlink',
    type: 'button',
    className: 'menu-item__hyperlink',
    title: '插入链接',
    run: ctx => openHyperlinkDialog(ctx)
  },
  {
    id: 'separator',
    type: 'select',
    className: 'menu-item__separator',
    label: '',
    title: '插入分隔线',
    value: '0,0',
    options: [
      { label: '', value: '0,0' },
      { label: '', value: '1,1' },
      { label: '', value: '3,1' },
      { label: '', value: '4,4' },
      { label: '', value: '7,3,3,3' },
      { label: '', value: '6,2,2,2,2,2' }
    ],
    run: (ctx, payload) =>
      ctx.editor.command.executeSeparator(String(payload).split(',').map(Number))
  },
  {
    id: 'watermark',
    type: 'select',
    className: 'menu-item__watermark',
    label: '',
    title: '水印',
    value: 'add',
    options: [
      { label: '添加水印', value: 'add' },
      { label: '删除水印', value: 'delete' }
    ],
    run: (ctx, payload) => {
      if (payload === 'delete') {
        ctx.editor.command.executeDeleteWatermark()
        return
      }
      openWatermarkDialog(ctx)
    }
  },
  {
    id: 'codeblock',
    type: 'button',
    className: 'menu-item__codeblock',
    title: '代码块',
    run: ctx => openCodeblockDialog(ctx)
  },
  {
    id: 'page-break',
    type: 'button',
    className: 'menu-item__page-break',
    title: '插入分页符',
    run: ctx => ctx.editor.command.executePageBreak()
  },
  {
    id: 'control',
    type: 'select',
    className: 'menu-item__control',
    label: '',
    title: '控件',
    value: ControlType.TEXT,
    options: [
      { label: '文本控件', value: ControlType.TEXT },
      { label: '数值控件', value: ControlType.NUMBER },
      { label: '下拉控件', value: ControlType.SELECT },
      { label: '日期控件', value: ControlType.DATE },
      { label: '复选框控件', value: ControlType.CHECKBOX },
      { label: '单选框控件', value: ControlType.RADIO }
    ],
    run: (ctx, payload) => openControlDialog(ctx, payload as ControlType)
  },
  {
    id: 'control-business',
    type: 'button',
    className: 'menu-item__control-business',
    title: '控件业务融合测试',
    run: ctx => insertControlBusinessDemo(ctx)
  },
  {
    id: 'checkbox',
    type: 'button',
    className: 'menu-item__checkbox',
    title: '复选框',
    run: ctx => insertInlineElement(ctx, ElementType.CHECKBOX)
  },
  {
    id: 'radio',
    type: 'button',
    className: 'menu-item__radio',
    title: '单选框',
    run: ctx => insertInlineElement(ctx, ElementType.RADIO)
  },
  {
    id: 'latex',
    type: 'button',
    className: 'menu-item__latex',
    title: '公式',
    run: ctx => openFormulaPicker(ctx)
  },
  {
    id: 'date',
    type: 'select',
    className: 'menu-item__date',
    label: '',
    title: '日期',
    value: 'yyyy-MM-dd',
    options: [
      { label: () => getDateText('yyyy'), value: 'yyyy' },
      { label: () => getDateText('yyyy-MM'), value: 'yyyy-MM' },
      { label: () => getDateText('yyyy-MM-dd'), value: 'yyyy-MM-dd' },
      {
        label: () => getDateText('yyyy-MM-dd hh:mm:ss'),
        value: 'yyyy-MM-dd hh:mm:ss'
      }
    ],
    run: (ctx, payload) => insertDateElement(ctx, String(payload))
  },
  {
    id: 'block',
    type: 'button',
    className: 'menu-item__block',
    title: '内容块',
    run: ctx => openBlockDialog(ctx)
  },
  { id: 'document-divider', type: 'divider' },
  {
    id: 'search',
    type: 'button',
    className: 'menu-item__search',
    title: '搜索',
    run: ctx => openSearchPanel(ctx)
  },
  {
    id: 'print',
    type: 'button',
    className: 'menu-item__print',
    title: '打印',
    run: ctx =>
      ctx.handlers.print ? ctx.handlers.print(ctx) : ctx.editor.command.executePrint()
  },
  {
    id: 'docx',
    type: 'button',
    className: 'menu-item__docx',
    title: '导出 DOCX',
    run: async ctx => {
      if (ctx.handlers.exportDocx) {
        await ctx.handlers.exportDocx(ctx)
        return
      }
      downloadBlob(ctx.editor.command.getOoxmlDocxBlob(), 'canvas-editor.docx')
    }
  },
  {
    id: 'pdf',
    type: 'button',
    className: 'menu-item__pdf',
    title: '导出 PDF',
    run: async ctx => {
      if (ctx.handlers.exportPdf) {
        await ctx.handlers.exportPdf(ctx)
        return
      }
      const blob = await ctx.editor.command.getPdfBlob()
      downloadBlob(blob, 'canvas-editor.pdf')
    }
  },
  {
    id: 'track-change',
    type: 'select',
    className: 'menu-item__track-change',
    label: '',
    title: '留痕',
    value: 'toggle',
    options: [
      {
        label: ctx =>
          ctx.editor.command.getOptions().trackChange.enabled
            ? '关闭留痕'
            : '开启留痕',
        value: 'toggle'
      },
      {
        label: ctx =>
          ctx.root.querySelector('.track-change-panel.is-visible')
            ? '关闭留痕面板'
            : '显示留痕',
        value: 'panel'
      },
      { label: '接受所有修订', value: 'accept-all' },
      { label: '拒绝所有修订', value: 'reject-all' }
    ],
    active: ctx => !!ctx.editor.command.getOptions().trackChange.enabled,
    run: (ctx, payload) => {
      if (payload === 'panel') {
        ctx.handlers.toggleTrackChangePanel?.(ctx)
        return
      }
      if (payload === 'accept-all') {
        ctx.handlers.acceptAllTrackChange?.(ctx)
        return
      }
      if (payload === 'reject-all') {
        ctx.handlers.rejectAllTrackChange?.(ctx)
        return
      }
      const enabled = !ctx.editor.command.getOptions().trackChange.enabled
      ctx.handlers.toggleTrackChange?.(ctx, enabled)
    }
  },
  {
    id: 'save',
    type: 'button',
    className: 'menu-item__save',
    label: '保存',
    title: '保存',
    disabled: ctx => !ctx.handlers.save,
    run: ctx => ctx.handlers.save?.(ctx)
  },
  { id: 'view-divider', type: 'divider' }
]

function getPresetItems(preset: CanvasEditorAppPreset) {
  if (preset === 'minimal') return minimalItems
  return standardItems
}

export function createToolbarItems(
  preset: CanvasEditorAppPreset,
  patch?: ToolbarPatch
) {
  const includeSet = patch?.include ? new Set(patch.include) : null
  const excludeSet = new Set(patch?.exclude || [])
  const replaceMap = patch?.replace || {}
  const items = getPresetItems(preset)
    .filter(item => !includeSet || includeSet.has(item.id))
    .filter(item => !excludeSet.has(item.id))
    .map(item => replaceMap[item.id] || item)

  return [...items, ...(patch?.append || [])]
}
