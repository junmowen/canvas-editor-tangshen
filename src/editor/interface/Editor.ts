import {
  EditorMode,
  PageMode,
  PaperDirection,
  RenderMode,
  WordBreak
} from '../dataset/enum/Editor'
import { IBackgroundOption } from './Background'
import { ICheckboxOption } from './Checkbox'
import { IRadioOption } from './Radio'
import { IControlOption } from './Control'
import { ICursorOption } from './Cursor'
import { IFooter } from './Footer'
import { IGroup } from './Group'
import { IHeader } from './Header'
import { ILineBreakOption } from './LineBreak'
import { IMargin, PageGutterPosition } from './Margin'
import { IPageBreak } from './PageBreak'
import { IPageNumber } from './PageNumber'
import { IPageColumns } from './PageColumns'
import { IPlaceholder } from './Placeholder'
import { ITitleOption } from './Title'
import { IWatermark } from './Watermark'
import { IZoneOption } from './Zone'
import { ISeparatorOption } from './Separator'
import { ITableOption } from './table/Table'
import { ILineNumberOption } from './LineNumber'
import { IPageBorderOption } from './PageBorder'
import { IBadgeOption } from './Badge'
import { IElement } from './Element'
import { LocationPosition } from '../dataset/enum/Common'
import { IRange } from './Range'

export interface IEditorData {
  header?: IElement[]
  main: IElement[]
  footer?: IElement[]
}

export interface IRenderBackendOption {
  debugPanel?: {
    enabled?: boolean
  }
  offscreenCanvas?: {
    enabled?: boolean
    nonCurrentPageBase?: boolean
  }
  webgl?: {
    enabled?: boolean
    imageTask?: boolean
    forceContextLost?: boolean
    maxTextureCacheSize?: number
    maxTextureCacheBytes?: number
  }
  svgDom?: {
    enabled?: boolean
    blockTask?: boolean
  }
}

/** 修订留痕渲染与默认作者配置。 */
export interface ITrackChangeOption {
  /** 是否默认开启留痕。 */
  enabled?: boolean
  /** 当前修订作者。 */
  author?: string
  /** 插入痕迹颜色。 */
  insertColor?: string
  /** 删除痕迹颜色。 */
  deleteColor?: string
}

export interface IEditorOption {
  mode?: EditorMode
  locale?: string
  defaultType?: string
  defaultColor?: string
  defaultFont?: string
  defaultSize?: number
  minSize?: number
  maxSize?: number
  defaultBasicRowMarginHeight?: number
  defaultRowMargin?: number
  defaultTabWidth?: number
  width?: number
  height?: number
  scale?: number
  pageGap?: number
  underlineColor?: string
  strikeoutColor?: string
  rangeColor?: string
  rangeAlpha?: number
  rangeMinWidth?: number
  searchMatchColor?: string
  searchNavigateMatchColor?: string
  searchMatchAlpha?: number
  highlightAlpha?: number
  highlightMarginHeight?: number
  resizerColor?: string
  resizerSize?: number
  marginIndicatorSize?: number
  marginIndicatorColor?: string
  margins?: IMargin
  gutter?: number
  gutterPosition?: PageGutterPosition
  mirrorMargins?: boolean
  columns?: IPageColumns
  pageMode?: PageMode
  renderMode?: RenderMode
  defaultHyperlinkColor?: string
  paperDirection?: PaperDirection
  inactiveAlpha?: number
  historyMaxRecordCount?: number
  printPixelRatio?: number
  maskMargin?: IMargin
  letterClass?: string[]
  contextMenuDisableKeys?: string[]
  shortcutDisableKeys?: string[]
  scrollContainerSelector?: string
  pageOuterSelectionDisable?: boolean
  wordBreak?: WordBreak
  table?: ITableOption
  header?: IHeader
  footer?: IFooter
  pageNumber?: IPageNumber
  watermark?: IWatermark
  control?: IControlOption
  checkbox?: ICheckboxOption
  radio?: IRadioOption
  cursor?: ICursorOption
  title?: ITitleOption
  placeholder?: IPlaceholder
  group?: IGroup
  pageBreak?: IPageBreak
  zone?: IZoneOption
  background?: IBackgroundOption
  lineBreak?: ILineBreakOption
  separator?: ISeparatorOption
  lineNumber?: ILineNumberOption
  pageBorder?: IPageBorderOption
  badge?: IBadgeOption
  modeRule?: IModeRule
  renderBackend?: IRenderBackendOption
  trackChange?: ITrackChangeOption
}

export interface IEditorResult {
  version: string
  data: IEditorData
  options: IEditorOption
}

export interface IEditorHTML {
  header: string
  main: string
  footer: string
}

export type IEditorText = IEditorHTML

export type IUpdateOption = Omit<
  IEditorOption,
  | 'mode'
  | 'scale'
  | 'pageGap'
  | 'pageMode'
  | 'paperDirection'
  | 'historyMaxRecordCount'
  | 'scrollContainerSelector'
>

export interface ISetValueOption {
  isSetCursor?: boolean
}

export interface IFocusOption {
  rowNo?: number
  range?: IRange
  position?: LocationPosition
  isMoveCursorToVisible?: boolean
}

export interface IPrintModeRule {
  imagePreviewerDisabled?: boolean
}

export interface IReadonlyModeRule {
  imagePreviewerDisabled?: boolean
}

export interface IFormModeRule {
  controlDeletableDisabled?: boolean
}

export interface IModeRule {
  [EditorMode.PRINT]?: IPrintModeRule
  [EditorMode.READONLY]?: IReadonlyModeRule
  [EditorMode.FORM]?: IFormModeRule
}
