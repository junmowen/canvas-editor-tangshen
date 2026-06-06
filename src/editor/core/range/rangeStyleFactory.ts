import { ElementType } from '../../dataset/enum/Element'
import { IEditorOption } from '../../interface/Editor'
import { IElement } from '../../interface/Element'
import { IRangeStyle } from '../../interface/Listener'

/** 范围样式runtime契约，用于约束内部流程中传递的数据结构。 */
interface IRangeStyleRuntime {
  canUndo: boolean
  canRedo: boolean
  /** painter开关，用于控制当前流程的判断分支。 */
  painter: boolean
}

/**
 * 构造当前选区的 rangeStyle 快照。
 */
export function createSelectionRangeStyle(payload: {
  /** 操作配置项，用于调整当前流程的可选行为。 */
  options: Required<IEditorOption>
  runtime: IRangeStyleRuntime
  /** 活动元素，用于定位或修改对应文档节点。 */
  activeElement: IElement
  /** 选区elements列表，保存同类数据的有序集合。 */
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
    tabStops: resolveSelectionTabStops(activeElement, selectionElements),
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

/** 解析选区制表位回显值：多段完全一致才回显，混合配置返回 null。 */
function resolveSelectionTabStops(
  activeElement: IElement,
  selectionElements: IElement[]
): IRangeStyle['tabStops'] {
  const activeTabStops = activeElement.tabStops || null
  for (const element of selectionElements) {
    if (!isSameTabStops(activeTabStops, element.tabStops || null)) {
      return null
    }
  }
  return activeTabStops ? activeTabStops.map(tabStop => ({ ...tabStop })) : null
}

/** 判断两组制表位是否一致，避免多段不同配置时工具栏误回显。 */
function isSameTabStops(
  left: IElement['tabStops'] | null,
  right: IElement['tabStops'] | null
) {
  if (!left?.length && !right?.length) return true
  if (!left?.length || !right?.length || left.length !== right.length) {
    return false
  }
  for (let index = 0; index < left.length; index++) {
    if (
      left[index].position !== right[index].position ||
      (left[index].alignment || 'left') !== (right[index].alignment || 'left')
    ) {
      return false
    }
  }
  return true
}

/**
 * 构造恢复态 rangeStyle 快照。
 */
export function createRecoveryRangeStyle(payload: {
  /** 操作配置项，用于调整当前流程的可选行为。 */
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
