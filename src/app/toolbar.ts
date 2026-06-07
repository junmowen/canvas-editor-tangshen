import {
  ElementType,
  ImageDisplay,
  ListStyle,
  ListType,
  RowFlex,
  splitText,
  TitleLevel,
  TextDecorationStyle,
  ControlType
} from '../editor'
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

const ensureHttpUrl = (url: string) =>
  /^https?:\/\//i.test(url) ? url : `https://${url}`

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

function insertSimpleControl(ctx: CanvasEditorAppContext, type: ControlType) {
  ctx.editor.command.executeInsertControl({
    type: ElementType.CONTROL,
    value: '',
    control: {
      type,
      value: null,
      placeholder: type === ControlType.NUMBER ? '请输入数字' : '请输入内容'
    }
  })
}

function insertInlineElement(ctx: CanvasEditorAppContext, type: ElementType) {
  switch (type) {
    case ElementType.CHECKBOX:
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.CHECKBOX,
          value: ''
        }
      ])
      break
    case ElementType.RADIO:
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.RADIO,
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

function promptSearch(ctx: CanvasEditorAppContext) {
  const keyword = window.prompt('搜索关键词', '')
  ctx.editor.command.executeSearch(keyword || null)
}

function promptHyperlink(ctx: CanvasEditorAppContext) {
  const selectedText = ctx.editor.command.getRangeText()
  const text = window.prompt('链接文本', selectedText || '')
  if (!text) return
  const url = window.prompt('链接地址', '')
  if (!url) return
  ctx.editor.command.executeHyperlink({
    type: ElementType.HYPERLINK,
    value: '',
    url: ensureHttpUrl(url),
    valueList: splitText(text).map(value => ({ value }))
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
    title: '格式刷',
    active: ctx => !!ctx.state.rangeStyle?.painter,
    run: ctx => ctx.editor.command.executePainter({ isDblclick: false })
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
    value: 'Microsoft YaHei',
    options: FONT_OPTIONS,
    run: (ctx, payload) => ctx.editor.command.executeFont(String(payload))
  },
  {
    id: 'size',
    type: 'select',
    className: 'menu-item__size',
    title: '字号',
    value: 16,
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
    value: 'body',
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
    value: 1,
    options: [1, 1.25, 1.5, 1.75, 2, 2.5, 3].map(value => ({
      label: String(value),
      value
    })),
    run: (ctx, payload) => ctx.editor.command.executeRowMargin(Number(payload))
  },
  {
    id: 'page-columns',
    type: 'select',
    className: 'page-columns',
    label: '',
    title: '分栏',
    value: 1,
    options: [
      { label: '1栏', value: 1 },
      { label: '2栏', value: 2 },
      { label: '3栏', value: 3 }
    ],
    run: (ctx, payload) =>
      ctx.editor.command.executeRowColumns({
        count: Number(payload),
        gap: 24
      })
  },
  {
    id: 'tab-stops',
    type: 'select',
    className: 'menu-item__tab-stops',
    label: '',
    title: '制表位',
    value: 'left',
    options: [
      { label: '左对齐 120', value: 'left' },
      { label: '右对齐 120', value: 'right' },
      { label: '居中 120', value: 'center' },
      { label: '小数点 120', value: 'decimal' },
      { label: '竖线 120', value: 'bar' },
      { label: '清除制表位', value: 'clear' }
    ],
    run: (ctx, payload) => {
      if (payload === 'clear') {
        ctx.editor.command.executeSetTabStops(null)
        return
      }
      ctx.editor.command.executeSetTabStops([
        {
          alignment: String(payload) as
            | 'left'
            | 'center'
            | 'right'
            | 'decimal'
            | 'bar',
          position: 120
        }
      ])
    }
  },
  {
    id: 'row-indent',
    type: 'select',
    className: 'menu-item__row-indent',
    label: '',
    title: '段落缩进',
    value: 0,
    options: [
      { label: '取消首行缩进', value: 0 },
      { label: '首行缩进 1 字符', value: 16 },
      { label: '首行缩进 1.5 字符', value: 24 },
      { label: '首行缩进 2 字符', value: 32 },
      { label: '首行缩进 3 字符', value: 48 }
    ],
    run: (ctx, payload) => ctx.editor.command.executeRowIndent(Number(payload))
  },
  {
    id: 'list',
    type: 'select',
    className: 'menu-item__list',
    title: '列表',
    value: 'none',
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
    title: '插入 3x3 表格',
    run: ctx => ctx.editor.command.executeInsertTable(3, 3)
  },
  {
    id: 'image',
    type: 'button',
    className: 'menu-item__image',
    title: '插入图片',
    run: ctx => chooseImage(ctx)
  },
  {
    id: 'hyperlink',
    type: 'button',
    className: 'menu-item__hyperlink',
    title: '插入链接',
    run: ctx => promptHyperlink(ctx)
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
      ctx.editor.command.executeAddWatermark({
        data: 'canvas-editor',
        color: '#AEB5C0',
        size: 80,
        opacity: 0.12
      })
    }
  },
  {
    id: 'codeblock',
    type: 'button',
    className: 'menu-item__codeblock',
    title: '代码块',
    run: ctx =>
      ctx.editor.command.executeInsertElementList([
        { value: '\n' },
        { value: 'const editor = createCanvasEditorApp(options)' }
      ])
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
    run: (ctx, payload) => insertSimpleControl(ctx, payload as ControlType)
  },
  {
    id: 'control-business',
    type: 'button',
    className: 'menu-item__control-business',
    title: '控件业务融合测试',
    run: ctx => insertSimpleControl(ctx, ControlType.TEXT)
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
    type: 'select',
    className: 'menu-item__latex',
    label: '',
    title: '公式',
    value: 'blank',
    options: [
      { label: 'LaTeX 空白公式', value: 'blank' },
      { label: '自定义公式', value: 'custom' }
    ],
    run: ctx => insertInlineElement(ctx, ElementType.LATEX)
  },
  {
    id: 'date',
    type: 'select',
    className: 'menu-item__date',
    label: '',
    title: '日期',
    value: 'yyyy-MM-dd',
    options: [
      { label: 'yyyy', value: 'yyyy' },
      { label: 'yyyy-MM', value: 'yyyy-MM' },
      { label: 'yyyy-MM-dd', value: 'yyyy-MM-dd' },
      { label: 'yyyy-MM-dd hh:mm:ss', value: 'yyyy-MM-dd hh:mm:ss' }
    ],
    run: (ctx, payload) =>
      ctx.editor.command.executeInsertElementList([
        {
          type: ElementType.DATE,
          value: '',
          dateFormat: String(payload)
        }
      ])
  },
  {
    id: 'block',
    type: 'button',
    className: 'menu-item__block',
    title: '内容块',
    run: ctx => insertInlineElement(ctx, ElementType.BLOCK)
  },
  { id: 'document-divider', type: 'divider' },
  {
    id: 'search',
    type: 'button',
    className: 'menu-item__search',
    title: '搜索',
    run: ctx => promptSearch(ctx)
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
      { label: '开启留痕', value: 'toggle' },
      { label: '接受所有修订', value: 'accept-all' },
      { label: '拒绝所有修订', value: 'reject-all' }
    ],
    run: (ctx, payload) => {
      if (payload === 'accept-all') {
        ctx.editor.command.executeAcceptAllTrackChange()
        return
      }
      if (payload === 'reject-all') {
        ctx.editor.command.executeRejectAllTrackChange()
        return
      }
      ctx.editor.command.executeSetTrackChange({ enabled: true })
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
