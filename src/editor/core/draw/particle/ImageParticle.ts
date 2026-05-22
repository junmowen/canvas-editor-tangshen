import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { ImageDisplay } from '../../../dataset/enum/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementMetrics } from '../../../interface/Element'
import { RenderLayer } from '../../render-backend'
import { convertStringToBase64 } from '../../../utils'
import { Draw } from '../Draw'

/** WebGL 图片预览 bitmap 固化缓存项。 */
interface IImagePreviewBitmapCacheItem {
  canvas: HTMLCanvasElement
  width: number
  height: number
  dpr: number
  lastUsedSeq: number
}

/** 图片预览 bitmap 缓存统计。 */
export interface IImagePreviewBitmapCacheStats {
  count: number
  maxCount: number
  setCount: number
  hitCount: number
  missCount: number
  hitRate: number
  evictCount: number
  estimatedBytes: number
  estimatedMB: number
  peakEstimatedBytes: number
  peakEstimatedMB: number
  estimatedSavedRenderPixels: number
}

/**
 * 图片粒子。
 *
 * 负责图片的渲染、缓存和浮动处理。
 */
export class ImageParticle {
  /** WebGL 图片预览 bitmap 固化缓存上限。 */
  private static readonly MAX_PREVIEW_BITMAP_CACHE_SIZE = 32
  /** Draw 门面对象 */
  private draw: Draw
  /** 编辑器选项 */
  protected options: Required<IEditorOption>
  /** 图片缓存 */
  protected imageCache: Map<string, HTMLImageElement>
  /** WebGL / Canvas2D 处理后的图片预览 bitmap 缓存。 */
  private readonly previewBitmapCache: Map<string, IImagePreviewBitmapCacheItem>
  private previewBitmapCacheUseSeq = 0
  private previewBitmapCacheSetCount = 0
  private previewBitmapCacheHitCount = 0
  private previewBitmapCacheMissCount = 0
  private previewBitmapCacheEvictCount = 0
  private previewBitmapCachePeakEstimatedBytes = 0
  private previewBitmapCacheSavedRenderPixels = 0
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
    this.previewBitmapCache = new Map()
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
    const preY = this.draw.getPageCanvasHost().getPageTop(this.draw.getPageNo())
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

  /** 获取 WebGL 图片预览 bitmap 缓存统计。 */
  public getPreviewBitmapCacheStats(): IImagePreviewBitmapCacheStats {
    const estimatedBytes = Array.from(this.previewBitmapCache.values()).reduce(
      (total, item) => total + item.canvas.width * item.canvas.height * 4,
      0
    )
    const totalLookup =
      this.previewBitmapCacheHitCount + this.previewBitmapCacheMissCount
    return {
      count: this.previewBitmapCache.size,
      maxCount: ImageParticle.MAX_PREVIEW_BITMAP_CACHE_SIZE,
      setCount: this.previewBitmapCacheSetCount,
      hitCount: this.previewBitmapCacheHitCount,
      missCount: this.previewBitmapCacheMissCount,
      hitRate:
        totalLookup > 0
          ? Math.round((this.previewBitmapCacheHitCount / totalLookup) * 100) /
            100
          : 0,
      evictCount: this.previewBitmapCacheEvictCount,
      estimatedBytes,
      estimatedMB: Math.round((estimatedBytes / 1024 / 1024) * 100) / 100,
      peakEstimatedBytes: this.previewBitmapCachePeakEstimatedBytes,
      peakEstimatedMB:
        Math.round(
          (this.previewBitmapCachePeakEstimatedBytes / 1024 / 1024) * 100
        ) / 100,
      estimatedSavedRenderPixels: this.previewBitmapCacheSavedRenderPixels
    }
  }

  /** 重置 WebGL 图片预览 bitmap 缓存统计，不释放缓存内容。 */
  public resetPreviewBitmapCacheStats() {
    this.previewBitmapCacheSetCount = 0
    this.previewBitmapCacheHitCount = 0
    this.previewBitmapCacheMissCount = 0
    this.previewBitmapCacheEvictCount = 0
    this.previewBitmapCachePeakEstimatedBytes =
      this.getPreviewBitmapCacheStats().estimatedBytes
    this.previewBitmapCacheSavedRenderPixels = 0
  }

  /** 释放 WebGL 图片预览 bitmap 缓存。 */
  public clearPreviewBitmapCache() {
    this.previewBitmapCache.forEach(item => this.disposePreviewBitmapCacheItem(item))
    this.previewBitmapCache.clear()
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    x: number,
    y: number,
    options: {
      /** 导出时禁用 WebGL 图片任务，直接固化为 Canvas2D drawImage。 */
      isExport?: boolean
    } = {}
  ) {
    const { scale } = this.options
    const metrics =
      'metrics' in element ? (element.metrics as IElementMetrics) : undefined
    const width = metrics?.width || element.width! * scale
    const height = metrics?.height || element.height! * scale
    const renderImage = (
      renderCtx: CanvasRenderingContext2D,
      img: HTMLImageElement
    ) => {
      const dpr = this.draw.getPagePixelRatio()
      const previewCacheKey = this.getPreviewBitmapCacheKey(
        element,
        img,
        width,
        height,
        dpr
      )
      if (!options.isExport) {
        const cached = this.getPreviewBitmapCache(
          previewCacheKey,
          width,
          height,
          dpr
        )
        if (cached) {
          renderCtx.drawImage(cached.canvas, x, y, width, height)
          return
        }
      }
      const host = this.draw.getPageCanvasHost()
      const surface = host.createTransientSurface(
        -4,
        RenderLayer.MEASURE,
        Math.max(1, width),
        Math.max(1, height),
        dpr
      )
      try {
        const executeCanvas2DFallback = () => {
          this.drawImageWithTransform(surface.ctx2d, img, element, width, height)
        }
        if (options.isExport) {
          executeCanvas2DFallback()
        } else {
          this.draw.getServices().renderBackendManager.render(surface, {
            pageNo: -1,
            layer: RenderLayer.MEASURE,
            reason: 'image-webgl',
            priority: 'sync',
            webglImage: {
              source: img,
              cacheKey: element.value,
              width,
              height,
              filter: element.webglFilter,
              downsample: element.webglDownsample,
              crop: element.webglCrop,
              rotation: element.webglRotation
            },
            execute: webglSurface => {
              this.drawImageWithTransform(
                webglSurface.ctx2d,
                img,
                element,
                width,
                height
              )
            }
          })
        }
        if (!options.isExport) {
          this.setPreviewBitmapCache(previewCacheKey, surface)
        }
        renderCtx.drawImage(surface.canvas, x, y, width, height)
      } finally {
        host.releaseTransientSurface(surface)
      }
    }
    if (this.imageCache.has(element.value)) {
      const img = this.imageCache.get(element.value)!
      renderImage(ctx, img)
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
            renderImage(ctx, img)
          }
        }
        img.onerror = error => {
          const fallbackImage = this.getFallbackImage(width, height)
          fallbackImage.onload = () => {
            renderImage(ctx, fallbackImage)
            this.imageCache.set(element.value, fallbackImage)
          }
          reject(error)
        }
      })
      this.addImageObserver(imageLoadPromise)
    }
  }

  /** 读取预览 bitmap 缓存，命中后直接复用已处理结果。 */
  private getPreviewBitmapCache(
    key: string,
    width: number,
    height: number,
    dpr: number
  ): IImagePreviewBitmapCacheItem | null {
    const cached = this.previewBitmapCache.get(key)
    if (
      cached &&
      cached.width === width &&
      cached.height === height &&
      cached.dpr === dpr
    ) {
      cached.lastUsedSeq = ++this.previewBitmapCacheUseSeq
      this.previewBitmapCacheHitCount++
      this.previewBitmapCacheSavedRenderPixels +=
        cached.canvas.width * cached.canvas.height
      return cached
    }
    if (cached) {
      this.previewBitmapCache.delete(key)
      this.disposePreviewBitmapCacheItem(cached)
      this.previewBitmapCacheEvictCount++
    }
    this.previewBitmapCacheMissCount++
    return null
  }

  /** 写入预览 bitmap 缓存，保存 transient surface 释放前的实际像素。 */
  private setPreviewBitmapCache(key: string, surface: {
    canvas: HTMLCanvasElement
    width: number
    height: number
    dpr: number
  }) {
    const canvas = document.createElement('canvas')
    canvas.width = surface.canvas.width
    canvas.height = surface.canvas.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(surface.canvas, 0, 0)
    const prev = this.previewBitmapCache.get(key)
    if (prev) {
      this.disposePreviewBitmapCacheItem(prev)
    }
    this.previewBitmapCache.set(key, {
      canvas,
      width: surface.width,
      height: surface.height,
      dpr: surface.dpr,
      lastUsedSeq: ++this.previewBitmapCacheUseSeq
    })
    this.previewBitmapCacheSetCount++
    this.previewBitmapCachePeakEstimatedBytes = Math.max(
      this.previewBitmapCachePeakEstimatedBytes,
      this.getPreviewBitmapCacheStats().estimatedBytes
    )
    this.prunePreviewBitmapCache()
  }

  /** 按 LRU 上限淘汰图片预览 bitmap。 */
  private prunePreviewBitmapCache() {
    while (
      this.previewBitmapCache.size >
      ImageParticle.MAX_PREVIEW_BITMAP_CACHE_SIZE
    ) {
      let oldestKey = ''
      let oldestSeq = Number.POSITIVE_INFINITY
      this.previewBitmapCache.forEach((item, key) => {
        if (item.lastUsedSeq < oldestSeq) {
          oldestSeq = item.lastUsedSeq
          oldestKey = key
        }
      })
      const oldest = this.previewBitmapCache.get(oldestKey)
      if (!oldest) break
      this.previewBitmapCache.delete(oldestKey)
      this.disposePreviewBitmapCacheItem(oldest)
      this.previewBitmapCacheEvictCount++
    }
  }

  /** 主动释放缓存 canvas backing store。 */
  private disposePreviewBitmapCacheItem(item: IImagePreviewBitmapCacheItem) {
    item.canvas.width = 0
    item.canvas.height = 0
  }

  /** 生成图片预览 bitmap 缓存键，覆盖源图、输出尺寸、DPR 和 WebGL 语义输入。 */
  private getPreviewBitmapCacheKey(
    element: IElement,
    img: HTMLImageElement,
    width: number,
    height: number,
    dpr: number
  ): string {
    const sourceWidth = Math.max(1, img.naturalWidth || img.width || 1)
    const sourceHeight = Math.max(1, img.naturalHeight || img.height || 1)
    const crop = this.getCanvasCrop(element, img)
    const filter = this.getNormalizedFilter(element)
    return JSON.stringify([
      element.value,
      sourceWidth,
      sourceHeight,
      width,
      height,
      dpr,
      filter.grayscale,
      filter.brightness,
      filter.contrast,
      Boolean(element.webglDownsample),
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      this.getRotationDegrees(element)
    ])
  }

  /** 按 WebGL 图片任务语义绘制 Canvas2D fallback / export 结果。 */
  private drawImageWithTransform(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    element: IElement,
    width: number,
    height: number
  ) {
    const crop = this.getCanvasCrop(element, img)
    const rotation = this.getRotationRadians(element)
    ctx.clearRect(0, 0, width, height)
    ctx.save()
    ctx.filter = this.getCanvasFilter(element)
    if (rotation) {
      ctx.translate(width / 2, height / 2)
      ctx.rotate(rotation)
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        -width / 2,
        -height / 2,
        width,
        height
      )
    } else {
      ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
    }
    ctx.restore()
  }

  /** 读取并裁剪到图片源尺寸内，供 Canvas2D fallback / export 使用。 */
  private getCanvasCrop(element: IElement, img: HTMLImageElement) {
    const sourceWidth = Math.max(1, img.naturalWidth || img.width || 1)
    const sourceHeight = Math.max(1, img.naturalHeight || img.height || 1)
    const crop = element.webglCrop
    if (!crop) {
      return {
        x: 0,
        y: 0,
        width: sourceWidth,
        height: sourceHeight
      }
    }
    const x = Math.min(Math.max(0, crop.x), sourceWidth - 1)
    const y = Math.min(Math.max(0, crop.y), sourceHeight - 1)
    return {
      x,
      y,
      width: Math.min(Math.max(1, crop.width), sourceWidth - x),
      height: Math.min(Math.max(1, crop.height), sourceHeight - y)
    }
  }

  /** 读取图片旋转弧度，和 WebGL shader 保持同一输入语义。 */
  private getRotationRadians(element: IElement): number {
    return (this.getRotationDegrees(element) * Math.PI) / 180
  }

  /** 读取图片旋转角度，归一化到 0-359。 */
  private getRotationDegrees(element: IElement): number {
    const rotation = element.webglRotation || 0
    const normalized = rotation % 360
    return normalized < 0 ? normalized + 360 : normalized
  }

  /** 将 WebGL 图片滤镜转换为 Canvas2D fallback 可消费的 filter 字符串。 */
  private getCanvasFilter(element: IElement): string {
    if (!element.webglFilter) {
      return 'none'
    }
    const { grayscale, brightness, contrast } = this.getNormalizedFilter(element)
    if (grayscale === 0 && brightness === 1 && contrast === 1) {
      return 'none'
    }
    return [
      `grayscale(${grayscale})`,
      `contrast(${contrast})`,
      `brightness(${brightness})`
    ].join(' ')
  }

  /** 归一化 WebGL 图片滤镜输入，供缓存键和 Canvas2D fallback 共用。 */
  private getNormalizedFilter(element: IElement): {
    grayscale: number
    brightness: number
    contrast: number
  } {
    const filter = element.webglFilter || {}
    const grayscale = Math.min(1, Math.max(0, filter.grayscale ?? 0))
    const brightness = Math.max(0, filter.brightness ?? 1)
    const contrast = Math.max(0, filter.contrast ?? 1)
    return {
      grayscale,
      brightness,
      contrast
    }
  }
}
