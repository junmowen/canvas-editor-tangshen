import { ZERO } from '../../../../dataset/constant/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import {
  convertBase64ToString,
  convertStringToBase64,
  deepClone
} from '../../../../utils'
import { createChartGraphicElement } from '../command/ChartGraphicCommandPolicy'
import { isChartGraphicElement } from '../utils/ChartGraphicUtils'

export const CHART_GRAPHIC_CLIPBOARD_PAYLOAD_ATTR =
  'ceChartGraphicPayload'

function normalizeChartGraphicClipboardElement(payload: unknown) {
  const source = payload as Partial<IElement> | null
  const chart = source?.chartGraphic
  if (!chart?.kind || !chart.size) return null
  const id = source?.id || undefined
  const element = createChartGraphicElement(
    {
      ...chart,
      id,
      width: source?.width || chart.size.width,
      height: source?.height || chart.size.height
    },
    id || `chart-paste-${Date.now()}`
  )
  element.value = source?.value || ZERO
  return element
}

/** 将图表元素编码为可放入 HTML / SVG data 属性的 payload。 */
export function encodeChartGraphicClipboardPayload(
  element: IElement | null | undefined
) {
  if (!isChartGraphicElement(element)) return ''
  return convertStringToBase64(
    JSON.stringify({
      id: element.id,
      type: ElementType.CHART_GRAPHIC,
      value: element.value || ZERO,
      width: element.width || element.chartGraphic.size.width,
      height: element.height || element.chartGraphic.size.height,
      chartGraphic: deepClone(element.chartGraphic)
    })
  )
}

/** 从 HTML / SVG data 属性恢复图表元素。 */
export function decodeChartGraphicClipboardPayload(payload: string | undefined) {
  if (!payload) return null
  try {
    const parsed = JSON.parse(convertBase64ToString(payload))
    return normalizeChartGraphicClipboardElement(parsed)
  } catch {
    return null
  }
}

/** 创建复制用的图表占位 DOM。 */
export function createChartGraphicClipboardDom(element: IElement) {
  const chart = element.chartGraphic
  const dom = document.createElement('div')
  dom.dataset[CHART_GRAPHIC_CLIPBOARD_PAYLOAD_ATTR] =
    encodeChartGraphicClipboardPayload(element)
  dom.style.display = 'block'
  dom.style.width = `${element.width || chart?.size.width || 1}px`
  dom.style.height = `${element.height || chart?.size.height || 1}px`
  dom.textContent = chart?.title || 'chart graphic'
  return dom
}
