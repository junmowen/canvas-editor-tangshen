import { IRowElement } from '../../../../interface/Row'
import { AbstractScriptParticle } from './AbstractScriptParticle'

export class SuperscriptParticle extends AbstractScriptParticle {
  // 向上偏移字高的一半
  public getOffsetY(element: IRowElement): number {
    return -element.metrics.height / 2
  }
}
