/** 纸张尺寸描述，用于浏览器打印 CSS 和页面尺寸设置。 */
export interface IPrintPaperSize {
  /** CSS @page 使用的标准纸张名称，非标准尺寸时为空。 */
  size: string
  /** CSS 宽度值，标准纸张使用 mm，其他尺寸使用 px。 */
  width: string
  /** CSS 高度值，标准纸张使用 mm，其他尺寸使用 px。 */
  height: string
}

const PRINT_STANDARD_PAPER_SIZE_LIST: Array<
  IPrintPaperSize & { pxWidth: number; pxHeight: number }
> = [
  {
    pxWidth: 1125,
    pxHeight: 1593,
    size: 'a3',
    width: '297mm',
    height: '420mm'
  },
  {
    pxWidth: 794,
    pxHeight: 1123,
    size: 'a4',
    width: '210mm',
    height: '297mm'
  },
  {
    pxWidth: 565,
    pxHeight: 796,
    size: 'a5',
    width: '148mm',
    height: '210mm'
  }
]

/** 把编辑器内部像素尺寸换算成浏览器打印可识别的纸张尺寸。 */
export function convertPxToPaperSize(width: number, height: number): IPrintPaperSize {
  const standardPaperSize = PRINT_STANDARD_PAPER_SIZE_LIST.find(
    item => item.pxWidth === width && item.pxHeight === height
  )
  if (standardPaperSize) {
    const { size, width: paperWidth, height: paperHeight } = standardPaperSize
    return {
      size,
      width: paperWidth,
      height: paperHeight
    }
  }
  return {
    size: '',
    width: `${width}px`,
    height: `${height}px`
  }
}
