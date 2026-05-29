import { DeepRequired } from '../../../interface/Common'
import { EventBusMap } from '../../../interface/EventBus'
import { IEditorOption } from '../../../interface/Editor'
import { Listener } from '../../runtime/listener/Listener'
import { EventBus } from '../../event/eventbus/EventBus'

export class DrawViewState {
  /** 当前对象所属页码。 */
  private pageNo = 0
  private renderCount = 0
  private pagePixelRatio: number | null = null
  private visiblePageNoList: number[] = []
  /** 当前视口交叉页码，用于同步可见页和当前页状态。 */
  private intersectionPageNo = 0

  /** 初始化 DrawViewState 实例并注入运行依赖。 */
  constructor(
    private readonly listener: Listener,
    private readonly eventBus: EventBus<EventBusMap>,
    private readonly options: DeepRequired<IEditorOption>
  ) {}

  public getVisiblePageNoList(): number[] {
    return this.visiblePageNoList
  }

  public setVisiblePageNoList(payload: number[]) {
    this.visiblePageNoList = payload
    if (this.listener.visiblePageNoListChange) {
      this.listener.visiblePageNoListChange(this.visiblePageNoList)
    }
    if (this.eventBus.isSubscribe('visiblePageNoListChange')) {
      this.eventBus.emit('visiblePageNoListChange', this.visiblePageNoList)
    }
  }

  public getIntersectionPageNo(): number {
    return this.intersectionPageNo
  }

  public setIntersectionPageNo(payload: number) {
    this.intersectionPageNo = payload
    if (this.listener.intersectionPageNoChange) {
      this.listener.intersectionPageNoChange(this.intersectionPageNo)
    }
    if (this.eventBus.isSubscribe('intersectionPageNoChange')) {
      this.eventBus.emit('intersectionPageNoChange', this.intersectionPageNo)
    }
  }

  public getPageNo(): number {
    return this.pageNo
  }

  public setPageNo(payload: number) {
    this.pageNo = payload
  }

  public getRenderCount(): number {
    return this.renderCount
  }

  public incrementRenderCount(): number {
    this.renderCount += 1
    return this.renderCount
  }

  public replaceRenderCount(payload: number) {
    this.renderCount = payload
  }

  public getPagePixelRatio(): number {
    return this.pagePixelRatio || window.devicePixelRatio
  }

  public setPagePixelRatio(payload: number | null): boolean {
    if (
      (!this.pagePixelRatio && payload === window.devicePixelRatio) ||
      payload === this.pagePixelRatio
    ) {
      return false
    }
    this.pagePixelRatio = payload
    return true
  }

  public replacePagePixelRatio(payload: number | null) {
    this.pagePixelRatio = payload
  }

  public getPageMode() {
    return this.options.pageMode
  }
}
