import { PaperDirection } from '../dataset/enum/Editor'
import { resolvePrintImageLayout } from './print/PrintImageLayoutAdapter'

export * from './print/svg'

/** 打印图片base64选项，用于约束调用方可传入的可选配置。 */
export interface IPrintImageBase64Option {
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction?: PaperDirection
}
/** 打印图片base64，生成打印或导出需要的内容。 */
export function printImageBase64(
  base64List: string[],
  options: IPrintImageBase64Option
) {
  const { width, height, direction = PaperDirection.VERTICAL } = options
  const iframe = document.createElement('iframe')
  // 离屏渲染
  iframe.style.visibility = 'hidden'
  iframe.style.position = 'absolute'
  iframe.style.left = '0'
  iframe.style.top = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.append(iframe)
  const contentWindow = iframe.contentWindow!
  const doc = contentWindow.document
  doc.open()
  const container = document.createElement('div')
  const printLayout = resolvePrintImageLayout({ width, height, direction })
  base64List.forEach(base64 => {
    const image = document.createElement('img')
    image.style.width = printLayout.imageWidth
    image.style.height = printLayout.imageHeight
    image.src = base64
    container.append(image)
  })
  const style = document.createElement('style')
  const stylesheet = `
  * {
    margin: 0;
    padding: 0;
  }
  @page {
    margin: 0;
    size: ${printLayout.paperSize.size} ${printLayout.pageOrientation};
  }`
  style.append(document.createTextNode(stylesheet))
  setTimeout(() => {
    doc.write(`${style.outerHTML}${container.innerHTML}`)
    contentWindow.print()
    doc.close()
    // 移除iframe
    window.addEventListener(
      'mouseover',
      () => {
        iframe?.remove()
      },
      {
        once: true
      }
    )
  })
}
