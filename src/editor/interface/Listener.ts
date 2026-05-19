import { EditorZone, PageMode } from '../dataset/enum/Editor'
import { ElementType } from '../dataset/enum/Element'
import { ListStyle, ListType } from '../dataset/enum/List'
import { RowFlex } from '../dataset/enum/Row'
import { TitleLevel } from '../dataset/enum/Title'
import { IControlChangeResult, IControlContentChangeResult } from './Control'
import { IEditorResult } from './Editor'
import { IElement } from './Element'
import { IPositionContext } from './Position'
import { ITextDecoration } from './Text'

export interface IRangeStyle {
  type: ElementType | null
  undo: boolean
  redo: boolean
  painter: boolean
  font: string
  size: number
  bold: boolean
  italic: boolean
  underline: boolean
  strikeout: boolean
  letterSpacing: number | null
  color: string | null
  highlight: string | null
  rowFlex: RowFlex | null
  rowMargin: number
  rowIndentLeft: number | null
  rowIndentRight: number | null
  rowIndent: number | null
  rowHangingIndent: number | null
  spaceBefore: number | null
  spaceAfter: number | null
  lineSpacing: number | null
  lineSpacingType: 'auto' | 'exact' | 'multiple' | null
  pageBreakBefore: boolean
  keepWithNext: boolean
  keepLines: boolean
  widowControl: boolean
  tabStops: IElement['tabStops'] | null
  dashArray: number[]
  level: TitleLevel | null
  listType: ListType | null
  listStyle: ListStyle | null
  listLevel: number | null
  listStart: number | null
  listSymbol: string | null
  styleId: string | null
  styleName: string | null
  groupIds: string[] | null
  textDecoration: ITextDecoration | null
  textScale: number | null
  textPosition: number | null
  textOutline: IElement['textOutline'] | null
  textShadow: IElement['textShadow'] | null
  textGlow: IElement['textGlow'] | null
  textReflection: IElement['textReflection'] | null
  textEnclosure: IElement['textEnclosure'] | null
  textRuby: IElement['textRuby'] | null
  textCombine: boolean | null
  extension?: unknown | null
}

export type IRangeStyleChange = (payload: IRangeStyle) => void

export type IVisiblePageNoListChange = (payload: number[]) => void

export type IIntersectionPageNoChange = (payload: number) => void

export type IPageSizeChange = (payload: number) => void

export type IPageScaleChange = (payload: number) => void

export type ISaved = (payload: IEditorResult) => void

export type IContentChange = () => void

export type IControlChange = (payload: IControlChangeResult) => void

export type IControlContentChange = (
  payload: IControlContentChangeResult
) => void

export type IPageModeChange = (payload: PageMode) => void

export type IZoneChange = (payload: EditorZone) => void

export type IMouseEventChange = (evt: MouseEvent) => void

export type IInputEventChange = (evt: Event) => void

export interface IPositionContextChangePayload {
  value: IPositionContext
  oldValue: IPositionContext
}

export type IPositionContextChange = (
  payload: IPositionContextChangePayload
) => void

export type IImageSizeChange = (payload: { element: IElement }) => void

export type IImageMousedown = (payload: {
  evt: MouseEvent
  element: IElement
}) => void
