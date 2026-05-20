import { ElementType } from '../enum/Element'
import { IElement } from '../../interface/Element'
import { ITd } from '../../interface/table/Td'
import { IControlStyle } from '../../interface/Control'

export const EDITOR_ELEMENT_STYLE_ATTR: Array<keyof IElement> = [
  'bold',
  'color',
  'highlight',
  'font',
  'size',
  'italic',
  'underline',
  'strikeout',
  'textDecoration',
  'textScale',
  'textPosition',
  'textOutline',
  'textShadow',
  'textGlow',
  'textReflection',
  'textEnclosure',
  'textRuby',
  'textCombine'
]

export const EDITOR_ROW_ATTR: Array<keyof IElement> = [
  'rowFlex',
  'rowMargin',
  'rowIndentLeft',
  'rowIndentRight',
  'rowIndent',
  'rowHangingIndent'
]

export const EDITOR_ELEMENT_COPY_ATTR: Array<keyof IElement> = [
  'type',
  'font',
  'size',
  'bold',
  'color',
  'italic',
  'highlight',
  'underline',
  'strikeout',
  'rowFlex',
  'url',
  'areaId',
  'hyperlinkId',
  'dateId',
  'dateFormat',
  'groupIds',
  'rowMargin',
  'rowIndentLeft',
  'rowIndentRight',
  'rowIndent',
  'rowHangingIndent',
  'listStart',
  'listSymbol',
  'textDecoration',
  'textScale',
  'textPosition',
  'textOutline',
  'textShadow',
  'textGlow',
  'textReflection',
  'textEnclosure',
  'textRuby',
  'textCombine'
]

export const EDITOR_ELEMENT_ZIP_ATTR: Array<keyof IElement> = [
  'id',
  'type',
  'font',
  'size',
  'bold',
  'color',
  'italic',
  'highlight',
  'underline',
  'strikeout',
  'rowFlex',
  'rowMargin',
  'rowIndentLeft',
  'rowIndentRight',
  'rowIndent',
  'rowHangingIndent',
  'dashArray',
  'trList',
  'tableToolDisabled',
  'tableDisplay',
  'tableFloatPosition',
  'borderType',
  'borderColor',
  'borderWidth',
  'borderExternalWidth',
  'tableStyleId',
  'tableStyleName',
  'width',
  'height',
  'url',
  'colgroup',
  'valueList',
  'control',
  'controlId',
  'checkbox',
  'radio',
  'dateFormat',
  'block',
  'level',
  'title',
  'titleId',
  'listType',
  'listStyle',
  'listLevel',
  'listStart',
  'listSymbol',
  'listWrap',
  'groupIds',
  'conceptId',
  'imgDisplay',
  'imgFloatPosition',
  'imgLockAspectRatio',
  'imgSizeLocked',
  'imgBorder',
  'imgShadow',
  'imgCrop',
  'imgToolDisabled',
  'webglFilter',
  'webglDownsample',
  'webglCrop',
  'webglRotation',
  'textDecoration',
  'textScale',
  'textPosition',
  'textOutline',
  'textShadow',
  'textGlow',
  'textReflection',
  'textEnclosure',
  'textRuby',
  'textCombine',
  'trackChange',
  'extension',
  'externalId',
  'spaceBefore',
  'spaceAfter',
  'lineSpacing',
  'lineSpacingType',
  'areaId',
  'area',
  'hide'
]

export const TABLE_TD_ZIP_ATTR: Array<keyof ITd> = [
  'conceptId',
  'extension',
  'externalId',
  'verticalAlign',
  'textDirection',
  'backgroundColor',
  'borderTypes',
  'borderColor',
  'borderWidth',
  'slashTypes',
  'disabled',
  'deletable'
]

export const TABLE_CONTEXT_ATTR: Array<keyof IElement> = [
  'tdId',
  'trId',
  'tableId'
]

export const TITLE_CONTEXT_ATTR: Array<keyof IElement> = [
  'level',
  'titleId',
  'title'
]

export const LIST_CONTEXT_ATTR: Array<keyof IElement> = [
  'listId',
  'listType',
  'listStyle',
  'listLevel',
  'listStart',
  'listSymbol'
]

export const CONTROL_CONTEXT_ATTR: Array<keyof IElement> = [
  'control',
  'controlId',
  'parentControlId',
  'controlComponent'
]

export const CONTROL_STYLE_ATTR: Array<keyof IControlStyle> = [
  'font',
  'size',
  'color',
  'bold',
  'highlight',
  'italic',
  'underline',
  'strikeout'
]

export const AREA_CONTEXT_ATTR: Array<keyof IElement> = ['areaId', 'area']

export const EDITOR_ELEMENT_CONTEXT_ATTR: Array<keyof IElement> = [
  ...TABLE_CONTEXT_ATTR,
  ...TITLE_CONTEXT_ATTR,
  ...LIST_CONTEXT_ATTR,
  ...AREA_CONTEXT_ATTR
]

export const TEXTLIKE_ELEMENT_TYPE: ElementType[] = [
  ElementType.TEXT,
  ElementType.HYPERLINK,
  ElementType.SUBSCRIPT,
  ElementType.SUPERSCRIPT,
  ElementType.CONTROL,
  ElementType.DATE
]

export const IMAGE_ELEMENT_TYPE: ElementType[] = [
  ElementType.IMAGE,
  ElementType.LATEX
]

export const BLOCK_ELEMENT_TYPE: ElementType[] = [
  ElementType.BLOCK,
  ElementType.PAGE_BREAK,
  ElementType.SEPARATOR,
  ElementType.TABLE
]

export const INLINE_NODE_NAME: string[] = ['HR', 'TABLE', 'UL', 'OL']

export const VIRTUAL_ELEMENT_TYPE: ElementType[] = [
  ElementType.TITLE,
  ElementType.LIST
]
