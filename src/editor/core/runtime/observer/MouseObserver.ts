import { EventBusMap } from '../../../interface/EventBus'
import { Draw } from '../../draw/Draw'
import { EventBus } from '../../event/eventbus/EventBus'

export class MouseObserver {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 事件总线实例，用于发布和订阅编辑器内部事件。 */
  private eventBus: EventBus<EventBusMap>
  /** 页面容器 DOM，用于承载页面、浮层或交互节点。 */
  private pageContainer: HTMLDivElement
  /** 初始化 MouseObserver 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.eventBus = this.draw.getEventBus()
    this.pageContainer = this.draw.getPageCanvasHost().getPageContainer()
    this.pageContainer.addEventListener('mousemove', this._mousemove.bind(this))
    this.pageContainer.addEventListener(
      'mouseenter',
      this._mouseenter.bind(this)
    )
    this.pageContainer.addEventListener(
      'mouseleave',
      this._mouseleave.bind(this)
    )
    this.pageContainer.addEventListener('mousedown', this._mousedown.bind(this))
    this.pageContainer.addEventListener('mouseup', this._mouseup.bind(this))
    this.pageContainer.addEventListener('click', this._click.bind(this))
  }

  private _mousemove(evt: MouseEvent) {
    if (!this.eventBus.isSubscribe('mousemove')) return
    this.eventBus.emit('mousemove', evt)
  }

  private _mouseenter(evt: MouseEvent) {
    if (!this.eventBus.isSubscribe('mouseenter')) return
    this.eventBus.emit('mouseenter', evt)
  }

  private _mouseleave(evt: MouseEvent) {
    if (!this.eventBus.isSubscribe('mouseleave')) return
    this.eventBus.emit('mouseleave', evt)
  }

  private _mousedown(evt: MouseEvent) {
    if (!this.eventBus.isSubscribe('mousedown')) return
    this.eventBus.emit('mousedown', evt)
  }

  private _mouseup(evt: MouseEvent) {
    if (!this.eventBus.isSubscribe('mouseup')) return
    this.eventBus.emit('mouseup', evt)
  }

  private _click(evt: MouseEvent) {
    if (!this.eventBus.isSubscribe('click')) return
    this.eventBus.emit('click', evt)
  }
}
