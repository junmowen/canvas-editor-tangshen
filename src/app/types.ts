import type Editor from '../editor'
import type {
  IEditorData,
  IEditorOption,
  IEditorResult,
  IElement,
  IRangeStyle
} from '../editor'
import type { IRegisterContextMenu } from '../editor/interface/contextmenu/ContextMenu'
import type { IRegisterShortcut } from '../editor/interface/shortcut/Shortcut'

export type CanvasEditorAppPreset = 'minimal' | 'standard' | 'document' | 'form'

export type ToolbarSelectOptionLabel =
  | string
  | ((ctx: CanvasEditorAppContext) => string)

export interface ToolbarSelectOption {
  label: ToolbarSelectOptionLabel
  value: string | number
}

export interface CanvasEditorAppContext {
  editor: Editor
  root: HTMLElement
  handlers: CanvasEditorAppHandlers
  state: CanvasEditorAppState
}

export interface ToolbarItem {
  id: string
  type: 'button' | 'select' | 'color' | 'divider'
  title?: string
  label?: string
  className?: string
  value?: string | number | ((ctx: CanvasEditorAppContext) => string | number)
  options?: ToolbarSelectOption[]
  when?: (ctx: CanvasEditorAppContext) => boolean
  active?: (ctx: CanvasEditorAppContext) => boolean
  disabled?: (ctx: CanvasEditorAppContext) => boolean
  run?: (
    ctx: CanvasEditorAppContext,
    payload?: string | number
  ) => void | Promise<void>
  runDblclick?: (ctx: CanvasEditorAppContext) => void | Promise<void>
}

export interface ToolbarPatch {
  include?: string[]
  exclude?: string[]
  replace?: Record<string, ToolbarItem>
  append?: ToolbarItem[]
}

export type CanvasEditorAppBuiltinFooterItemId =
  | 'catalog'
  | 'page-mode'
  | 'visible-page-no'
  | 'page-no'
  | 'word-count'
  | 'cursor-position'
  | 'editor-mode'
  | 'scale'
  | 'paper-size'
  | 'paper-direction'
  | 'paper-margin'
  | 'page-number-range'
  | 'fullscreen'
  | 'editor-option'

export type CanvasEditorAppFooterItemId =
  | CanvasEditorAppBuiltinFooterItemId
  | string

export interface FooterItem {
  id: string
  align?: 'left' | 'center' | 'right'
  title?: string
  label?: string | number | ((ctx: CanvasEditorAppContext) => string | number)
  className?: string
  when?: (ctx: CanvasEditorAppContext) => boolean
  disabled?: (ctx: CanvasEditorAppContext) => boolean
  render?: (ctx: CanvasEditorAppContext) => HTMLElement
  run?: (ctx: CanvasEditorAppContext) => void | Promise<void>
}

export interface FooterPatch {
  include?: string[]
  exclude?: string[]
  replace?: Record<string, FooterItem>
  append?: FooterItem[]
}

export interface ContextMenuPatch {
  /**
   * default: keep editor built-in context menus and append custom menus.
   * custom: hide editor built-in context menus and show only registered menus.
   * none: hide all app-provided context menus.
   */
  mode?: 'default' | 'custom' | 'none'
  disableKeys?: string[]
  menus?: IRegisterContextMenu[]
}

export type CanvasEditorAppListeners = Partial<Editor['listener']>

export interface CanvasEditorAppComment {
  id: string
  content: string
  userName?: string
  rangeText?: string
  createdDate?: string
}

export interface CanvasEditorAppCommentDraft {
  id: string
  rangeText: string
}

export type CanvasEditorAppCommentCreateResult =
  | CanvasEditorAppComment
  | false
  | null
  | void

export interface CanvasEditorAppRegisterOptions {
  contextMenus?: IRegisterContextMenu[]
  shortcuts?: IRegisterShortcut[]
  setup?: (
    ctx: CanvasEditorAppContext
  ) => void | (() => void) | Promise<void | (() => void)>
}

export interface CanvasEditorAppUIOptions {
  preset?: CanvasEditorAppPreset
  layout?: {
    toolbar?: boolean
    footer?: boolean
    catalog?: boolean
    comment?: boolean
    trackChange?: boolean
  }
  toolbar?: ToolbarPatch
  footer?: FooterPatch
  contextMenu?: ContextMenuPatch
  theme?: {
    className?: string
    density?: 'compact' | 'normal'
  }
}

export interface CanvasEditorAppHandlers {
  uploadImage?: (
    file: File,
    ctx: CanvasEditorAppContext
  ) => Promise<{ url: string; width?: number; height?: number }>
  openImage?: (src: string, ctx: CanvasEditorAppContext) => void
  exportPdf?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  exportDocx?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  print?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  save?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  toggleCatalog?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  getTrackChangeAuthor?: (ctx: CanvasEditorAppContext) => string
  toggleTrackChange?: (
    ctx: CanvasEditorAppContext,
    enabled?: boolean
  ) => void | Promise<void>
  toggleTrackChangePanel?: (
    ctx: CanvasEditorAppContext,
    visible?: boolean
  ) => void | Promise<void>
  acceptAllTrackChange?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  rejectAllTrackChange?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  getComments?: (
    ctx: CanvasEditorAppContext
  ) => CanvasEditorAppComment[] | Promise<CanvasEditorAppComment[]>
  createComment?: (
    draft: CanvasEditorAppCommentDraft,
    ctx: CanvasEditorAppContext
  ) =>
    | CanvasEditorAppCommentCreateResult
    | Promise<CanvasEditorAppCommentCreateResult>
  deleteComment?: (
    commentId: string,
    ctx: CanvasEditorAppContext
  ) => void | Promise<void>
  openPaperMargin?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  openPageNumberRange?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  openEditorOptions?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  onError?: (error: unknown, ctx: CanvasEditorAppContext) => void
}

export interface CreateCanvasEditorAppOptions {
  container: HTMLElement
  value: IEditorData | IElement[]
  editor?: IEditorOption
  ui?: CanvasEditorAppUIOptions
  handlers?: CanvasEditorAppHandlers
  listeners?: CanvasEditorAppListeners
  register?: CanvasEditorAppRegisterOptions
  locale?: string
}

export interface CanvasEditorAppState {
  pageNo: number
  pageSize: number
  visiblePageNoList: number[]
  scale: number
  mode: string
  editorModeName: string
  paperSize: string
  paperDirection: string
  wordCount: number
  rowNo: number
  colNo: number
  fullscreen: boolean
  rangeStyle: IRangeStyle | null
}

export interface CanvasEditorApp {
  editor: Editor
  container: HTMLElement
  setValue(value: IEditorData | IElement[]): void
  getValue(): IEditorResult
  updateOptions(options: Partial<CreateCanvasEditorAppOptions>): void
  register(options: CanvasEditorAppRegisterOptions): void
  on(listeners: CanvasEditorAppListeners): () => void
  destroy(): void
}
