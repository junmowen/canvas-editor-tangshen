import { debugDrop } from '../debug/drop'
import { IOverrideResult } from '../../extension/override/Override'
import { CanvasEvent } from '../CanvasEvent'

/**
 * 处理拖放事件。
 *
 * 这里保留独立模块，方便后续按文件拆分图片、文本和外部文件的拖放分支。
 */
export function drop(evt: DragEvent, host: CanvasEvent) {
  debugDrop(evt, host)
  const draw = host.getDraw()
  // 自定义拖放事件
  const { drop } = draw.getOverride()
  if (drop) {
    const overrideResult = drop(evt)
    // 默认阻止默认事件
    if ((<IOverrideResult>overrideResult)?.preventDefault !== false) return
  }
  evt.preventDefault()
  const data = evt.dataTransfer?.getData('text')
  if (data) {
    host.input(data)
  } else {
    const files = evt.dataTransfer?.files
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type.startsWith('image')) {
        host.getClipboardController().pasteImage(file)
      }
    }
  }
}
