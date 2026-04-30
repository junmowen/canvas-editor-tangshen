import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { formatElementContext } from '../../../utils/element'
import { CanvasEvent } from '../CanvasEvent'

export function pasteImageFile(host: CanvasEvent, file: File | Blob) {
  const draw = host.getDraw()
  if (draw.isReadonly() || draw.isDisabled()) return
  const rangeManager = draw.getComponents().range
  const { startIndex } = rangeManager.getEditBoundaryRange()
  const elementList = draw.getElementList()
  const fileReader = new FileReader()
  fileReader.readAsDataURL(file)
  fileReader.onload = () => {
    const image = new Image()
    const value = fileReader.result as string
    image.src = value
    image.onload = () => {
      const imageElement: IElement = {
        value,
        type: ElementType.IMAGE,
        width: image.width,
        height: image.height
      }
      if (~startIndex) {
        formatElementContext(elementList, [imageElement], startIndex, {
          editorOptions: draw.getOptions()
        })
      }
      draw.insertElementList([imageElement])
    }
  }
}
