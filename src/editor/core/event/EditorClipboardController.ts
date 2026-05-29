import { IPasteOption } from '../../interface/Event'
import { pasteImageFile } from '../modules/image/clipboard/pasteImageFile'
import { CanvasEvent } from './CanvasEvent'
import { pasteByClipboardApi } from './clipboard/pasteByClipboardApi'
import { pasteByClipboardEvent } from './clipboard/pasteByClipboardEvent'

export class EditorClipboardController {
  /** 初始化 EditorClipboardController 实例并注入运行依赖。 */
  constructor(private readonly host: CanvasEvent) {}

  public pasteByEvent(evt: ClipboardEvent) {
    pasteByClipboardEvent(this.host, evt)
  }

  public pasteByApi(options?: IPasteOption) {
    return pasteByClipboardApi(this.host, options)
  }

  public pasteImage(file: File | Blob) {
    pasteImageFile(this.host.getDraw(), file)
  }
}
