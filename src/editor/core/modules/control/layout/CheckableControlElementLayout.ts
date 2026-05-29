import { FlexDirection } from '../../../../dataset/enum/Common'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'
import type { Draw } from '../../../draw/Draw'

/** 判断 checkbox/radio 值联动控件是否需要在列方向上强制换行。 */
export function shouldBreakBeforeColumnCheckable(payload: {
  element: IElement
  preElement: IElement | undefined
}) {
  const { element, preElement } = payload
  return (
    element.control?.flexDirection === FlexDirection.COLUMN &&
    (element.controlComponent === ControlComponent.CHECKBOX ||
      element.controlComponent === ControlComponent.RADIO) &&
    preElement?.controlComponent === ControlComponent.VALUE
  )
}

/** checkbox / radio 行内测量器。 */
export class CheckableControlElementLayout {
  /** 初始化 CheckableControlElementLayout 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  public measure(payload: {
    element: IElement
    metrics: IElementMetrics
    scale: number
  }) {
    const { element, metrics, scale } = payload
    if (
      element.type === ElementType.RADIO ||
      element.controlComponent === ControlComponent.RADIO
    ) {
      this.applyMetrics(element, metrics, scale, this.draw.getOptions().radio)
      return true
    }
    if (
      element.type === ElementType.CHECKBOX ||
      element.controlComponent === ControlComponent.CHECKBOX
    ) {
      this.applyMetrics(element, metrics, scale, this.draw.getOptions().checkbox)
      return true
    }
    return false
  }

  private applyMetrics(
    element: IElement,
    metrics: IElementMetrics,
    scale: number,
    option: { width: number; height: number; gap: number }
  ) {
    const elementWidth = option.width + option.gap * 2
    element.width = elementWidth
    metrics.width = elementWidth * scale
    metrics.height = option.height * scale
  }
}
