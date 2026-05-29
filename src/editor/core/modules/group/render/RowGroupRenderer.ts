import { DeepRequired } from '../../../../interface/Common'
import { IDrawRowPayload } from '../../../../interface/Draw'
import { IEditorOption } from '../../../../interface/Editor'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 行级分组高亮渲染器，封装 group fill rect 记录和 flush。 */
export class RowGroupRenderer {
  /** 初始化 RowGroupRenderer 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 记录当前元素对应的分组高亮区域。 */
  public record(payload: {
    element: RowElement
    x: number
    y: number
    width: number
    rowHeight: number
    options: DeepRequired<IEditorOption>
  }) {
    const { element, x, y, width, rowHeight, options } = payload
    if (options.group.disabled || !element.groupIds) return
    this.draw.getGroup().recordFillInfo(element, x, y, width, rowHeight)
  }

  /** 输出并清空本轮行级分组高亮缓存。 */
  public flush(ctx: CanvasRenderingContext2D) {
    this.draw.getGroup().render(ctx)
  }
}
