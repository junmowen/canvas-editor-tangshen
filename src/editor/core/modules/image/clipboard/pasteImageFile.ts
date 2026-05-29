import { ElementType } from '../../../../dataset/enum/Element'
import { IElement } from '../../../../interface/Element'
import { formatElementContext } from '../../../../utils/element'
import { Draw } from '../../../draw/Draw'
import { isEditorDisabled } from '../../../shared/utils/editorState'

/** 将剪贴板图片文件插入为编辑器图片元素。 */
export function pasteImageFile(draw: Draw, file: File | Blob) {
  if (isEditorDisabled(draw)) return
  const rangeManager = draw.getComponents().range
  const { startIndex } = rangeManager.getEditBoundaryRange()
  const elementList = draw.getObjectResolver().getElementList()
  // 创建 file Reader 实例。
  const fileReader = new FileReader()
  fileReader.readAsDataURL(file)
  fileReader.onload = () => {
    // 创建 image 实例。
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
