import { EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { EditorZone } from '../../../dataset/enum/Editor'
import { throttle } from '../../../utils'
import { Draw } from '../../draw/Draw'
import { I18n } from '../../extension/i18n/I18n'
import { Zone } from './Zone'

export class ZoneTip {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 区域状态管理器，用于判断并切换正文、页眉、页脚等编辑区域。 */
  private zone: Zone
  /** 国际化服务实例，用于读取当前语言文案。 */
  private i18n: I18n
  /** 编辑器根容器，承载浮层、光标或交互节点。 */
  private container: HTMLDivElement
  /** 页面容器 DOM，用于承载页面、浮层或交互节点。 */
  private pageContainer: HTMLDivElement

  private isDisableMouseMove: boolean
  private tipContainer: HTMLDivElement
  private tipContent: HTMLSpanElement
  /** 鼠标当前悬停区域，用于控制区域提示和边界高亮。 */
  private currentMoveZone: EditorZone | undefined

  /** 初始化 ZoneTip 实例并注入运行依赖。 */
  constructor(draw: Draw, zone: Zone, i18n: I18n) {
    this.draw = draw
    this.zone = zone
    this.i18n = i18n
    this.container = draw.getPageCanvasHost().getContainer()
    this.pageContainer = draw.getPageCanvasHost().getPageContainer()

    const { tipContainer, tipContent } = this._drawZoneTip()
    this.tipContainer = tipContainer
    this.tipContent = tipContent
    this.isDisableMouseMove = true
    this.currentMoveZone = EditorZone.MAIN
    // 閻╂垵鎯夐崠鍝勭厵
    const watchZones: EditorZone[] = []
    const { header, footer } = draw.getRuntime().getOptions()
    if (!header.disabled) {
      watchZones.push(EditorZone.HEADER)
    }
    if (!footer.disabled) {
      watchZones.push(EditorZone.FOOTER)
    }
    if (watchZones.length) {
      this._watchMouseMoveZoneChange(watchZones)
    }
  }

  private _watchMouseMoveZoneChange(watchZones: EditorZone[]) {
    this.pageContainer.addEventListener(
      'mousemove',
      throttle((evt: MouseEvent) => {
        if (this.isDisableMouseMove || !this.draw.getIsPagingMode()) return
        const pagePoint = this.draw.getCoordinate().getPointerCoordinates(evt).page
        if (!pagePoint) {
          this._updateZoneTip(false)
          return
        }
        const mousemoveZone = this.zone.getZoneByY(pagePoint.y, pagePoint.pageNo)
        if (!watchZones.includes(mousemoveZone)) {
          this._updateZoneTip(false)
          return
        }
        this.currentMoveZone = mousemoveZone
        this._updateZoneTip(
          this.zone.getZone() === EditorZone.MAIN &&
            (mousemoveZone === EditorZone.HEADER ||
              mousemoveZone === EditorZone.FOOTER),
          evt.clientX,
          evt.clientY
        )
      }, 250)
    )
    this.pageContainer.addEventListener('mouseenter', () => {
      this.isDisableMouseMove = false
    })
    this.pageContainer.addEventListener('mouseleave', () => {
      this.isDisableMouseMove = true
      this._updateZoneTip(false)
    })
  }

  private _drawZoneTip() {
    const tipContainer = document.createElement('div')
    tipContainer.classList.add(`${EDITOR_PREFIX}-zone-tip`)
    const tipContent = document.createElement('span')
    tipContainer.append(tipContent)
    this.container.append(tipContainer)
    return {
      tipContainer,
      tipContent
    }
  }

  /** 更新zonetip，根据最新数据刷新运行态。 */
  private _updateZoneTip(visible: boolean, left?: number, top?: number) {
    if (visible) {
      this.tipContainer.classList.add('show')
      this.tipContainer.style.left = `${left}px`
      this.tipContainer.style.top = `${top}px`
      this.tipContent.innerText = this.i18n.t(
        `zone.${
          this.currentMoveZone === EditorZone.HEADER ? 'headerTip' : 'footerTip'
        }`
      )
    } else {
      this.tipContainer.classList.remove('show')
    }
  }
}
