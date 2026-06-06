import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics, ITabStop } from '../../../../interface/Element'

/** 判断当前元素是否是 Tab。 */
export function isTabElement(element: IElement | undefined) {
  return element?.type === ElementType.TAB
}

/** 根据制表位对齐方式计算 TAB 后文本需要提前占用的宽度。 */
export function resolveTabAlignmentOffset(payload: {
  /** 制表位对齐方式。 */
  alignment?: ITabStop['alignment']
  /** TAB 后连续文本的对齐参考宽度。 */
  nextRunWidth: number
}) {
  if (payload.alignment === 'right' || payload.alignment === 'decimal') {
    return payload.nextRunWidth
  }
  if (payload.alignment === 'center') {
    return payload.nextRunWidth / 2
  }
  return 0
}

/** 计算 TAB 测量结果：优先跳到下一个显式制表位，未命中时回退默认宽度。 */
export function resolveTabMeasure(payload: {
  /** 缩放比例，用于把文档尺寸映射到画布尺寸。 */
  scale: number
  /** 默认 TAB 宽度，用于没有命中制表位时兜底。 */
  defaultTabWidth: number
  /** 当前行已占用宽度，用于计算下一个制表位距离。 */
  currentRowWidth: number
  /** 当前行可用宽度，用于过滤越界制表位。 */
  availableWidth: number
  /** TAB 后连续文本的对齐参考宽度，用于右对齐、居中和小数点对齐。 */
  nextRunWidth: number
  /** 当前段落可用制表位列表。 */
  tabStops?: ITabStop[]
}): { width: number; alignment?: ITabStop['alignment'] } {
  const {
    scale,
    defaultTabWidth,
    currentRowWidth,
    availableWidth,
    nextRunWidth,
    tabStops
  } = payload
  const sortedTabStops = (tabStops || [])
    .filter(tabStop => tabStop.position >= 0)
    .slice()
    .sort((a, b) => a.position - b.position)
  for (const tabStop of sortedTabStops) {
    const stopX = tabStop.position * scale
    if (stopX > currentRowWidth && stopX <= availableWidth) {
      return {
        width: Math.max(
          0,
          stopX -
            currentRowWidth -
            resolveTabAlignmentOffset({
              alignment: tabStop.alignment,
              nextRunWidth
            })
        ),
        alignment: tabStop.alignment || 'left'
      }
    }
  }
  return { width: defaultTabWidth * scale }
}

/** Tab 元素测量器。 */
export class TabElementLayout {
  public measure(payload: {
    /** 文档元素对象，用于判断是否为 TAB。 */
    element: IElement
    /** 元素测量结果，当前函数会写入 TAB 的宽高和基线。 */
    metrics: IElementMetrics
    /** 缩放比例，用于把文档尺寸映射到画布尺寸。 */
    scale: number
    /** 默认字体大小，用于生成 TAB 行高。 */
    defaultSize: number
    /** 默认 TAB 宽度，用于没有命中制表位时兜底。 */
    defaultTabWidth: number
    /** 当前行已占用宽度，用于计算下一个制表位距离。 */
    currentRowWidth: number
    /** 当前行可用宽度，用于过滤越界制表位。 */
    availableWidth: number
    /** TAB 后连续文本的对齐参考宽度，用于右对齐、居中和小数点对齐。 */
    nextRunWidth: number
    /** 当前段落可用制表位列表。 */
    tabStops?: ITabStop[]
  }) {
    const { element, metrics, scale, defaultSize } = payload
    if (!isTabElement(element)) return false
    const tabMeasure = resolveTabMeasure(payload)
    metrics.width = tabMeasure.width
    metrics.height = defaultSize * scale
    metrics.boundingBoxDescent = 0
    metrics.boundingBoxAscent = metrics.height
    metrics.tabStopAlignment = tabMeasure.alignment
    return true
  }
}
