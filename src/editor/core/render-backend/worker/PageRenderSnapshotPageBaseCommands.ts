
import { BackgroundRepeat, BackgroundSize } from '../../../dataset/enum/Background'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IPlaceholder } from '../../../interface/Placeholder'
import { formatElementList } from '../../../utils/element'
import { LineBreakParticle } from '../../draw/particle/LineBreakParticle'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotRowCommands } from './PageRenderSnapshotRowCommands'

/** Page background and document placeholder commands. */
export abstract class PageRenderSnapshotPageBaseCommands extends PageRenderSnapshotRowCommands {
  protected buildBackgroundCommands(pageNo: number): IWorkerPaintCommand[] {
    const {
      background: { image, color, applyPageNumbers, repeat, size },
      width,
      height,
      scale
    } = this.draw.getRuntime().getOptions()
    if (
      image &&
      (!applyPageNumbers?.length || applyPageNumbers.includes(pageNo))
    ) {
      if (size !== BackgroundSize.CONTAIN && size !== BackgroundSize.COVER) {
        throw new Error('worker snapshot does not support background size')
      }
      if (
        repeat !== BackgroundRepeat.NO_REPEAT &&
        repeat !== BackgroundRepeat.REPEAT &&
        repeat !== BackgroundRepeat.REPEAT_X &&
        repeat !== BackgroundRepeat.REPEAT_Y
      ) {
        throw new Error('worker snapshot does not support background repeat')
      }
      return [
        {
          type: 'backgroundImage',
          src: image,
          scale,
          width,
          height,
          size,
          repeat
        }
      ]
    }
    return [
      {
        type: 'fillRect',
        rect: {
          x: 0,
          y: 0,
          width: this.draw.getWidth(),
          height: this.draw.getHeight()
        },
        fillStyle: color
      }
    ]
  }

  protected buildPlaceholderCommands(): IWorkerPaintCommand[] {
    if (
      !this.draw.getObjectResolver().getIsOriginalMainPlaceholderAvailable()
    ) {
      return []
    }
    const { placeholder } = this.draw.getRuntime().getOptions()
    return this.buildPlaceholderTextCommands(placeholder)
  }

  /** 生成指定占位符文本命令。 */
  protected buildPlaceholderTextCommands(
    placeholder: Required<IPlaceholder>,
    startY?: number
  ): IWorkerPaintCommand[] {
    const { lineBreak, scale } = this.draw.getRuntime().getOptions()
    const elementList: IElement[] = [
      {
        value: placeholder.data,
        font: placeholder.font,
        size: placeholder.size,
        color: placeholder.color
      }
    ]
    formatElementList(elementList, {
      editorOptions: this.draw.getRuntime().getOptions(),
      isForceCompensation: true
    })
    const rowList = this.draw.computeRowList({
      innerWidth: this.draw.getInnerWidth(),
      elementList
    })
    const positionList: IElementPosition[] = []
    const margins = this.draw.getMargins()
    let startX = margins[3]
    if (!lineBreak.disabled) {
      startX += (LineBreakParticle.WIDTH + LineBreakParticle.GAP) * scale
    }
    this.draw.getCoordinate().computePageRowPosition({
      positionList,
      rowList,
      pageNo: 0,
      startRowIndex: 0,
      startIndex: 0,
      startX,
      startY: startY ?? margins[0] + this.draw.getHeader().getExtraHeight(),
      innerWidth: this.draw.getInnerWidth()
    })
    const commandList: IWorkerPaintCommand[] = []
    this.buildRowTextCommands(
      commandList,
      rowList as IDrawPagePayload['rowList'],
      positionList,
      placeholder.opacity,
      {
        drawLineBreak: false
      }
    )
    return commandList
  }
}
