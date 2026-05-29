import { IRowElement } from '../../../../interface/Row'
import { AbstractScriptParticle } from './AbstractScriptParticle'

export class SubscriptParticle extends AbstractScriptParticle {
  // 向下偏移字高的一半
  public getOffsetY(element: IRowElement): number {
    return element.metrics.height / 2
  }
}
