import Editor from '../editor'
import type { IEditorData, IElement } from '../editor'
import { EditorMode, KeyMap, PageMode, PaperDirection } from '../editor'
import { Dialog } from '../components/dialog/Dialog'
import { INTERNAL_CONTEXT_MENU_KEY } from '../editor/dataset/constant/ContextMenu'
import { getFormulaContextMenus } from './formulaTools'
import { CanvasEditorAppReviewPanels } from './reviewPanels'
import { createToolbarItems, openSearchPanel } from './toolbar'
import type {
  CanvasEditorApp,
  CanvasEditorAppBuiltinFooterItemId,
  CanvasEditorAppContext,
  CanvasEditorAppFooterItemId,
  CanvasEditorAppHandlers,
  CanvasEditorAppListeners,
  CanvasEditorAppRegisterOptions,
  CanvasEditorAppState,
  CreateCanvasEditorAppOptions,
  FooterItem,
  ToolbarItem
} from './types'

const DEFAULT_STATE: CanvasEditorAppState = {
  pageNo: 1,
  pageSize: 1,
  visiblePageNoList: [1],
  scale: 1,
  mode: PageMode.PAGING,
  editorModeName: '编辑模式',
  paperSize: '794*1123',
  paperDirection: PaperDirection.VERTICAL,
  wordCount: 0,
  rowNo: 0,
  colNo: 0,
  fullscreen: false,
  rangeStyle: null
}

const PAPER_SIZE_OPTIONS = [
  { label: 'A4', value: '794*1123' },
  { label: 'A2', value: '1593*2251' },
  { label: 'A3', value: '1125*1593' },
  { label: 'A5', value: '565*796' },
  { label: '5号信封', value: '412*488' },
  { label: '6号信封', value: '450*866' },
  { label: '7号信封', value: '609*862' },
  { label: '9号信封', value: '862*1221' },
  { label: '法律用纸', value: '813*1266' },
  { label: '信纸', value: '813*1054' }
]

const PAPER_DIRECTION_OPTIONS = [
  { label: '纵向', value: PaperDirection.VERTICAL },
  { label: '横向', value: PaperDirection.HORIZONTAL }
]

const EDITOR_MODE_OPTIONS = [
  { label: '编辑模式', value: EditorMode.EDIT },
  { label: '清洁模式', value: EditorMode.CLEAN },
  { label: '只读模式', value: EditorMode.READONLY },
  { label: '表单模式', value: EditorMode.FORM },
  { label: '打印模式', value: EditorMode.PRINT },
  { label: '设计模式', value: EditorMode.DESIGN }
]

const DEFAULT_FOOTER_ITEMS: CanvasEditorAppBuiltinFooterItemId[] = [
  'catalog',
  'page-mode',
  'visible-page-no',
  'page-no',
  'word-count',
  'cursor-position',
  'editor-mode',
  'scale',
  'paper-size',
  'paper-direction',
  'paper-margin',
  'page-number-range',
  'fullscreen',
  'editor-option'
]

const BUILTIN_CONTEXT_MENU_KEYS = Object.values(INTERNAL_CONTEXT_MENU_KEY)
  .flatMap(group => Object.values(group))
  .filter((key): key is string => typeof key === 'string')

function getDialogValue(
  payload: { name: string; value: string }[],
  name: string
) {
  return payload.find(item => item.name === name)?.value || ''
}

function parseDialogPositiveInteger(
  value: string,
  fallback: number,
  min: number
) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.floor(parsed))
}

function parseDialogOptionalInteger(value: string) {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, Math.floor(parsed))
}

export class CanvasEditorAppImpl implements CanvasEditorApp {
  public editor: Editor
  public container: HTMLElement

  private options: CreateCanvasEditorAppOptions
  private root: HTMLDivElement
  private toolbar: HTMLDivElement
  private editorHost: HTMLDivElement
  private footer: HTMLDivElement
  private state: CanvasEditorAppState
  private toolbarNodes: Map<string, HTMLElement>
  private disposers: Array<() => void>
  private context: CanvasEditorAppContext
  private reviewPanels: CanvasEditorAppReviewPanels
  private pageScaleChangeVersion: number

  constructor(options: CreateCanvasEditorAppOptions) {
    this.options = options
    this.container = options.container
    this.state = {
      ...DEFAULT_STATE,
      scale: options.editor?.scale || DEFAULT_STATE.scale,
      mode: options.editor?.pageMode || DEFAULT_STATE.mode,
      editorModeName:
        EDITOR_MODE_OPTIONS.find(option => option.value === options.editor?.mode)
          ?.label || DEFAULT_STATE.editorModeName,
      paperSize: `${options.editor?.width || 794}*${options.editor?.height || 1123}`,
      paperDirection:
        options.editor?.paperDirection || DEFAULT_STATE.paperDirection
    }
    this.toolbarNodes = new Map()
    this.disposers = []
    this.pageScaleChangeVersion = 0

    this.root = document.createElement('div')
    this.toolbar = document.createElement('div')
    this.editorHost = document.createElement('div')
    this.footer = document.createElement('div')
    this.mountLayout()

    this.editor = new Editor(
      this.editorHost,
      options.value,
      {
        ...this.resolveEditorOptions(options.editor),
        locale: options.locale || options.editor?.locale
      }
    )
    this.context = {
      editor: this.editor,
      root: this.root,
      handlers: {},
      state: this.state
    }
    this.reviewPanels = new CanvasEditorAppReviewPanels({
      root: this.root,
      editorHost: this.editorHost,
      context: this.context,
      getOptions: () => this.options
    })
    this.context.handlers = this.resolveHandlers(options.handlers)
    this.applyRegisterOptions()
    this.bindEditorListeners()
    this.bindGlobalMenuClose()
    this.bindFullscreenListener()
    this.renderToolbar()
    this.renderFooter()
    this.updateWordCount()
  }

  public setValue(value: IEditorData | IElement[]) {
    const payload = Array.isArray(value) ? { main: value } : value
    this.editor.command.executeSetValue(payload)
  }

  public getValue() {
    return this.editor.command.getValue()
  }

  public updateOptions(options: Partial<CreateCanvasEditorAppOptions>) {
    this.options = {
      ...this.options,
      ...options,
      editor: {
        ...this.options.editor,
        ...options.editor
      },
      ui: {
        ...this.options.ui,
        ...options.ui,
        layout: {
          ...this.options.ui?.layout,
          ...options.ui?.layout
        },
        toolbar: {
          ...this.options.ui?.toolbar,
          ...options.ui?.toolbar
        },
        footer: {
          ...this.options.ui?.footer,
          ...options.ui?.footer
        },
        contextMenu: {
          ...this.options.ui?.contextMenu,
          ...options.ui?.contextMenu
        },
        theme: {
          ...this.options.ui?.theme,
          ...options.ui?.theme
        }
      },
      listeners: {
        ...this.options.listeners,
        ...options.listeners
      },
      register: {
        ...this.options.register,
        ...options.register
      },
      handlers: {
        ...this.options.handlers,
        ...options.handlers
      }
    }
    this.context.handlers = this.resolveHandlers(this.options.handlers)
    this.reviewPanels.syncLayout()
    this.reviewPanels.updateComment()
    this.reviewPanels.updateTrackChangePanel()
    if (options.editor || options.ui?.contextMenu) {
      this.editor.command.executeUpdateOptions(
        this.resolveEditorOptions(this.options.editor) as Parameters<
          typeof this.editor.command.executeUpdateOptions
        >[0]
      )
    }
    if (options.register || options.ui?.contextMenu) {
      this.applyRegisterOptions(options.register, options.ui?.contextMenu)
    }
    this.applyRootClass()
    this.renderToolbar()
    this.renderFooter()
  }

  public register(registerOptions: CanvasEditorAppRegisterOptions) {
    this.options = {
      ...this.options,
      register: {
        ...this.options.register,
        contextMenus: [
          ...(this.options.register?.contextMenus || []),
          ...(registerOptions.contextMenus || [])
        ],
        shortcuts: [
          ...(this.options.register?.shortcuts || []),
          ...(registerOptions.shortcuts || [])
        ],
        setup: registerOptions.setup || this.options.register?.setup
      }
    }
    this.applyRegisterOptions(registerOptions)
  }

  public on(listeners: CanvasEditorAppListeners) {
    this.options = {
      ...this.options,
      listeners: {
        ...this.options.listeners,
        ...listeners
      }
    }
    return () => {
      const currentListeners = this.options.listeners || {}
      const nextListeners = { ...currentListeners }
      ;(Object.keys(listeners) as Array<keyof CanvasEditorAppListeners>).forEach(
        key => {
          if (nextListeners[key] === listeners[key]) {
            delete nextListeners[key]
          }
        }
      )
      this.options = {
        ...this.options,
        listeners: nextListeners
      }
    }
  }

  public destroy() {
    this.disposers.forEach(dispose => dispose())
    this.disposers = []
    this.reviewPanels.dispose()
    this.editor.destroy()
    this.root.remove()
  }

  private mountLayout() {
    this.container.innerHTML = ''
    this.applyRootClass()
    this.toolbar.className = 'ce-toolbar menu'
    this.editorHost.className = 'ce-editor'
    this.footer.className = 'ce-footer footer'

    this.root.append(this.toolbar)
    this.root.append(this.editorHost)
    this.root.append(this.footer)
    this.container.append(this.root)
  }

  private applyRootClass() {
    const density = this.options.ui?.theme?.density || 'normal'
    const className = this.options.ui?.theme?.className
    this.root.className = ['ce-app', `ce-app--${density}`, className]
      .filter(Boolean)
      .join(' ')
  }

  private resolveHandlers(handlers: CanvasEditorAppHandlers = {}) {
    return {
      toggleCatalog: () => {
        this.reviewPanels.toggleCatalog()
      },
      toggleTrackChange: (
        _ctx: CanvasEditorAppContext,
        enabled?: boolean
      ) => {
        this.toggleTrackChange(enabled)
      },
      toggleTrackChangePanel: (
        _ctx: CanvasEditorAppContext,
        visible?: boolean
      ) => {
        this.reviewPanels.setTrackChangePanelVisible(visible)
      },
      acceptAllTrackChange: () => {
        this.editor.command.executeAcceptAllTrackChange()
        this.reviewPanels.updateTrackChangePanel()
        this.renderToolbarState()
      },
      rejectAllTrackChange: () => {
        this.editor.command.executeRejectAllTrackChange()
        this.reviewPanels.updateTrackChangePanel()
        this.renderToolbarState()
      },
      ...handlers
    }
  }

  private toggleTrackChange(enabled?: boolean) {
    const trackChange = this.editor.command.getOptions().trackChange
    const nextEnabled = enabled ?? !trackChange.enabled
    this.editor.command.executeSetTrackChange({
      enabled: nextEnabled,
      author: this.resolveTrackChangeAuthor()
    })
    this.reviewPanels.setTrackChangePanelVisible(nextEnabled)
    this.reviewPanels.updateTrackChangePanel()
    this.renderToolbarState()
  }

  private resolveTrackChangeAuthor() {
    return (
      this.options.handlers?.getTrackChangeAuthor?.(this.context) ||
      this.editor.command.getOptions().trackChange.author ||
      '匿名用户'
    )
  }

  private bindEditorListeners() {
    this.editor.listener.rangeStyleChange = payload => {
      this.state.rangeStyle = payload
      this.updateCursorPosition()
      this.reviewPanels.syncActiveComment(payload)
      this.renderToolbarState()
      this.options.listeners?.rangeStyleChange?.(payload)
    }
    this.editor.listener.visiblePageNoListChange = payload => {
      this.state.visiblePageNoList = payload.map(pageNo => pageNo + 1)
      this.updateFooterText(
        'page-no-list',
        this.state.visiblePageNoList.join('、') || '1'
      )
      this.reviewPanels.scheduleReviewLinksRender()
      this.options.listeners?.visiblePageNoListChange?.(payload)
    }
    this.editor.listener.pageSizeChange = payload => {
      this.state.pageSize = Math.max(1, payload)
      this.updateFooterText('page-size', this.state.pageSize)
      this.reviewPanels.scheduleReviewLinksRender()
      this.options.listeners?.pageSizeChange?.(payload)
    }
    this.editor.listener.intersectionPageNoChange = payload => {
      this.state.pageNo = Math.max(1, payload + 1)
      this.updateFooterText('page-no', this.state.pageNo)
      this.reviewPanels.scheduleReviewLinksRender()
      this.options.listeners?.intersectionPageNoChange?.(payload)
    }
    this.editor.listener.pageScaleChange = payload => {
      this.pageScaleChangeVersion++
      this.state.scale = payload
      this.updateFooterText(
        'page-scale-percentage',
        `${Math.round(this.state.scale * 100)}%`
      )
      this.options.listeners?.pageScaleChange?.(payload)
    }
    this.editor.listener.pageModeChange = payload => {
      this.state.mode = payload
      this.renderFooter()
      this.options.listeners?.pageModeChange?.(payload)
    }
    this.editor.listener.contentChange = () => {
      this.updateWordCount()
      this.reviewPanels.handleContentChange()
      this.options.listeners?.contentChange?.()
    }
  }

  private renderToolbar() {
    const enabled = this.options.ui?.layout?.toolbar !== false
    this.toolbar.hidden = !enabled
    this.toolbar.innerHTML = ''
    this.toolbarNodes.clear()
    if (!enabled) return

    const preset = this.options.ui?.preset || 'standard'
    const items = createToolbarItems(preset, this.options.ui?.toolbar)
    let group = this.createToolbarGroup()
    this.toolbar.append(group)
    items.forEach(item => {
      if (item.when && !item.when(this.context)) return
      if (item.type === 'divider') {
        if (group.childElementCount) {
          this.toolbar.append(this.createToolbarDivider())
        }
        group = this.createToolbarGroup()
        this.toolbar.append(group)
        return
      }
      const node = this.createToolbarNode(item)
      group.append(node)
      this.toolbarNodes.set(item.id, node)
    })
    if (!group.childElementCount) {
      group.remove()
    }
    if (this.toolbar.lastElementChild?.classList.contains('menu-divider')) {
      this.toolbar.lastElementChild.remove()
    }
    this.renderToolbarState()
  }

  private createToolbarGroup() {
    const group = document.createElement('div')
    group.className = 'menu-item'
    return group
  }

  private createToolbarDivider() {
    const divider = document.createElement('div')
    divider.className = 'menu-divider'
    return divider
  }

  private createToolbarNode(item: ToolbarItem) {
    if (item.type === 'select') {
      return this.createSelectToolbarNode(item)
    }
    if (item.type === 'color') {
      const label = document.createElement('div')
      label.className = item.className || `menu-item__${item.id}`
      label.title = item.title || item.id
      const icon = document.createElement('i')
      const swatch = document.createElement('span')
      const input = document.createElement('input')
      input.type = 'color'
      input.id = item.id
      input.value = String(item.value || '#000000')
      swatch.style.backgroundColor = input.value
      input.oninput = () => {
        if (this.isToolbarItemDisabled(item)) return
        swatch.style.backgroundColor = input.value
        this.runToolbarItem(item, input.value)
      }
      label.append(icon, swatch, input)
      return label
    }

    const button = document.createElement('div')
    button.className = item.className || `menu-item__${item.id}`
    button.title = item.title || item.id
    const icon = document.createElement('i')
    if (item.id === 'save' && item.label) {
      icon.textContent = item.label
    }
    button.append(icon)
    if (item.runDblclick) {
      let clickTimer: number | null = null
      button.onclick = () => {
        if (this.isToolbarItemDisabled(item)) return
        if (clickTimer !== null) {
          window.clearTimeout(clickTimer)
        }
        clickTimer = window.setTimeout(() => {
          clickTimer = null
          this.runToolbarItem(item)
        }, 200)
      }
      button.ondblclick = evt => {
        evt.preventDefault()
        if (this.isToolbarItemDisabled(item)) return
        if (clickTimer !== null) {
          window.clearTimeout(clickTimer)
          clickTimer = null
        }
        Promise.resolve(item.runDblclick?.(this.context)).catch(error => {
          this.handleError(error)
        })
      }
    } else {
      button.onclick = () => {
        if (this.isToolbarItemDisabled(item)) return
        this.runToolbarItem(item)
      }
    }
    return button
  }

  private resolveToolbarSelectLabel(
    label: string | ((ctx: CanvasEditorAppContext) => string)
  ) {
    return typeof label === 'function' ? label(this.context) : label
  }

  private resolveToolbarValue(item: ToolbarItem) {
    return typeof item.value === 'function'
      ? item.value(this.context)
      : item.value
  }

  private resolveToolbarSelectedOption(item: ToolbarItem) {
    const value = this.resolveToolbarValue(item)
    return (
      item.options?.find(option => option.value === value) ||
      item.options?.[0]
    )
  }

  private setToolbarSelectText(
    select: HTMLElement,
    item: ToolbarItem,
    label: string
  ) {
    const displayLabel = item.label === '' ? '' : label
    if (select.dataset.label === displayLabel) return
    select.dataset.label = displayLabel
    select.textContent = displayLabel
    if (!displayLabel && item.label !== '') {
      select.append(document.createElement('i'))
    }
  }

  private syncSelectToolbarNode(node: HTMLElement, item: ToolbarItem) {
    const selected = this.resolveToolbarSelectedOption(item)
    const select = node.querySelector<HTMLElement>('.select')
    if (select && selected) {
      this.setToolbarSelectText(
        select,
        item,
        this.resolveToolbarSelectLabel(selected.label)
      )
    }
  }

  private createSelectToolbarNode(item: ToolbarItem) {
    const node = document.createElement('div')
    node.className = item.className || `menu-item__${item.id}`
    node.title = item.title || item.id
    const icon = document.createElement('i')
    const select = document.createElement('span')
    select.className = 'select'
    const selected = this.resolveToolbarSelectedOption(item)
    this.setToolbarSelectText(
      select,
      item,
      selected ? this.resolveToolbarSelectLabel(selected.label) : item.label || item.id
    )

    const options = document.createElement('div')
    options.className = 'options'
    const list = document.createElement('ul')
    const optionNodes: HTMLLIElement[] = []
    const syncOptionLabels = () => {
      const value = this.resolveToolbarValue(item)
      item.options?.forEach((option, index) => {
        const optionNode = optionNodes[index]
        if (!optionNode) return
        const label = this.resolveToolbarSelectLabel(option.label)
        optionNode.textContent = label
        optionNode.classList.toggle('active', option.value === value)
        if (!label) {
          optionNode.append(document.createElement('i'))
        }
      })
    }
    item.options?.forEach(option => {
      const optionNode = document.createElement('li')
      optionNode.dataset.value = String(option.value)
      const optionLabel = this.resolveToolbarSelectLabel(option.label)
      optionNode.textContent = optionLabel
      if (!optionLabel) {
        optionNode.append(document.createElement('i'))
      }
      optionNode.onclick = evt => {
        evt.stopPropagation()
        syncOptionLabels()
        const label = this.resolveToolbarSelectLabel(option.label)
        this.setToolbarSelectText(select, item, label)
        options.classList.remove('visible')
        this.syncOptionsOpenClass()
        this.runToolbarItem(item, option.value)
      }
      optionNodes.push(optionNode)
      list.append(optionNode)
    })
    options.append(list)
    node.onclick = evt => {
      evt.stopPropagation()
      if (this.isToolbarItemDisabled(item)) return
      syncOptionLabels()
      this.closeVisibleOptions(options)
      options.classList.toggle('visible')
      this.syncOptionsOpenClass()
    }
    node.append(icon, select, options)
    return node
  }

  private runToolbarItem(item: ToolbarItem, payload?: string | number) {
    this.closeTransientPanels()
    Promise.resolve(item.run?.(this.context, payload)).catch(error => {
      const handlers: CanvasEditorAppHandlers = this.context.handlers
      if (handlers.onError) {
        handlers.onError(error, this.context)
        return
      }
      throw error
    })
  }

  private closeTransientPanels() {
    this.root
      .querySelectorAll<HTMLElement>(
        [
          '.ce-app-table-picker',
          '.ce-app-page-columns-panel',
          '.ce-app-row-indent-panel',
          '.ce-app-tab-stops-panel',
          '.ce-app-formula-picker',
          '.ce-app-search-panel'
        ].join(',')
      )
      .forEach(node => node.remove())
  }

  private isToolbarItemDisabled(item: ToolbarItem) {
    return (
      !!item.disabled?.(this.context) ||
      (this.state.editorModeName === '只读模式' &&
        item.id !== 'search' &&
        item.id !== 'print')
    )
  }

  private resolveEditorOptions(editorOptions = this.options.editor) {
    const contextMenu = this.options.ui?.contextMenu
    const disabledKeys = new Set(editorOptions?.contextMenuDisableKeys || [])
    contextMenu?.disableKeys?.forEach(key => disabledKeys.add(key))
    if (contextMenu?.mode === 'custom' || contextMenu?.mode === 'none') {
      BUILTIN_CONTEXT_MENU_KEYS.forEach(key => disabledKeys.add(key))
    }
    return {
      ...editorOptions,
      contextMenuDisableKeys: Array.from(disabledKeys)
    }
  }

  private applyRegisterOptions(
    register = this.options.register,
    contextMenu = this.options.ui?.contextMenu
  ) {
    if (contextMenu?.mode !== 'none') {
      const reviewContextMenus = this.reviewPanels.getContextMenus()
      if (reviewContextMenus.length) {
        this.editor.register.contextMenuList(reviewContextMenus)
      }
      const formulaContextMenus = getFormulaContextMenus(this.context)
      if (formulaContextMenus.length) {
        this.editor.register.contextMenuList(formulaContextMenus)
      }
      if (contextMenu?.menus?.length) {
        this.editor.register.contextMenuList(contextMenu.menus)
      }
      if (register?.contextMenus?.length) {
        this.editor.register.contextMenuList(register.contextMenus)
      }
    }
    if (this.options.ui?.layout?.toolbar !== false) {
      this.editor.register.shortcutList([
        {
          key: KeyMap.P,
          mod: true,
          isGlobal: true,
          callback: command => {
            const result = this.context.handlers.print
              ? this.context.handlers.print(this.context)
              : command.executePrint()
            return result
          }
        },
        {
          key: KeyMap.F,
          mod: true,
          isGlobal: true,
          callback: command => openSearchPanel(this.context, command.getRangeText())
        },
        {
          key: KeyMap.MINUS,
          ctrl: true,
          isGlobal: true,
          callback: command => {
            const version = this.pageScaleChangeVersion
            command.executePageScaleMinus()
            this.syncScaleFromOptions()
            this.emitPageScaleChangeFallback(version)
          }
        },
        {
          key: KeyMap.EQUAL,
          ctrl: true,
          isGlobal: true,
          callback: command => {
            const version = this.pageScaleChangeVersion
            command.executePageScaleAdd()
            this.syncScaleFromOptions()
            this.emitPageScaleChangeFallback(version)
          }
        },
        {
          key: KeyMap.ZERO,
          ctrl: true,
          isGlobal: true,
          callback: command => {
            const version = this.pageScaleChangeVersion
            command.executePageScaleRecovery()
            this.syncScaleFromOptions()
            this.emitPageScaleChangeFallback(version)
          }
        }
      ])
    }
    if (register?.shortcuts?.length) {
      this.editor.register.shortcutList(register.shortcuts)
    }
    if (register?.setup) {
      Promise.resolve(register.setup(this.context))
        .then(dispose => {
          if (typeof dispose === 'function') {
            this.disposers.push(dispose)
          }
        })
        .catch(error => {
          const handlers: CanvasEditorAppHandlers = this.context.handlers
          if (handlers.onError) {
            handlers.onError(error, this.context)
            return
          }
          throw error
        })
    }
  }

  private renderToolbarState() {
    const toolbarItems = createToolbarItems(
      this.options.ui?.preset || 'standard',
      this.options.ui?.toolbar
    )
    this.toolbarNodes.forEach((node, id) => {
      const item = toolbarItems.find(toolbarItem => toolbarItem.id === id)
      if (!item) return
      const isActive = !!item.active?.(this.context)
      const isDisabled = this.isToolbarItemDisabled(item)
      node.classList.toggle('is-active', isActive)
      node.classList.toggle('active', isActive)
      node.classList.toggle('disable', isDisabled)
      node.classList.toggle('no-allow', isDisabled)
      const input = node.querySelector<HTMLInputElement>('input')
      if (input) input.disabled = isDisabled
      if (item.type === 'select') {
        this.syncSelectToolbarNode(node, item)
      }
    })
  }

  private renderFooter() {
    const enabled = this.options.ui?.layout?.footer !== false
    this.footer.hidden = !enabled
    if (!enabled) return
    const scale = `${Math.round(this.state.scale * 100)}%`
    this.footer.innerHTML = ''
    const left = document.createElement('div')
    left.className = 'ce-footer__left'
    const center = document.createElement('div')
    center.className = 'ce-footer__center'

    const catalogMode = this.createBuiltinFooterItem(
      'catalog',
      this.createFooterIconButton('catalog-mode', '目录', () => {
        this.closeTransientPanels()
        return this.context.handlers.toggleCatalog?.(this.context)
      })
    )

    const pageMode = this.createBuiltinFooterItem(
      'page-mode',
      this.createPageModeFooterItem()
    )

    if (catalogMode) left.append(catalogMode)
    if (pageMode) left.append(pageMode)
    const visiblePageNo = this.createBuiltinFooterItem(
      'visible-page-no',
      this.createFooterText(
          '可见页码：',
          'page-no-list',
          this.state.visiblePageNoList.join('、') || '1'
      )
    )
    if (visiblePageNo) left.append(visiblePageNo)
    if (this.footerItemEnabled('page-no')) {
      const page = this.createBuiltinFooterItem(
        'page-no',
        this.createPageNoFooterItem()
      )
      if (page) left.append(page)
    }
    const wordCount = this.createBuiltinFooterItem(
      'word-count',
      this.createFooterText('字数：', 'word-count', this.state.wordCount)
    )
    if (wordCount) left.append(wordCount)
    if (this.footerItemEnabled('cursor-position')) {
      const rowNo = this.createBuiltinFooterItem(
        'cursor-position',
        this.createFooterText('行：', 'row-no', this.state.rowNo)
      )
      const colNo = this.createBuiltinFooterItem(
        'cursor-position',
        this.createFooterText('列：', 'col-no', this.state.colNo)
      )
      if (rowNo) left.append(rowNo)
      if (colNo) left.append(colNo)
    }

    const mode = this.createBuiltinFooterItem(
      'editor-mode',
      this.createEditorModeFooterItem()
    )
    if (mode) center.append(mode)

    const right = document.createElement('div')
    right.className = 'ce-footer__right'
    if (this.footerItemEnabled('scale')) {
      const scaleItem = this.createBuiltinFooterItem(
        'scale',
        this.createScaleFooterItem(scale)
      )
      if (scaleItem) right.append(scaleItem)
    }
    if (this.footerItemEnabled('paper-size')) {
      const paperSize = this.createBuiltinFooterItem(
        'paper-size',
        this.createFooterMenu(
          'paper-size',
          '纸张类型',
          PAPER_SIZE_OPTIONS,
          this.state.paperSize,
          value => {
            const [width, height] = String(value).split('*').map(Number)
            this.state.paperSize = String(value)
            this.editor.command.executePaperSize(width, height)
            this.renderFooter()
          }
        )
      )
      if (paperSize) right.append(paperSize)
    }
    if (this.footerItemEnabled('paper-direction')) {
      const paperDirection = this.createBuiltinFooterItem(
        'paper-direction',
        this.createFooterMenu(
          'paper-direction',
          '纸张方向',
          PAPER_DIRECTION_OPTIONS,
          this.state.paperDirection,
          value => {
            this.state.paperDirection = String(value)
            this.editor.command.executePaperDirection(value as PaperDirection)
            this.renderFooter()
          }
        )
      )
      if (paperDirection) right.append(paperDirection)
    }
    if (this.footerItemEnabled('paper-margin')) {
      const paperMargin = this.createBuiltinFooterItem(
        'paper-margin',
        this.createFooterIconButton('paper-margin', '页边距', () => {
          if (this.options.handlers?.openPaperMargin) {
            return this.options.handlers.openPaperMargin(this.context)
          }
          return this.openPaperMarginDialog()
        })
      )
      if (paperMargin) right.append(paperMargin)
    }
    if (this.footerItemEnabled('page-number-range')) {
      const pageNumberRange = this.createBuiltinFooterItem(
        'page-number-range',
        this.createFooterIconButton('page-number-range', '页码范围', () => {
          if (this.options.handlers?.openPageNumberRange) {
            return this.options.handlers.openPageNumberRange(this.context)
          }
          return this.openPageNumberRangeDialog()
        })
      )
      if (pageNumberRange) right.append(pageNumberRange)
    }
    if (this.footerItemEnabled('fullscreen')) {
      const fullscreen = this.createBuiltinFooterItem(
        'fullscreen',
        this.createFooterIconButton(
          `fullscreen${this.state.fullscreen ? ' exist' : ''}`,
          '全屏显示',
          () => this.toggleFullscreen()
        )
      )
      if (fullscreen) right.append(fullscreen)
    }
    if (this.footerItemEnabled('editor-option')) {
      const editorOption = this.createBuiltinFooterItem(
        'editor-option',
        this.createFooterIconButton('editor-option', '编辑器设置', () => {
          if (this.options.handlers?.openEditorOptions) {
            return this.options.handlers.openEditorOptions(this.context)
          }
          return this.openEditorOptionsDialog()
        })
      )
      if (editorOption) right.append(editorOption)
    }
    const appendedFooterItems = this.options.ui?.footer?.append || []
    appendedFooterItems.forEach(item => {
      if (!this.customFooterItemEnabled(item)) return
      const node = this.createCustomFooterItem(item)
      const align = item.align || 'right'
      if (align === 'left') {
        left.append(node)
      } else if (align === 'center') {
        center.append(node)
      } else {
        right.append(node)
      }
    })

    this.footer.append(left)
    if (center.childElementCount) this.footer.append(center)
    this.footer.append(right)
  }

  private footerItemEnabled(id: CanvasEditorAppFooterItemId) {
    if (id === 'catalog' && this.options.ui?.layout?.catalog === false) {
      return false
    }
    const footer = this.options.ui?.footer
    const include = footer?.include
    if (include && !include.includes(id)) return false
    if (footer?.exclude?.includes(id)) return false
    return DEFAULT_FOOTER_ITEMS.includes(id as CanvasEditorAppBuiltinFooterItemId)
  }

  private customFooterItemEnabled(item: FooterItem) {
    const footer = this.options.ui?.footer
    const include = footer?.include
    if (include && !include.includes(item.id)) return false
    if (footer?.exclude?.includes(item.id)) return false
    return !item.when || item.when(this.context)
  }

  private createBuiltinFooterItem(
    id: CanvasEditorAppBuiltinFooterItemId,
    node: HTMLElement
  ) {
    if (!this.footerItemEnabled(id)) return null
    const replacement = this.options.ui?.footer?.replace?.[id]
    if (replacement) {
      return this.createCustomFooterItem(replacement)
    }
    return node
  }

  private createCustomFooterItem(item: FooterItem) {
    if (item.render) {
      return item.render(this.context)
    }
    const button = document.createElement('button')
    button.type = 'button'
    button.className = item.className || `ce-footer__item ce-footer__${item.id}`
    button.title = item.title || item.id
    button.disabled = !!item.disabled?.(this.context)
    const label =
      typeof item.label === 'function' ? item.label(this.context) : item.label
    button.textContent = `${label ?? item.title ?? item.id}`
    button.onclick = evt => {
      evt.stopPropagation()
      if (button.disabled || !item.run) return
      Promise.resolve(item.run(this.context)).catch(error => {
        const handlers: CanvasEditorAppHandlers = this.context.handlers
        if (handlers.onError) {
          handlers.onError(error, this.context)
          return
        }
        throw error
      })
    }
    return button
  }

  private createPageNoFooterItem() {
    const page = this.createFooterText('页面：', 'page-no', this.state.pageNo)
    const pageSize = document.createElement('span')
    pageSize.textContent = '/'
    const pageSizeValue = document.createElement('span')
    pageSizeValue.className = 'page-size'
    pageSizeValue.textContent = `${this.state.pageSize}`
    page.append(pageSize, pageSizeValue)
    return page
  }

  private createScaleFooterItem(scale: string) {
    const fragment = document.createElement('span')
    fragment.className = 'ce-footer__scale'
    const minus = this.createFooterIconButton(
      'page-scale-minus',
      '缩小(Ctrl+-)',
      () => {
        const version = this.pageScaleChangeVersion
        this.editor.command.executePageScaleMinus()
        this.syncScaleFromOptions()
        this.emitPageScaleChangeFallback(version)
      }
    )
    const zoom = document.createElement('span')
    zoom.className = 'page-scale-percentage'
    zoom.title = '显示比例(点击可复原Ctrl+0)'
    zoom.textContent = scale
    zoom.onclick = () => {
      const version = this.pageScaleChangeVersion
      this.editor.command.executePageScaleRecovery()
      this.syncScaleFromOptions()
      this.emitPageScaleChangeFallback(version)
    }
    const add = this.createFooterIconButton(
      'page-scale-add',
      '放大(Ctrl+=)',
      () => {
        const version = this.pageScaleChangeVersion
        this.editor.command.executePageScaleAdd()
        this.syncScaleFromOptions()
        this.emitPageScaleChangeFallback(version)
      }
    )
    fragment.append(minus, zoom, add)
    return fragment
  }

  private createPageModeFooterItem() {
    const pageMode = document.createElement('div')
    pageMode.className = 'page-mode'
    pageMode.title = '页面模式(分页、连页)'
    const pageModeIcon = document.createElement('i')
    const pageModeOptions = document.createElement('div')
    pageModeOptions.className = 'options'
    const pageModeList = document.createElement('ul')
    ;[
      { label: '分页', value: PageMode.PAGING },
      { label: '连页', value: PageMode.CONTINUITY }
    ].forEach(option => {
      const optionNode = document.createElement('li')
      optionNode.textContent = option.label
      optionNode.classList.toggle('active', this.state.mode === option.value)
      optionNode.onclick = evt => {
        evt.stopPropagation()
        pageModeOptions.classList.remove('visible')
        this.syncOptionsOpenClass()
        this.editor.command.executePageMode(option.value)
      }
      pageModeList.append(optionNode)
    })
    pageModeOptions.append(pageModeList)
    pageMode.onclick = evt => {
      evt.stopPropagation()
      this.closeVisibleOptions(pageModeOptions)
      pageModeOptions.classList.toggle('visible')
      this.syncOptionsOpenClass()
    }
    pageMode.append(pageModeIcon, pageModeOptions)
    return pageMode
  }

  private createEditorModeFooterItem() {
    const mode = document.createElement('div')
    mode.className = 'editor-mode'
    mode.title = '编辑模式(编辑、清洁、只读、表单、设计)'
    const label = document.createElement('span')
    label.className = 'editor-mode__label'
    label.textContent = this.state.editorModeName || DEFAULT_STATE.editorModeName
    const optionsNode = document.createElement('div')
    optionsNode.className = 'options'
    const list = document.createElement('ul')
    EDITOR_MODE_OPTIONS.forEach(option => {
      const item = document.createElement('li')
      item.dataset.value = option.value
      item.textContent = option.label
      item.classList.toggle('active', this.state.editorModeName === option.label)
      item.onclick = evt => {
        evt.stopPropagation()
        optionsNode.classList.remove('visible')
        this.syncOptionsOpenClass()
        this.setEditorMode(option)
      }
      list.append(item)
    })
    optionsNode.append(list)
    mode.onclick = evt => {
      evt.stopPropagation()
      this.closeVisibleOptions(optionsNode)
      optionsNode.classList.toggle('visible')
      this.syncOptionsOpenClass()
    }
    mode.append(label, optionsNode)
    return mode
  }

  private createFooterText(
    label: string,
    className: string,
    value: string | number
  ) {
    const wrapper = document.createElement('span')
    wrapper.textContent = label
    const valueNode = document.createElement('span')
    valueNode.className = className
    valueNode.textContent = `${value}`
    wrapper.append(valueNode)
    return wrapper
  }

  private createFooterIconButton(
    className: string,
    title: string,
    onClick?: () => void | Promise<void>
  ) {
    const button = document.createElement('div')
    button.className = className
    button.title = title
    button.onclick = evt => {
      evt.stopPropagation()
      if (!onClick) return
      Promise.resolve(onClick()).catch(error => {
        const handlers: CanvasEditorAppHandlers = this.context.handlers
        if (handlers.onError) {
          handlers.onError(error, this.context)
          return
        }
        throw error
      })
    }
    button.append(document.createElement('i'))
    return button
  }

  private createFooterMenu(
    className: string,
    title: string,
    options: Array<{ label: string; value: string }>,
    value: string,
    onSelect: (value: string) => void
  ) {
    const menu = document.createElement('div')
    menu.className = className
    const icon = document.createElement('i')
    icon.title = title
    const optionsNode = document.createElement('div')
    optionsNode.className = 'options'
    const list = document.createElement('ul')
    options.forEach(option => {
      const item = document.createElement('li')
      item.dataset.value = option.value
      item.textContent = option.label
      item.classList.toggle('active', option.value === value)
      item.onclick = evt => {
        evt.stopPropagation()
        optionsNode.classList.remove('visible')
        this.syncOptionsOpenClass()
        onSelect(option.value)
      }
      list.append(item)
    })
    optionsNode.append(list)
    menu.onclick = evt => {
      evt.stopPropagation()
      this.closeVisibleOptions(optionsNode)
      optionsNode.classList.toggle('visible')
      this.syncOptionsOpenClass()
    }
    menu.append(icon, optionsNode)
    return menu
  }

  private openEditorOptionsDialog() {
    new Dialog({
      title: '编辑器配置',
      data: [
        {
          type: 'textarea',
          name: 'option',
          width: 350,
          height: 300,
          required: true,
          value: JSON.stringify(this.editor.command.getOptions(), null, 2),
          placeholder: '请输入编辑器配置'
        }
      ],
      onConfirm: payload => {
        try {
          const newOptionValue = getDialogValue(payload, 'option')
          if (!newOptionValue) return
          this.editor.command.executeUpdateOptions(JSON.parse(newOptionValue))
        } catch (error) {
          this.handleError(error)
        }
      }
    })
  }

  private openPaperMarginDialog() {
    const [topMargin, rightMargin, bottomMargin, leftMargin] =
      this.editor.command.getPaperMargin()
    new Dialog({
      title: '页边距',
      data: [
        {
          type: 'text',
          label: '上边距',
          name: 'top',
          required: true,
          value: `${topMargin}`,
          placeholder: '请输入上边距'
        },
        {
          type: 'text',
          label: '下边距',
          name: 'bottom',
          required: true,
          value: `${bottomMargin}`,
          placeholder: '请输入下边距'
        },
        {
          type: 'text',
          label: '左边距',
          name: 'left',
          required: true,
          value: `${leftMargin}`,
          placeholder: '请输入左边距'
        },
        {
          type: 'text',
          label: '右边距',
          name: 'right',
          required: true,
          value: `${rightMargin}`,
          placeholder: '请输入右边距'
        }
      ],
      onConfirm: payload => {
        const top = getDialogValue(payload, 'top')
        const bottom = getDialogValue(payload, 'bottom')
        const left = getDialogValue(payload, 'left')
        const right = getDialogValue(payload, 'right')
        if (!top || !bottom || !left || !right) return
        this.editor.command.executeSetPaperMargin([
          Number(top),
          Number(right),
          Number(bottom),
          Number(left)
        ])
      }
    })
  }

  private openPageNumberRangeDialog() {
    const pageNumber = this.editor.command.getOptions().pageNumber || {}
    const fromPageNo = (pageNumber.fromPageNo ?? 0) + 1
    const isContinueMode =
      (pageNumber.startPageNo ?? 1) === 1 && (pageNumber.fromPageNo ?? 0) === 0

    new Dialog({
      title: '页码范围',
      data: [
        {
          type: 'select',
          label: '编号模式',
          name: 'mode',
          required: true,
          value: isContinueMode ? 'continue' : 'restart',
          options: [
            {
              label: '续编',
              value: 'continue'
            },
            {
              label: '重新编号',
              value: 'restart'
            }
          ]
        },
        {
          type: 'number',
          label: '起始页码',
          name: 'startPageNo',
          required: true,
          value: `${pageNumber.startPageNo ?? 1}`,
          placeholder: '请输入起始页码'
        },
        {
          type: 'number',
          label: '起始页（1起）',
          name: 'fromPageNo',
          required: true,
          value: `${fromPageNo}`,
          placeholder: '请输入起始页'
        },
        {
          type: 'number',
          label: '最大页数',
          name: 'maxPageNo',
          value: pageNumber.maxPageNo == null ? '' : `${pageNumber.maxPageNo}`,
          placeholder: '留空表示不限'
        }
      ],
      onConfirm: payload => {
        const mode = getDialogValue(payload, 'mode') || 'continue'
        const startPageNo = parseDialogPositiveInteger(
          getDialogValue(payload, 'startPageNo'),
          pageNumber.startPageNo ?? 1,
          1
        )
        const selectedFromPageNo = parseDialogPositiveInteger(
          getDialogValue(payload, 'fromPageNo'),
          fromPageNo,
          1
        )
        const maxPageNo = parseDialogOptionalInteger(
          getDialogValue(payload, 'maxPageNo')
        )

        if (mode === 'continue') {
          this.editor.command.executePageNumberContinue()
        } else {
          this.editor.command.executePageNumberRestart({
            startPageNo,
            fromPageNo: selectedFromPageNo - 1
          })
        }

        this.editor.command.executePageNumberRange({
          fromPageNo: selectedFromPageNo - 1,
          maxPageNo
        })
      }
    })
  }

  private handleError(error: unknown) {
    if (this.context.handlers.onError) {
      this.context.handlers.onError(error, this.context)
      return
    }
    throw error
  }

  private setEditorMode(option: (typeof EDITOR_MODE_OPTIONS)[number]) {
    this.state.editorModeName = option.label
    this.editor.command.executeMode(option.value)
    this.renderToolbarState()
    this.renderFooter()
  }

  private updateCursorPosition() {
    const rangeContext = this.editor.command.getRangeContext()
    if (!rangeContext) return
    this.state.rowNo = rangeContext.startRowNo + 1
    this.state.colNo = rangeContext.startColNo + 1
    this.updateFooterText('row-no', this.state.rowNo)
    this.updateFooterText('col-no', this.state.colNo)
  }

  private async updateWordCount() {
    const wordCount = await this.editor.command.getWordCount()
    this.state.wordCount = wordCount || 0
    this.updateFooterText('word-count', this.state.wordCount)
  }

  private syncScaleFromOptions() {
    this.state.scale = this.editor.command.getOptions().scale || this.state.scale
    this.updateFooterText(
      'page-scale-percentage',
      `${Math.round(this.state.scale * 100)}%`
    )
  }

  private emitPageScaleChangeFallback(version: number) {
    if (this.pageScaleChangeVersion !== version) return
    this.options.listeners?.pageScaleChange?.(this.state.scale)
  }

  private updateFooterText(className: string, value: string | number) {
    const node = this.footer.querySelector<HTMLElement>(`.${className}`)
    if (node) {
      node.textContent = `${value}`
    }
  }

  private bindFullscreenListener() {
    const update = () => {
      this.state.fullscreen = !!document.fullscreenElement
      this.renderFooter()
    }
    document.addEventListener('fullscreenchange', update)
    this.disposers.push(() =>
      document.removeEventListener('fullscreenchange', update)
    )
  }

  private toggleFullscreen() {
    if (!document.fullscreenElement) {
      return document.documentElement.requestFullscreen()
    }
    return document.exitFullscreen()
  }

  private bindGlobalMenuClose() {
    const close = (evt: MouseEvent) => {
      if (this.root.contains(evt.target as Node)) {
        const target = evt.target as HTMLElement
        if (target.closest('.options')) return
        if (target.closest('.menu-item > div, .page-mode')) return
      }
      this.closeVisibleOptions()
    }
    document.addEventListener('click', close)
    this.disposers.push(() => document.removeEventListener('click', close))
  }

  private closeVisibleOptions(except?: HTMLElement) {
    this.root.querySelectorAll<HTMLElement>('.options.visible').forEach(node => {
      if (node !== except) {
        node.classList.remove('visible')
      }
    })
    this.syncOptionsOpenClass()
  }

  private syncOptionsOpenClass() {
    this.root.classList.toggle(
      'ce-app--options-open',
      !!this.root.querySelector('.options.visible')
    )
  }
}

export function createCanvasEditorApp(options: CreateCanvasEditorAppOptions) {
  return new CanvasEditorAppImpl(options)
}
