import { EventBusMap } from '../../../interface/EventBus'
import { Draw } from '../../draw/Draw'
import { EventBus } from '../../event/eventbus/EventBus'
import { positionContextChange } from './handlers/positionContextChange'

export class Actuator {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 事件总线实例，用于发布和订阅编辑器内部事件。 */
  private eventBus: EventBus<EventBusMap>

  /** 初始化 Actuator 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.eventBus = draw.getEventBus()
    this.execute()
  }

  /** 执行命令或历史事务，并把结果同步到编辑器状态。 */
  private execute() {
    this.eventBus.on('positionContextChange', payload => {
      positionContextChange(this.draw, payload)
    })
  }
}
