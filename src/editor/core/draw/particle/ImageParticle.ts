import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { ImageDisplay } from '../../../dataset/enum/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { convertStringToBase64 } from '../../../utils'
import { Draw } from '../Draw'

/**
 * 图片粒子。
 *
 * 负责图片的渲染、缓存和浮动处理。
 */
export class ImageParticle {
  /** Draw 门面对象 */
  private draw: Draw
  /** 编辑器选项 */
  protected options: Required<IEditorOption>
  /** 图片缓存 */
  protected imageCache: Map<string, HTMLImageElement>
  /** 容器元素 */
  private container: HTMLDivElement
  /** 浮动图片容器 */
  private floatImageContainer: HTMLDivElement | null
  /** 浮动图片元素 */
  private floatImage: HTMLImageElement | null

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
    // 获取容器
    this.container = draw.getPageCanvasHost().getContainer()
    // 初始化图片缓存
    this.imageCache = new Map()
    // 初始化浮动图片状态
    this.floatImageContainer = null
    this.floatImage = null
  }

  /**
   * 获取原始正文中的图片列表。
   *
   * 递归遍历表格单元格，收集所有图片元素。
   *
   * @returns 图片元素列表
   */
  public getOriginalMainImageList(): IElement[] {
    const imageList: IElement[] = []
    // 递归遍历元素列表，收集图片
    const getImageList = (elementList: IElement[]) => {
      for (const element of elementList) {
        // 如果是表格，递归处理单元格
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              getImageList(td.value)
            }
          }
        } else if (element.type === ElementType.IMAGE) {
          // 收集图片元素
          imageList.push(element)
        }
      }
    }
    // 获取正文图片列表
    getImageList(this.draw.getOriginalMainElementList())
    return imageList
  }

  /**
   * 创建浮动图片。
   *
   * @param element - 图片元素
   */
  public createFloatImage(element: IElement) {
    const { scale } = this.options
    // 复用浮动元素
    let floatImageContainer = this.floatImageContainer
    let floatImage = this.floatImage
    if (!floatImageContainer) {
      floatImageContainer = document.createElement('div')
      floatImageContainer.classList.add(`${EDITOR_PREFIX}-float-image`)
      this.container.append(floatImageContainer)
      this.floatImageContainer = floatImageContainer
    }
    if (!floatImage) {
      floatImage = document.createElement('img')
      floatImageContainer.append(floatImage)
      this.floatImage = floatImage
    }
    floatImageContainer.style.display = 'none'
    floatImage.style.width = `${element.width! * scale}px`
    floatImage.style.height = `${element.height! * scale}px`
    // 浮动图片初始信息
    const height = this.draw.getHeight()
    const pageGap = this.draw.getPageGap()
    const preY = this.draw.getPageNo() * (height + pageGap)
    const imgFloatPosition = element.imgFloatPosition!
    floatImageContainer.style.left = `${imgFloatPosition.x * scale}px`
    floatImageContainer.style.top = `${preY + imgFloatPosition.y * scale}px`
    floatImage.src = element.value
  }

  public dragFloatImage(deltaX: number, deltaY: number) {
    if (!this.floatImageContainer) return
    this.floatImageContainer.style.display = 'block'
    // 之前的坐标加移动长度
    const x = parseFloat(this.floatImageContainer.style.left) + deltaX
    const y = parseFloat(this.floatImageContainer.style.top) + deltaY
    this.floatImageContainer.style.left = `${x}px`
    this.floatImageContainer.style.top = `${y}px`
  }

  public destroyFloatImage() {
    if (this.floatImageContainer) {
      this.floatImageContainer.style.display = 'none'
    }
  }

  protected addImageObserver(promise: Promise<unknown>) {
    this.draw.getImageObserver().add(promise)
  }

  protected getFallbackImage(width: number, height: number): HTMLImageElement {
    const tileSize = 8
    const x = (width - Math.ceil(width / tileSize) * tileSize) / 2
    const y = (height - Math.ceil(height / tileSize) * tileSize) / 2
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                  <rect width="${width}" height="${height}" fill="url(#mosaic)" />
                  <defs>
                    <pattern id="mosaic" x="${x}" y="${y}" width="${
      tileSize * 2
    }" height="${tileSize * 2}" patternUnits="userSpaceOnUse">
                      <rect width="${tileSize}" height="${tileSize}" fill="#cccccc" />
                      <rect width="${tileSize}" height="${tileSize}" fill="#cccccc" transform="translate(${tileSize}, ${tileSize})" />
                    </pattern>
                  </defs>
                </svg>`
    const fallbackImage = new Image()
    fallbackImage.src = `data:image/svg+xml;base64,${convertStringToBase64(
      svg
    )}`
    return fallbackImage
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    x: number,
    y: number
  ) {
    const { scale } = this.options
    const width = element.width! * scale
    const height = element.height! * scale
    if (this.imageCache.has(element.value)) {
      const img = this.imageCache.get(element.value)!
      ctx.drawImage(img, x, y, width, height)
    } else {
      const cacheRenderCount = this.draw.getViewState().getRenderCount()
      const imageLoadPromise = new Promise((resolve, reject) => {
        const img = new Image()
        img.setAttribute('crossOrigin', 'Anonymous')
        img.src = element.value
        img.onload = () => {
          this.imageCache.set(element.value, img)
          resolve(element)
          // 因图片加载异步，图片加载后可能属于上一次渲染方法
          if (cacheRenderCount !== this.draw.getViewState().getRenderCount()) return
          // 衬于文字下方图片需要重新首先绘制
          if (element.imgDisplay === ImageDisplay.FLOAT_BOTTOM) {
            this.draw.render({
              isCompute: false,
              isSetCursor: false,
              isSubmitHistory: false,
              pageRenderScope: 'visible'
            })
          } else {
            ctx.drawImage(img, x, y, width, height)
          }
        }
        img.onerror = error => {
          const fallbackImage = this.getFallbackImage(width, height)
          fallbackImage.onload = () => {
            ctx.drawImage(fallbackImage, x, y, width, height)
            this.imageCache.set(element.value, fallbackImage)
          }
          reject(error)
        }
      })
      this.addImageObserver(imageLoadPromise)
    }
  }
}
