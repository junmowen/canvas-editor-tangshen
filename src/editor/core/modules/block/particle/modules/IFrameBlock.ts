import type { Draw } from '../../../../draw/Draw'
import { IRowElement } from '../../../../../interface/Row'

export class IFrameBlock {
  public static readonly sandbox = [
    'allow-scripts',
    'allow-same-origin',
    'allow-presentation'
  ]
  private static readonly popupSandbox = [
    'allow-popups',
    'allow-popups-to-escape-sandbox',
    'allow-top-navigation-by-user-activation'
  ]
  /** 当前处理的元素数据。 */
  private element: IRowElement
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw

  /** 初始化 IFrameBlock 实例并注入运行依赖。 */
  constructor(element: IRowElement, draw: Draw) {
    this.element = element
    this.draw = draw
  }

  private _defineIframeProperties(iframeWindow: Window) {
    Object.defineProperties(iframeWindow, {
      // 禁止获取parent避免安全漏洞
      parent: {
        get: () => null
      },
      // 用于区分上下文
      __POWERED_BY_CANVAS_EDITOR__: {
        get: () => true
      }
    })
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = this.element.block!
    const iframe = document.createElement('iframe')
    iframe.setAttribute('data-id', this.element.id!)
    iframe.sandbox.add(...IFrameBlock.sandbox)
    const allowPopup = block.iframeBlock?.allowPopup !== false
    const allowFullscreen = block.iframeBlock?.allowFullscreen !== false
    if (allowPopup) {
      iframe.sandbox.add(...IFrameBlock.popupSandbox)
    }
    if (allowFullscreen) {
      iframe.allowFullscreen = true
      iframe.allow = 'fullscreen; picture-in-picture'
    }
    iframe.style.border = 'none'
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    if (this.draw.isReadonly() || this.draw.isPrintMode()) {
      iframe.setAttribute('inert', '')
      iframe.tabIndex = -1
      iframe.style.pointerEvents = 'none'
    }
    if (block.iframeBlock?.src) {
      iframe.src = block.iframeBlock.src
    } else if (block.iframeBlock?.srcdoc) {
      iframe.srcdoc = block.iframeBlock.srcdoc
    }
    blockItemContainer.append(iframe)
    // 重新定义iframe上属性
    this._defineIframeProperties(iframe.contentWindow!)
  }

  public syncSrcdocFromDom(): boolean {
    const iframe = document.querySelector<HTMLIFrameElement>(
      `iframe[data-id="${this.element.id}"]`
    )
    const iframeBlock = this.element.block?.iframeBlock
    if (!iframe || !iframeBlock || !iframeBlock.srcdoc) return false
    if (iframe.hasAttribute('inert')) return false
    try {
      const doc = iframe.contentDocument
      if (!doc) return false
      iframeBlock.srcdoc = doc.documentElement.outerHTML
      return true
    } catch {
      return false
    }
  }
}
