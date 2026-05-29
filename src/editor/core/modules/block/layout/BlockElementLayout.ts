import { BlockType } from '../../../../dataset/enum/Block'
import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'
import { convertStringToBase64 } from '../../../../utils'
import type { Draw } from '../../../draw/Draw'

/** 判断当前元素是否是 block。 */
export function isBlockElement(element: IElement | undefined) {
  return element?.type === ElementType.BLOCK
}

/** block 元素测量器。 */
export class BlockElementLayout {
  /** 初始化 BlockElementLayout 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  public measure(payload: {
    element: IElement
    metrics: IElementMetrics
    availableWidth: number
    scale: number
  }) {
    const { element, metrics, availableWidth, scale } = payload
    if (!isBlockElement(element)) return false
    if (!element.width) {
      metrics.width = availableWidth
    } else {
      const elementWidth = element.width * scale
      metrics.width = Math.min(elementWidth, availableWidth)
    }
    metrics.height = element.height! * scale
    metrics.boundingBoxDescent = metrics.height
    metrics.boundingBoxAscent = 0
    this.preloadSvgBlockRasterImage(element)
    return true
  }

  /** Preload SVG block as an image so export can synchronously rasterize it into Canvas2D. */
  private preloadSvgBlockRasterImage(element: IElement) {
    const svgBlock = element.block?.svgBlock
    if (element.block?.type !== BlockType.SVG || !svgBlock?.svg || svgBlock.rasterImage) {
      return
    }
    const image = new Image()
    const loadPromise = new Promise((resolve, reject) => {
      image.onload = () => {
        svgBlock.rasterImage = image
        resolve(element)
      }
      image.onerror = reject
    })
    image.src = `data:image/svg+xml;base64,${convertStringToBase64(svgBlock.svg)}`
    this.draw.getComponents().imageObserver.add(loadPromise)
  }
}
