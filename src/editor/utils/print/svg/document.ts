import { FORMAT_PLACEHOLDER } from '../../../dataset/constant/PageNumber'
import { BackgroundRepeat, BackgroundSize } from '../../../dataset/enum/Background'
import { PaperDirection } from '../../../dataset/enum/Editor'
import { RowFlex } from '../../../dataset/enum/Row'
import { WatermarkType } from '../../../dataset/enum/Watermark'
import {
  isWorkerSnapshotFloatingImage,
  resolveFloatingImageRenderPosition
} from '../../../core/modules/image/render/WorkerSnapshotImageRenderPolicy'
import {
  escapePrintSvgText,
  getPrintSvgPageMetric,
  isPrintSvgPageApplied,
  measurePrintSvgTextWidth,
  normalizePrintSvgOpacity,
  replacePrintSvgNumberPlaceholder
} from './core'
import { createPrintSvgRowDecorationContent } from './decoration'
import { createPrintSvgImage, createPrintSvgPageContent } from './inline'
import { waitPrintSvgResources } from './PrintSvgDocumentResourceAdapter'
import { resolvePrintSvgPageLayout } from './PrintSvgPageLayoutAdapter'
import { createPrintSvgRect } from './shape'
import { createPrintSvgTableContent } from './table'
import { IPrintSvgDocumentPayload } from './types'
function createPrintSvgBackground(payload: IPrintSvgDocumentPayload, pageNo: number) {
  const options = payload.editorOptions
  const background = options?.background
  if (!background) return ''
  if (!isPrintSvgPageApplied(background.applyPageNumbers, pageNo)) {
    return ''
  }
  if (background.image) {
    if (background.repeat && background.repeat !== BackgroundRepeat.NO_REPEAT) {
      const patternId = `ce-print-bg-${pageNo}`
      const imageWidth =
        background.size === BackgroundSize.CONTAIN ? payload.width / 2 : payload.width
      const imageHeight =
        background.size === BackgroundSize.CONTAIN ? payload.height / 2 : payload.height
      const repeatWidth =
        background.repeat === BackgroundRepeat.REPEAT_Y ? payload.width : imageWidth
      const repeatHeight =
        background.repeat === BackgroundRepeat.REPEAT_X ? payload.height : imageHeight
      return `<defs><pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${repeatWidth}" height="${repeatHeight}">${createPrintSvgImage({ src: background.image, x: 0, y: 0, width: imageWidth, height: imageHeight })}</pattern></defs>${createPrintSvgRect({ x: 0, y: 0, width: payload.width, height: payload.height, fill: `url(#${patternId})` })}`
    }
    return createPrintSvgImage({
      src: background.image,
      x: 0,
      y: 0,
      width: payload.width,
      height: payload.height
    })
  }
  return createPrintSvgRect({
    x: 0,
    y: 0,
    width: payload.width,
    height: payload.height,
    fill: background.color
  })
}

/** 生成页码文本，支持当前页和总页数占位符。 */
function createPrintSvgPageNumberText(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  const pageNumber = payload.editorOptions?.pageNumber
  if (!pageNumber || pageNumber.disabled || pageNo < pageNumber.fromPageNo) {
    return ''
  }
  let text = pageNumber.format
  if (new RegExp(FORMAT_PLACEHOLDER.PAGE_NO).test(text)) {
    text = replacePrintSvgNumberPlaceholder(
      text,
      FORMAT_PLACEHOLDER.PAGE_NO,
      pageNo + pageNumber.startPageNo - pageNumber.fromPageNo,
      pageNumber.numberType
    )
  }
  if (new RegExp(FORMAT_PLACEHOLDER.PAGE_COUNT).test(text)) {
    text = replacePrintSvgNumberPlaceholder(
      text,
      FORMAT_PLACEHOLDER.PAGE_COUNT,
      (payload.pageCount || 1) - pageNumber.fromPageNo,
      pageNumber.numberType
    )
  }
  return text
}

/** 生成页码 SVG，位置按当前页边距和对齐方式计算。 */
function createPrintSvgPageNumber(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  const pageNumber = payload.editorOptions?.pageNumber
  if (!pageNumber || pageNumber.disabled) return ''
  const text = createPrintSvgPageNumberText(payload, pageNo)
  if (!text) return ''
  const metric = getPrintSvgPageMetric(payload, pageNo)
  const size = pageNumber.size
  const font = pageNumber.font
  const fontValue = `${size}px ${font}`
  const textWidth = measurePrintSvgTextWidth(text, fontValue)
  let x = metric.margins[3]
  if (pageNumber.rowFlex === RowFlex.CENTER) {
    x = (payload.width - textWidth) / 2
  } else if (pageNumber.rowFlex === RowFlex.RIGHT) {
    x = payload.width - textWidth - metric.margins[1]
  }
  const y = payload.height - pageNumber.bottom
  return `<text x="${x}" y="${y}" font-family="${escapePrintSvgText(font)}" font-size="${size}" fill="${escapePrintSvgText(pageNumber.color)}">${escapePrintSvgText(text)}</text>`
}

/** 格式化水印文本，支持页码占位符。 */
function formatPrintSvgWatermarkText(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  const watermark = payload.editorOptions?.watermark
  if (!watermark?.data) return ''
  let text = watermark.data
  if (new RegExp(FORMAT_PLACEHOLDER.PAGE_NO).test(text)) {
    text = replacePrintSvgNumberPlaceholder(
      text,
      FORMAT_PLACEHOLDER.PAGE_NO,
      pageNo + 1,
      watermark.numberType
    )
  }
  if (new RegExp(FORMAT_PLACEHOLDER.PAGE_COUNT).test(text)) {
    text = replacePrintSvgNumberPlaceholder(
      text,
      FORMAT_PLACEHOLDER.PAGE_COUNT,
      payload.pageCount || 1,
      watermark.numberType
    )
  }
  return text
}

/** 生成文本水印 SVG，重复水印使用 pattern，单个水印居中旋转。 */
function createPrintSvgTextWatermark(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  const watermark = payload.editorOptions?.watermark
  const text = formatPrintSvgWatermarkText(payload, pageNo)
  if (!watermark || !text) return ''
  const opacity = normalizePrintSvgOpacity(watermark.opacity)
  const font = escapePrintSvgText(watermark.font)
  const color = escapePrintSvgText(watermark.color)
  if (watermark.repeat) {
    const patternId = `ce-print-watermark-${pageNo}`
    const gapX = Math.max(watermark.gap?.[0] || 10, watermark.size)
    const gapY = Math.max(watermark.gap?.[1] || 10, watermark.size)
    return `<defs><pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${gapX}" height="${gapY}"><text x="${gapX / 2}" y="${gapY / 2}" text-anchor="middle" font-family="${font}" font-size="${watermark.size}" fill="${color}" opacity="${opacity}" transform="rotate(-45 ${gapX / 2} ${gapY / 2})">${escapePrintSvgText(text)}</text></pattern></defs>${createPrintSvgRect({ x: 0, y: 0, width: payload.width, height: payload.height, fill: `url(#${patternId})` })}`
  }
  return `<g transform="translate(${payload.width / 2} ${payload.height / 2}) rotate(-45)"><text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="${watermark.size}" fill="${color}" opacity="${opacity}">${escapePrintSvgText(text)}</text></g>`
}

/** 生成图片水印 SVG，重复图片水印使用 pattern。 */
function createPrintSvgImageWatermark(payload: IPrintSvgDocumentPayload, pageNo: number) {
  const watermark = payload.editorOptions?.watermark
  if (!watermark?.data) return ''
  const width = watermark.width || payload.width / 2
  const height = watermark.height || payload.height / 2
  const opacity = normalizePrintSvgOpacity(watermark.opacity)
  if (watermark.repeat) {
    const patternId = `ce-print-image-watermark-${pageNo}`
    const gapX = Math.max(watermark.gap?.[0] || 10, width)
    const gapY = Math.max(watermark.gap?.[1] || 10, height)
    return `<defs><pattern id="${patternId}" patternUnits="userSpaceOnUse" width="${gapX}" height="${gapY}">${createPrintSvgImage({ src: watermark.data, x: (gapX - width) / 2, y: (gapY - height) / 2, width, height, opacity })}</pattern></defs>${createPrintSvgRect({ x: 0, y: 0, width: payload.width, height: payload.height, fill: `url(#${patternId})` })}`
  }
  return `<g transform="translate(${payload.width / 2} ${payload.height / 2}) rotate(-45)">${createPrintSvgImage({ src: watermark.data, x: -width / 2, y: -height / 2, width, height, opacity })}</g>`
}

/** 生成水印 SVG，按文本水印和图片水印分支输出。 */
function createPrintSvgWatermark(payload: IPrintSvgDocumentPayload, pageNo: number) {
  const watermark = payload.editorOptions?.watermark
  if (!watermark?.data) return ''
  return watermark.type === WatermarkType.IMAGE
    ? createPrintSvgImageWatermark(payload, pageNo)
    : createPrintSvgTextWatermark(payload, pageNo)
}

/** 生成页边框 SVG，位置按当前页边距和页眉页脚额外高度计算。 */
function createPrintSvgPageBorder(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  const pageBorder = payload.editorOptions?.pageBorder
  if (!pageBorder || pageBorder.disabled) return ''
  const scale = payload.editorOptions?.scale || 1
  const metric = getPrintSvgPageMetric(payload, pageNo)
  const padding = pageBorder.padding || [0, 0, 0, 0]
  const x = metric.margins[3] - padding[3] * scale
  const y = metric.margins[0] + metric.headerExtraHeight - padding[0] * scale
  const width = metric.innerWidth + (padding[1] + padding[3]) * scale
  const height =
    payload.height -
    y -
    metric.footerExtraHeight -
    metric.margins[2] +
    padding[2] * scale
  const lineDash =
    pageBorder.style === 'dashed'
      ? pageBorder.dashArray || [4, 4]
      : pageBorder.style === 'dotted'
        ? pageBorder.dashArray || [1, 3]
        : pageBorder.dashArray
  return createPrintSvgRect({
    x,
    y,
    width,
    height,
    stroke: pageBorder.color,
    strokeWidth: pageBorder.lineWidth * scale,
    lineDash
  })
}

/** 生成浮动图片 SVG，包含正文浮动图片以及页眉页脚中的浮动图片。 */
function createPrintSvgFloatImageContent(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  const scale = payload.editorOptions?.scale || 1
  return (payload.floatPositionList || [])
    .filter(floatPosition => {
      return floatPosition.pageNo === pageNo
    })
    .map(floatPosition => {
      const element = floatPosition.element
      if (
        !isWorkerSnapshotFloatingImage(element) ||
        !element.imgFloatPosition ||
        element.hide ||
        element.control?.hide ||
        element.area?.hide
      ) {
        return ''
      }
      const renderPosition = resolveFloatingImageRenderPosition({
        floatPosition,
        scale
      })
      if (!renderPosition) {
        return ''
      }
      return createPrintSvgImage({
        src: element.value,
        x: renderPosition.x,
        y: renderPosition.y,
        width: (element.width || 0) * scale,
        height: (element.height || 0) * scale
      })
    })
    .join('')
}

/** 生成签章/徽章 SVG，使用渲染层已经解析好的图片位置。 */
function createPrintSvgBadgeContent(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  return (payload.badgeListByPage?.[pageNo] || [])
    .map(item =>
      createPrintSvgImage({
        src: item.value,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height
      })
    )
    .join('')
}

/** 生成单页 SVG 的完整内容，按背景、水印、正文、页眉页脚和页码分层。 */
function createPrintSvgDocumentPageContent(
  payload: IPrintSvgDocumentPayload,
  pageNo: number
) {
  const pagePositionList = payload.mainPositionList.filter(
    position => position.pageNo === pageNo
  )
  const headerPositionList = payload.headerPositionListByPage?.[pageNo] || []
  const footerPositionList = payload.footerPositionListByPage?.[pageNo] || []
  const contentList = [
    createPrintSvgBackground(payload, pageNo),
    createPrintSvgWatermark(payload, pageNo),
    createPrintSvgFloatImageContent(payload, pageNo),
    createPrintSvgTableContent({
      pageRows: payload.pageRowList?.[pageNo],
      pagePositionList,
      options: payload.editorOptions
    }),
    createPrintSvgRowDecorationContent({
      pageRows: payload.pageRowList?.[pageNo],
      pagePositionList,
      options: payload.editorOptions
    }),
    createPrintSvgPageContent(pagePositionList, payload.editorOptions),
    createPrintSvgRowDecorationContent({
      pageRows: payload.headerRowListByPage?.[pageNo],
      pagePositionList: headerPositionList,
      options: payload.editorOptions
    }),
    createPrintSvgPageContent(headerPositionList, payload.editorOptions),
    createPrintSvgRowDecorationContent({
      pageRows: payload.footerRowListByPage?.[pageNo],
      pagePositionList: footerPositionList,
      options: payload.editorOptions
    }),
    createPrintSvgPageContent(footerPositionList, payload.editorOptions),
    createPrintSvgBadgeContent(payload, pageNo),
    createPrintSvgPageNumber(payload, pageNo),
    createPrintSvgPageBorder(payload, pageNo)
  ]
  return contentList.join('')
}

/** 根据完整文档打印载荷生成每页 SVG，覆盖正文和页面装饰层。 */
export function createPrintSvgPageListFromDocument(
  payload: IPrintSvgDocumentPayload
) {
  const pageCount = Math.max(
    1,
    payload.pageCount || 0,
    payload.pageRowList?.length || 0,
    payload.headerPositionListByPage?.length || 0,
    payload.footerPositionListByPage?.length || 0,
    ...payload.mainPositionList.map(position => position.pageNo + 1)
  )
  return Array.from({ length: pageCount }, (_, pageNo) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${payload.width}" height="${payload.height}" viewBox="0 0 ${payload.width} ${payload.height}">${createPrintSvgDocumentPageContent(payload, pageNo)}</svg>`
  })
}

/** 生成 CSS @page size 值，非标准纸张直接使用宽高避免浏览器回退默认纸张。 */
export function createPrintSvgPageCssSize(payload: {
  /** 编辑器纸张宽度，单位 px。 */
  width: number
  /** 编辑器纸张高度，单位 px。 */
  height: number
  /** 纸张方向，用于标准纸张名称的 portrait/landscape 后缀。 */
  direction?: PaperDirection
}) {
  return resolvePrintSvgPageLayout(payload).pageCssSize
}

/** 通过 SVG 矢量页面直接弹出浏览器打印框。 */
export function printSvgDocument(payload: IPrintSvgDocumentPayload) {
  const { width, height, direction = PaperDirection.VERTICAL } = payload
  const printLayout = resolvePrintSvgPageLayout({ width, height, direction })
  const iframe = document.createElement('iframe')
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
  const svgPageList = createPrintSvgPageListFromDocument(payload)
  const stylesheet = `
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
  }
  .ce-svg-print-page {
    width: ${printLayout.pageWidth};
    height: ${printLayout.pageHeight};
    page-break-after: always;
  }
  .ce-svg-print-page svg {
    display: block;
    width: 100%;
    height: 100%;
  }
  @page {
    margin: 0;
    size: ${printLayout.pageCssSize};
  }`
  doc.open()
  doc.write(`<!doctype html><html><head><style>${stylesheet}</style></head><body>${svgPageList.map(svg => `<div class="ce-svg-print-page">${svg}</div>`).join('')}</body></html>`)
  doc.close()
  void waitPrintSvgResources(doc).then(() => {
    contentWindow.focus()
    contentWindow.print()
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
