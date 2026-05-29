import { EDITOR_PREFIX } from '../../../../../dataset/constant/Editor'
import { EditorMode } from '../../../../../dataset/enum/Editor'
import { IEditorOption } from '../../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../../interface/Element'
import { EventBusMap } from '../../../../../interface/EventBus'
import {
  IPreviewerCreateResult,
  IPreviewerDrawOption
} from '../../../../../interface/Previewer'
import { downloadFile } from '../../../../../utils'
import { EventBus } from '../../../../event/eventbus/EventBus'
import { RenderLayer } from '../../../../render-backend'
import { Draw } from '../../../../draw/Draw'

/** 图片预览器，负责图片预览弹窗、拖拽缩放选区和当前页交互状态。 */
export class Previewer {
  /** 编辑器主容器，作为预览 DOM 的兜底挂载点。 */
  private container: HTMLDivElement
  /** 模态框宿主元素，用于挂载图片预览弹窗。 */
  private modalHost: HTMLDivElement
  /** 当前页覆盖层宿主，随图片所在页切换。 */
  private overlayHost: HTMLDivElement | null
  /** 当前页 base canvas，仅用于 cursor 等 DOM 副作用，不持有渲染资源生命周期。 */
  private canvas: HTMLCanvasElement | null
  /** Draw 门面实例，用于读取页面状态、渲染后端和事件总线。 */
  private draw: Draw
  /** 编辑器配置快照，提供缩放、模式和预览器样式配置。 */
  private options: Required<IEditorOption>
  /** 当前正在操作的图片元素。 */
  private curElement: IElement | null
  /** 当前图片预览地址，拖拽镜像和预览弹窗会复用。 */
  private curElementSrc: string
  /** 当前预览器绘制选项，控制拖拽和图片地址字段。 */
  private previewerDrawOption: IPreviewerDrawOption
  /** 当前图片在排版结果中的位置信息。 */
  private curPosition: IElementPosition | null
  /** 编辑器事件总线，用于派发和监听预览相关事件。 */
  private eventBus: EventBus<EventBusMap>
  // 图片列表
  private imageList: IElement[]
  private curShowElement: IElement | null
  private imageCount: HTMLSpanElement | null
  private imagePre: HTMLElement | null
  private imageNext: HTMLElement | null
  // 拖拽改变尺寸
  private resizerSelection: HTMLDivElement
  private resizerHandleList: HTMLDivElement[]
  private resizerImageContainer: HTMLDivElement
  private resizerImage: HTMLImageElement
  private resizerSize: HTMLSpanElement
  private width: number
  private height: number
  private mousedownX: number
  private mousedownY: number
  private curHandleIndex: number
  private currentPageNo: number
  // 预览选区
  private previewerContainer: HTMLDivElement | null
  private previewerImage: HTMLImageElement | null

  /** 初始化 Previewer 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.container = draw.getPageCanvasHost().getContainer()
    this.modalHost = draw.getPageCanvasHost().getModalHost()
    this.overlayHost = null
    this.canvas = null
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
    this.curElement = null
    this.curElementSrc = ''
    this.previewerDrawOption = {}
    this.curPosition = null
    this.eventBus = draw.getEventBus()
    this.imageList = []
    this.curShowElement = null
    this.imageCount = null
    this.imagePre = null
    this.imageNext = null
    // 图片尺寸缩放
    const {
      resizerSelection,
      resizerHandleList,
      resizerImageContainer,
      resizerImage,
      resizerSize
    } = this._createResizerDom()
    this.resizerSelection = resizerSelection
    this.resizerHandleList = resizerHandleList
    this.resizerImageContainer = resizerImageContainer
    this.resizerImage = resizerImage
    this.resizerSize = resizerSize
    this.width = 0
    this.height = 0
    this.mousedownX = 0
    this.mousedownY = 0
    this.curHandleIndex = 0 // 默认右下角
    this.currentPageNo = 0
    this.previewerContainer = null
    this.previewerImage = null
  }

  /** 解析页面no，把输入位置或状态转换为可执行结果。 */
  private _resolvePageNo(
    element: IElement,
    position: IElementPosition | null = null
  ): number {
    return element.imgFloatPosition?.pageNo ?? position?.pageNo ?? this.draw.getPageNo()
  }

  /**
   * 解析指定页的覆盖层宿主。
   *
   * @param pageNo - 目标页码
   * @returns 页面覆盖层宿主，缺失时回退到编辑器主容器
   */
  private _resolveOverlayHost(pageNo: number): HTMLDivElement {
    return this.draw.getPageCanvasHost().getPageOverlayHost(pageNo) || this.container
  }

  /**
   * 按页码解析 base canvas。
   *
   * canvas 由渲染后端统一管理，预览器只读取当前页节点处理光标副作用。
   *
   * @param pageNo - 目标页码
   * @returns 当前页 base canvas，未挂载时返回 null
   */
  private _resolvePageCanvas(pageNo: number): HTMLCanvasElement | null {
    return (
      this.draw.getPageCanvasHost().getSurface(pageNo, RenderLayer.BASE)
        ?.canvas || null
    )
  }

  /**
   * 把拖拽缩放 DOM 挂载到目标页覆盖层。
   *
   * @param pageNo - 图片所在页码
   */
  private _attachResizerHost(pageNo: number) {
    this.currentPageNo = pageNo
    this.overlayHost = this._resolveOverlayHost(pageNo)
    if (this.resizerSelection.parentElement !== this.overlayHost) {
      this.overlayHost.append(this.resizerSelection)
    }
    if (this.resizerImageContainer.parentElement !== this.overlayHost) {
      this.overlayHost.append(this.resizerImageContainer)
    }
  }

  /** 获取元素位置，向调用方返回当前状态或计算结果。 */
  private _getElementPosition(
    element: IElement,
    position: IElementPosition | null = null
  /** 纵坐标，用于定位画布或页面内的位置。 */
  /** 横坐标，用于定位画布或页面内的位置。 */
  ): { x: number; y: number } {
    const { scale } = this.options
    let x = 0
    let y = 0
    // 优先使用浮动位置
    if (element.imgFloatPosition) {
      x = element.imgFloatPosition.x! * scale
      y = element.imgFloatPosition.y * scale
    } else if (position) {
      const {
        coordinate: {
          leftTop: [left, top]
        },
        ascent
      } = position
      x = left
      y = top + ascent
    }
    return { x, y }
  }

  /** 创建resizerdom，组装后续流程需要的对象或 DOM 结构。 */
  private _createResizerDom(): IPreviewerCreateResult {
    const { scale } = this.options
    // 拖拽边框
    const resizerSelection = document.createElement('div')
    resizerSelection.classList.add(`${EDITOR_PREFIX}-resizer-selection`)
    resizerSelection.style.display = 'none'
    resizerSelection.style.borderColor = this.options.resizerColor
    resizerSelection.style.borderWidth = `${scale}px`
    // 拖拽点
    const resizerHandleList: HTMLDivElement[] = []
    for (let i = 0; i < 8; i++) {
      const handleDom = document.createElement('div')
      handleDom.style.background = this.options.resizerColor
      handleDom.classList.add(`resizer-handle`)
      handleDom.classList.add(`handle-${i}`)
      handleDom.setAttribute('data-index', String(i))
      handleDom.onmousedown = this._mousedown.bind(this)
      resizerSelection.append(handleDom)
      resizerHandleList.push(handleDom)
    }
    this.container.append(resizerSelection)
    // 尺寸查看
    const resizerSizeView = document.createElement('div')
    resizerSizeView.classList.add(`${EDITOR_PREFIX}-resizer-size-view`)
    const resizerSize = document.createElement('span')
    resizerSizeView.append(resizerSize)
    resizerSelection.append(resizerSizeView)
    // 拖拽镜像
    const resizerImageContainer = document.createElement('div')
    resizerImageContainer.classList.add(`${EDITOR_PREFIX}-resizer-image`)
    resizerImageContainer.style.display = 'none'
    const resizerImage = document.createElement('img')
    resizerImageContainer.append(resizerImage)
    this.container.append(resizerImageContainer)
    return {
      resizerSelection,
      resizerHandleList,
      resizerImageContainer,
      resizerImage,
      resizerSize
    }
  }

  /** keydown 回调入口，用于通知外部或响应对应事件。 */
  private _keydown = () => {
    // 有键盘事件触发时，主动销毁拖拽选区
    if (this.resizerSelection.style.display === 'block') {
      this.clearResizer()
      document.removeEventListener('keydown', this._keydown)
    }
  }

  private _mousedown(evt: MouseEvent) {
    if (!this.curElement) return
    this.canvas = this._resolvePageCanvas(this.currentPageNo)
    // 当前页可能被虚拟滚动卸载，拿不到 canvas 时不启动拖拽，避免空引用副作用。
    if (!this.canvas) return
    const { scale } = this.options
    this.mousedownX = evt.clientX
    this.mousedownY = evt.clientY
    const target = evt.target as HTMLDivElement
    this.curHandleIndex = Number(target.dataset.index)
    // 改变光标
    const cursor = window.getComputedStyle(target).cursor
    document.body.style.cursor = cursor
    this.canvas.style.cursor = cursor
    // 拖拽图片镜像
    this.resizerImage.src = this.curElementSrc
    this.resizerImageContainer.style.display = 'block'
    // 优先使用浮动位置信息
    const { x: resizerLeft, y: resizerTop } = this._getElementPosition(
      this.curElement,
      this.curPosition
    )
    this.resizerImageContainer.style.left = `${resizerLeft}px`
    this.resizerImageContainer.style.top = `${resizerTop}px`
    this.resizerImage.style.width = `${this.curElement.width! * scale}px`
    this.resizerImage.style.height = `${this.curElement.height! * scale}px`
    // 追加全局事件
    const mousemoveFn = this._mousemove.bind(this)
    document.addEventListener('mousemove', mousemoveFn)
    document.addEventListener(
      'mouseup',
      () => {
        // 改变尺寸
        if (this.curElement && !this.previewerDrawOption.dragDisable) {
          this.curElement.width = this.width
          this.curElement.height = this.height
          this.draw.render({
            isSetCursor: true,
            curIndex: this.curPosition?.index
          })
        }
        // 还原副作用
        this.resizerImageContainer.style.display = 'none'
        document.removeEventListener('mousemove', mousemoveFn)
        document.body.style.cursor = ''
        this.canvas && (this.canvas.style.cursor = 'text')
      },
      {
        once: true
      }
    )
    evt.preventDefault()
  }

  private _mousemove(evt: MouseEvent) {
    if (!this.curElement || this.previewerDrawOption.dragDisable) return
    const { scale } = this.options
    let dx = 0
    let dy = 0
    switch (this.curHandleIndex) {
      case 0:
        {
          const offsetX = this.mousedownX - evt.clientX
          const offsetY = this.mousedownY - evt.clientY
          dx = Math.cbrt(offsetX ** 3 + offsetY ** 3)
          dy = (this.curElement.height! * dx) / this.curElement.width!
        }
        break
      case 1:
        dy = this.mousedownY - evt.clientY
        break
      case 2:
        {
          const offsetX = evt.clientX - this.mousedownX
          const offsetY = this.mousedownY - evt.clientY
          dx = Math.cbrt(offsetX ** 3 + offsetY ** 3)
          dy = (this.curElement.height! * dx) / this.curElement.width!
        }
        break
      case 4:
        {
          const offsetX = evt.clientX - this.mousedownX
          const offsetY = evt.clientY - this.mousedownY
          dx = Math.cbrt(offsetX ** 3 + offsetY ** 3)
          dy = (this.curElement.height! * dx) / this.curElement.width!
        }
        break
      case 3:
        dx = evt.clientX - this.mousedownX
        break
      case 5:
        dy = evt.clientY - this.mousedownY
        break
      case 6:
        {
          const offsetX = this.mousedownX - evt.clientX
          const offsetY = evt.clientY - this.mousedownY
          dx = Math.cbrt(offsetX ** 3 + offsetY ** 3)
          dy = (this.curElement.height! * dx) / this.curElement.width!
        }
        break
      case 7:
        dx = this.mousedownX - evt.clientX
        break
    }
    // 图片实际宽高（变化大小除掉缩放比例）
    const dw = this.curElement.width! + dx / scale
    const dh = this.curElement.height! + dy / scale
    if (dw <= 0 || dh <= 0) return
    this.width = dw
    this.height = dh
    // 图片显示宽高
    const elementWidth = dw * scale
    const elementHeight = dh * scale
    // 更新影子图片尺寸
    this.resizerImage.style.width = `${elementWidth}px`
    this.resizerImage.style.height = `${elementHeight}px`
    // 更新预览包围框尺寸
    this._updateResizerRect(elementWidth, elementHeight)
    // 尺寸预览
    this._updateResizerSizeView(elementWidth, elementHeight)
    evt.preventDefault()
    // 图片尺寸发生改变事件
    if (this.eventBus.isSubscribe('imageSizeChange')) {
      this.eventBus.emit('imageSizeChange', {
        element: this.curElement
      })
    }
  }

  private _drawPreviewer() {
    const previewerContainer = document.createElement('div')
    previewerContainer.classList.add(`${EDITOR_PREFIX}-image-previewer`)
    // 关闭按钮
    const closeBtn = document.createElement('i')
    closeBtn.classList.add('image-close')
    closeBtn.onclick = () => {
      this._clearPreviewer()
    }
    previewerContainer.append(closeBtn)
    // 图片
    const imgContainer = document.createElement('div')
    imgContainer.classList.add(`${EDITOR_PREFIX}-image-container`)
    const img = document.createElement('img')
    img.src = this.curElementSrc
    img.draggable = false
    imgContainer.append(img)
    this.previewerImage = img
    previewerContainer.append(imgContainer)
    // 操作栏
    let x = 0
    let y = 0
    let scaleSize = 1
    let rotateSize = 0
    const menuContainer = document.createElement('div')
    menuContainer.classList.add(`${EDITOR_PREFIX}-image-menu`)
    // 切换上下张图片
    const navigateContainer = document.createElement('div')
    navigateContainer.classList.add('image-navigate')
    const imagePre = document.createElement('i')
    imagePre.classList.add('image-pre')
    imagePre.onclick = () => {
      const curIndex = this.imageList.findIndex(
        el => el.id === this.curShowElement?.id
      )
      if (curIndex <= 0) return
      this.curShowElement = this.imageList[curIndex - 1]
      img.src = this.curShowElement.value
      this._updateImageNavigate()
    }
    navigateContainer.append(imagePre)
    this.imagePre = imagePre
    const imageCount = document.createElement('span')
    imageCount.classList.add('image-count')
    this.imageCount = imageCount
    navigateContainer.append(imageCount)
    const imageNext = document.createElement('i')
    imageNext.classList.add('image-next')
    imageNext.onclick = () => {
      const curIndex = this.imageList.findIndex(
        el => el.id === this.curShowElement?.id
      )
      if (curIndex >= this.imageList.length - 1) return
      this.curShowElement = this.imageList[curIndex + 1]
      img.src = this.curShowElement.value
      this._updateImageNavigate()
    }
    this.imageNext = imageNext
    navigateContainer.append(imageNext)
    menuContainer.append(navigateContainer)
    // 缩放
    const zoomIn = document.createElement('i')
    zoomIn.classList.add('zoom-in')
    zoomIn.onclick = () => {
      scaleSize += 0.1
      this._setPreviewerTransform(scaleSize, rotateSize, x, y)
    }
    menuContainer.append(zoomIn)
    const zoomOut = document.createElement('i')
    zoomOut.onclick = () => {
      if (scaleSize - 0.1 <= 0.1) return
      scaleSize -= 0.1
      this._setPreviewerTransform(scaleSize, rotateSize, x, y)
    }
    zoomOut.classList.add('zoom-out')
    menuContainer.append(zoomOut)
    // 旋转
    const rotate = document.createElement('i')
    rotate.classList.add('rotate')
    rotate.onclick = () => {
      rotateSize += 1
      this._setPreviewerTransform(scaleSize, rotateSize, x, y)
    }
    menuContainer.append(rotate)
    // 恢复原始大小
    const originalSize = document.createElement('i')
    originalSize.classList.add('original-size')
    originalSize.onclick = () => {
      x = 0
      y = 0
      scaleSize = 1
      rotateSize = 0
      this._setPreviewerTransform(scaleSize, rotateSize, x, y)
    }
    menuContainer.append(originalSize)
    // 下载图片
    const imageDownload = document.createElement('i')
    imageDownload.classList.add('image-download')
    imageDownload.onclick = () => {
      const { mime } = this.previewerDrawOption
      downloadFile(img.src, `${this.curElement?.id}.${mime || 'png'}`)
    }
    menuContainer.append(imageDownload)
    previewerContainer.append(menuContainer)
    this.previewerContainer = previewerContainer
    this.modalHost.append(previewerContainer)
    // 拖拽调整位置
    let startX = 0
    let startY = 0
    let isAllowDrag = false
    img.onmousedown = evt => {
      isAllowDrag = true
      startX = evt.clientX
      startY = evt.clientY
      previewerContainer.style.cursor = 'move'
    }
    previewerContainer.onmousemove = (evt: MouseEvent) => {
      if (!isAllowDrag) return
      x += evt.clientX - startX
      y += evt.clientY - startY
      startX = evt.clientX
      startY = evt.clientY
      this._setPreviewerTransform(scaleSize, rotateSize, x, y)
    }
    previewerContainer.onmouseup = () => {
      isAllowDrag = false
      previewerContainer.style.cursor = 'auto'
    }
    previewerContainer.onwheel = evt => {
      evt.preventDefault()
      evt.stopPropagation()
      if (evt.deltaY < 0) {
        // 放大
        scaleSize += 0.1
      } else {
        // 缩小
        if (scaleSize - 0.1 <= 0.1) return
        scaleSize -= 0.1
      }
      this._setPreviewerTransform(scaleSize, rotateSize, x, y)
    }
    // 更新图片索引信息
    this._updateImageNavigate()
  }

  /** 更新图片navigate，根据最新数据刷新运行态。 */
  private _updateImageNavigate() {
    // 更新当前图片位置索引
    const currentIndex = this.imageList.findIndex(
      el => el.id === this.curShowElement?.id
    )
    this.imageCount!.innerText = `${currentIndex + 1} / ${
      this.imageList.length
    }`
    // 更新按钮权限
    if (currentIndex <= 0) {
      this.imagePre!.classList.add('disabled')
    } else {
      this.imagePre!.classList.remove('disabled')
    }
    if (currentIndex >= this.imageList.length - 1) {
      this.imageNext!.classList.add('disabled')
    } else {
      this.imageNext!.classList.remove('disabled')
    }
  }

  /** 更新预览器transform，同步内部状态并触发必要的界面刷新。 */
  public _setPreviewerTransform(
    scale: number,
    rotate: number,
    x: number,
    y: number
  ) {
    if (!this.previewerImage) return
    this.previewerImage.style.left = `${x}px`
    this.previewerImage.style.top = `${y}px`
    this.previewerImage.style.transform = `scale(${scale}) rotate(${
      rotate * 90
    }deg)`
  }

  /** 清理预览器，释放缓存或移除旧的界面状态。 */
  private _clearPreviewer() {
    this.previewerContainer?.remove()
    this.previewerContainer = null
  }

  /** 更新resizerrect，根据最新数据刷新运行态。 */
  public _updateResizerRect(width: number, height: number) {
    const { resizerSize: handleSize, scale } = this.options
    const isReadonly = this.draw.isReadonly()
    this.resizerSelection.style.width = `${width}px`
    this.resizerSelection.style.height = `${height}px`
    // handle
    for (let i = 0; i < 8; i++) {
      const left =
        i === 0 || i === 6 || i === 7
          ? -handleSize
          : i === 1 || i === 5
          ? width / 2
          : width - handleSize
      const top =
        i === 0 || i === 1 || i === 2
          ? -handleSize
          : i === 3 || i === 7
          ? height / 2 - handleSize
          : height - handleSize
      this.resizerHandleList[i].style.transform = `scale(${scale})`
      this.resizerHandleList[i].style.left = `${left}px`
      this.resizerHandleList[i].style.top = `${top}px`
      this.resizerHandleList[i].style.display = isReadonly ? 'none' : 'block'
    }
  }

  /** 更新resizersizeview，根据最新数据刷新运行态。 */
  public _updateResizerSizeView(width: number, height: number) {
    this.resizerSize.innerText = `${Math.round(width)} × ${Math.round(height)}`
  }

  public render() {
    // 图片工具配置禁用又非设计模式时不渲染
    const mode = this.draw.getMode()
    if (
      !this.curElement ||
      (this.curElement.imgToolDisabled && !this.draw.isDesignMode()) ||
      (mode === EditorMode.PRINT &&
        this.options.modeRule[EditorMode.PRINT]?.imagePreviewerDisabled) ||
      (mode === EditorMode.READONLY &&
        this.options.modeRule[EditorMode.READONLY]?.imagePreviewerDisabled)
    ) {
      return
    }
    // 获取所有图片
    this.imageList = this.draw.getImageParticle().getOriginalMainImageList()
    this.curShowElement = this.curElement
    // 渲染预览框
    this._drawPreviewer()
  }

  public drawResizer(
    element: IElement,
    position: IElementPosition | null = null,
    options: IPreviewerDrawOption = {}
  ) {
    // 图片工具配置禁用又非设计模式时不渲染
    const mode = this.draw.getMode()
    if (
      (element.imgToolDisabled && !this.draw.isDesignMode()) ||
      (mode === EditorMode.PRINT &&
        this.options.modeRule[EditorMode.PRINT]?.imagePreviewerDisabled) ||
      (mode === EditorMode.READONLY &&
        this.options.modeRule[EditorMode.READONLY]?.imagePreviewerDisabled)
    ) {
      return
    }
    // 缓存配置
    this.previewerDrawOption = options
    this.curElementSrc = element[options.srcKey || 'value'] || ''
    // 更新渲染尺寸及位置
    this.updateResizer(element, position)
    // 监听事件
    document.addEventListener('keydown', this._keydown)
  }

  public updateResizer(
    element: IElement,
    position: IElementPosition | null = null
  ) {
    const { scale } = this.options
    const pageNo = this._resolvePageNo(element, position)
    this._attachResizerHost(pageNo)
    // 缓存当前页 canvas，后续 mousedown 会再次解析以适配页面挂载状态变化。
    this.canvas = this._resolvePageCanvas(pageNo)
    const elementWidth = element.width! * scale
    const elementHeight = element.height! * scale
    // 尺寸预览
    this._updateResizerSizeView(elementWidth, elementHeight)
    // 优先使用浮动位置信息
    const { x: resizerLeft, y: resizerTop } = this._getElementPosition(
      element,
      position
    )
    this.resizerSelection.style.left = `${resizerLeft}px`
    this.resizerSelection.style.top = `${resizerTop}px`
    this.resizerSelection.style.borderWidth = `${scale}px`
    // 更新预览包围框尺寸
    this._updateResizerRect(elementWidth, elementHeight)
    this.resizerSelection.style.display = 'block'
    // 缓存基础信息
    this.curElement = element
    this.curPosition = position
    this.width = elementWidth
    this.height = elementHeight
  }

  public clearResizer() {
    this.resizerSelection.style.display = 'none'
    document.removeEventListener('keydown', this._keydown)
  }
}
