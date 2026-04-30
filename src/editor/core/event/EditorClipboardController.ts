import { IPasteOption } from '../../interface/Event'
import { CanvasEvent } from './CanvasEvent'
import { pasteByClipboardApi } from './clipboard/pasteByClipboardApi'
import { pasteByClipboardEvent } from './clipboard/pasteByClipboardEvent'
import { pasteImageFile } from './clipboard/pasteImageFile'

export class EditorClipboardController {
  constructor(private readonly host: CanvasEvent) {}

  public pasteByEvent(evt: ClipboardEvent) {
    pasteByClipboardEvent(this.host, evt)
  }

  public pasteByApi(options?: IPasteOption) {
    return pasteByClipboardApi(this.host, options)
  }

  public pasteImage(file: File | Blob) {
    pasteImageFile(this.host, file)
  }
}
