import { ControlComponent } from '../../../../dataset/enum/Control'
import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

interface ICheckableControlRenderPayload {
  ctx: CanvasRenderingContext2D
  element: RowElement
  x: number
  y: number
  index: number
  row: IDrawRowPayload['rowList'][number]
  checkboxParticle: ReturnType<Draw['getCheckboxParticle']>
  radioParticle: ReturnType<Draw['getRadioParticle']>
}

/** checkbox / radio 行内控件渲染器。 */
export class CheckableControlRenderer {
  public isCheckable(element: RowElement) {
    return (
      element.type === ElementType.CHECKBOX ||
      element.controlComponent === ControlComponent.CHECKBOX ||
      element.type === ElementType.RADIO ||
      element.controlComponent === ControlComponent.RADIO
    )
  }

  public render(payload: ICheckableControlRenderPayload) {
    const {
      ctx,
      element,
      x,
      y,
      index,
      row,
      checkboxParticle,
      radioParticle
    } = payload
    if (
      element.type === ElementType.CHECKBOX ||
      element.controlComponent === ControlComponent.CHECKBOX
    ) {
      checkboxParticle.render({
        ctx,
        x,
        y,
        index,
        row
      })
      return
    }
    radioParticle.render({
      ctx,
      x,
      y,
      index,
      row
    })
  }
}
