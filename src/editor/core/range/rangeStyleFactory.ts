import { ElementType } from '../../dataset/enum/Element'
import { IEditorOption } from '../../interface/Editor'
import { IElement } from '../../interface/Element'
import { IRangeStyle } from '../../interface/Listener'

interface IRangeStyleRuntime {
  canUndo: boolean
  canRedo: boolean
  painter: boolean
}

/**
 * 构造当前选区的 rangeStyle 快照。
 */
export function createSelectionRangeStyle(payload: {
  options: Required<IEditorOption>
  runtime: IRangeStyleRuntime
  activeElement: IElement
  selectionElements: IElement[]
}): IRangeStyle {
  const { options, runtime, activeElement, selectionElements } = payload
  const underline = !~selectionElements.findIndex(
    el => !el.underline && !el.control?.underline
  )

  return {
    type: (activeElement.type as ElementType | null) || null,
    undo: runtime.canUndo,
    redo: runtime.canRedo,
    painter: runtime.painter,
    font: activeElement.font || options.defaultFont,
    size: activeElement.size || options.defaultSize,
    bold: !~selectionElements.findIndex(el => !el.bold),
    italic: !~selectionElements.findIndex(el => !el.italic),
    underline,
    strikeout: !~selectionElements.findIndex(el => !el.strikeout),
    letterSpacing: activeElement.letterSpacing ?? null,
    color: activeElement.color || null,
    highlight: activeElement.highlight || null,
    rowFlex: activeElement.rowFlex || null,
    rowMargin: activeElement.rowMargin ?? options.defaultRowMargin,
    rowIndentLeft: activeElement.rowIndentLeft ?? null,
    rowIndentRight: activeElement.rowIndentRight ?? null,
    rowIndent: activeElement.rowIndent ?? null,
    rowHangingIndent: activeElement.rowHangingIndent ?? null,
    spaceBefore: activeElement.spaceBefore ?? null,
    spaceAfter: activeElement.spaceAfter ?? null,
    lineSpacing: activeElement.lineSpacing ?? null,
    lineSpacingType:
      (activeElement.lineSpacingType as IRangeStyle['lineSpacingType']) || null,
    pageBreakBefore: Boolean(activeElement.pageBreakBefore),
    keepWithNext: Boolean(activeElement.keepWithNext),
    keepLines: Boolean(activeElement.keepLines),
    widowControl: Boolean(activeElement.widowControl),
    tabStops: activeElement.tabStops
      ? activeElement.tabStops.map(stop => ({
          ...stop
        }))
      : null,
    dashArray: activeElement.dashArray || [],
    level: activeElement.level || null,
    listType: activeElement.listType || null,
    listStyle: activeElement.listStyle || null,
    listLevel: activeElement.listLevel ?? null,
    listStart: activeElement.listStart ?? null,
    listSymbol: activeElement.listSymbol || null,
    styleId: activeElement.styleId || null,
    styleName: activeElement.styleName || null,
    groupIds: activeElement.groupIds || null,
    textDecoration: underline ? activeElement.textDecoration || null : null,
    textScale: activeElement.textScale ?? null,
    textPosition: activeElement.textPosition ?? null,
    textOutline: activeElement.textOutline || null,
    textShadow: activeElement.textShadow || null,
    textGlow: activeElement.textGlow || null,
    textReflection: activeElement.textReflection || null,
    textEnclosure: activeElement.textEnclosure || null,
    textRuby: activeElement.textRuby || null,
    textCombine: activeElement.textCombine ? true : null,
    extension: activeElement.extension ?? null
  }
}

/**
 * 构造恢复态 rangeStyle 快照。
 */
export function createRecoveryRangeStyle(payload: {
  options: Required<IEditorOption>
  runtime: IRangeStyleRuntime
}): IRangeStyle {
  const { options, runtime } = payload

  return {
    type: null,
    undo: runtime.canUndo,
    redo: runtime.canRedo,
    painter: runtime.painter,
    font: options.defaultFont,
    size: options.defaultSize,
    bold: false,
    italic: false,
    underline: false,
    strikeout: false,
    letterSpacing: null,
    color: null,
    highlight: null,
    rowFlex: null,
    rowMargin: options.defaultRowMargin,
    rowIndentLeft: null,
    rowIndentRight: null,
    rowIndent: null,
    rowHangingIndent: null,
    spaceBefore: null,
    spaceAfter: null,
    lineSpacing: null,
    lineSpacingType: null,
    pageBreakBefore: false,
    keepWithNext: false,
    keepLines: false,
    widowControl: false,
    tabStops: null,
    dashArray: [],
    level: null,
    listType: null,
    listStyle: null,
    listLevel: null,
    listStart: null,
    listSymbol: null,
    styleId: null,
    styleName: null,
    groupIds: null,
    textDecoration: null,
    textScale: null,
    textPosition: null,
    textOutline: null,
    textShadow: null,
    textGlow: null,
    textReflection: null,
    textEnclosure: null,
    textRuby: null,
    textCombine: null,
    extension: null
  }
}
