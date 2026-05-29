import {
  BackgroundRepeat,
  BackgroundSize
} from '../../../../dataset/enum/Background'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { RenderLayer } from '../../../render-backend'
import { Draw } from '../../../draw/Draw'

/** 页面背景渲染器，负责绘制页面背景色和背景图片。 */
export class Background {
  /** Draw 门面实例，用于访问运行时配置和渲染后端 surface。 */
  private draw: Draw
  /** 编辑器完整配置，背景绘制会读取颜色、图片、缩放等配置。 */
  private options: DeepRequired<IEditorOption>
  /** 背景图片缓存，避免同一图片地址在多页渲染时重复加载。 */
  private imageCache: Map<string, HTMLImageElement>

  /** 初始化 Background 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
    this.imageCache = new Map()
  }

  /** 渲染背景颜色，把布局结果绘制到目标画布。 */
  private _renderBackgroundColor(
    ctx: CanvasRenderingContext2D,
    color: string,
    width: number,
    height: number
  ) {
    ctx.save()
    ctx.fillStyle = color
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }

  /**
   * 绘制背景图片。
   *
   * @param ctx - 目标页面 2D 上下文
   * @param imageElement - 已加载的背景图片
   * @param width - 页面逻辑宽度
   * @param height - 页面逻辑高度
   */
  private _drawImage(
    ctx: CanvasRenderingContext2D,
    imageElement: HTMLImageElement,
    width: number,
    height: number
  ) {
    const { background, scale } = this.options
    // contain
    if (background.size === BackgroundSize.CONTAIN) {
      const imageWidth = imageElement.width * scale
      const imageHeight = imageElement.height * scale
      if (
        !background.repeat ||
        background.repeat === BackgroundRepeat.NO_REPEAT
      ) {
        ctx.drawImage(imageElement, 0, 0, imageWidth, imageHeight)
      } else {
        let startX = 0
        let startY = 0
        const repeatXCount =
          background.repeat === BackgroundRepeat.REPEAT ||
          background.repeat === BackgroundRepeat.REPEAT_X
            ? Math.ceil((width * scale) / imageWidth)
            : 1
        const repeatYCount =
          background.repeat === BackgroundRepeat.REPEAT ||
          background.repeat === BackgroundRepeat.REPEAT_Y
            ? Math.ceil((height * scale) / imageHeight)
            : 1
        for (let x = 0; x < repeatXCount; x++) {
          for (let y = 0; y < repeatYCount; y++) {
            ctx.drawImage(imageElement, startX, startY, imageWidth, imageHeight)
            startY += imageHeight
          }
          startY = 0
          startX += imageWidth
        }
      }
    } else {
      // cover
      ctx.drawImage(imageElement, 0, 0, width * scale, height * scale)
    }
  }

  /** 渲染背景图片，把布局结果绘制到目标画布。 */
  private _renderBackgroundImage(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) {
    const { background } = this.options
    const imageElementCache = this.imageCache.get(background.image)
    if (imageElementCache) {
      this._drawImage(ctx, imageElementCache, width, height)
    } else {
      this.preloadImage().then(img => {
        this.imageCache.set(background.image, img)
        this._drawImage(ctx, img, width, height)
        // 避免层级上浮，触发编辑器二次渲染
        this.draw.render({
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
      })
    }
  }

  public preloadImage(): Promise<HTMLImageElement> {
    const {
      background: { image }
    } = this.options
    const imageElementCache = this.imageCache.get(image)
    if (imageElementCache) {
      return Promise.resolve(imageElementCache)
    }
    return new Promise((resolve, reject) => {
      // 创建 img 实例。
      const img = new Image()
      img.setAttribute('crossOrigin', 'Anonymous')
      img.onload = () => {
        this.imageCache.set(image, img)
        resolve(img)
      }
      img.onerror = () => {
        reject(new Error('failed to load background image'))
      }
      img.src = image
    })
  }

  /**
   * 绘制指定页面的背景。
   *
   * @param ctx - 当前页 base surface 的 2D 上下文
   * @param pageNo - 当前页码
   */
  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    const {
      background: { image, color, applyPageNumbers }
    } = this.options
    if (
      this.draw.getMode() === EditorMode.PRINT &&
      this.options.modeRule.print.backgroundDisabled
    ) {
      return
    }
    if (
      image &&
      (!applyPageNumbers?.length || applyPageNumbers.includes(pageNo))
    ) {
      const { width, height } = this.options
      this._renderBackgroundImage(ctx, width, height)
    } else {
      // 通过渲染后端读取当前页 base surface，避免继续依赖 Draw 暴露的单 canvas。
      const pageSurface = this.draw
        .getPageCanvasHost()
        .getSurface(pageNo, RenderLayer.BASE)
      const width = pageSurface?.canvas.width ?? ctx.canvas.width
      const height = pageSurface?.canvas.height ?? ctx.canvas.height
      this._renderBackgroundColor(ctx, color, width, height)
    }
  }
}
