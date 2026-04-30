type IBoxPoint = {
  left: number
  right: number
  top: number
  bottom: number
}

function getBaseCanvas(doc: Document, pageNo: number): HTMLCanvasElement {
  const canvas = doc.querySelector(
    `canvas[data-index="${pageNo}"]`
  ) as HTMLCanvasElement | null
  if (!canvas) {
    throw new Error(`base canvas ${pageNo} not found`)
  }
  return canvas
}

function getOverlayCanvas(
  doc: Document,
  pageNo: number
): HTMLCanvasElement | null {
  return doc.querySelector(
    `canvas[data-overlay-index="${pageNo}"]`
  ) as HTMLCanvasElement | null
}

function getCompositedPageCanvas(
  doc: Document,
  pageNo: number
): HTMLCanvasElement {
  const baseCanvas = getBaseCanvas(doc, pageNo)
  const overlayCanvas = getOverlayCanvas(doc, pageNo)
  const compositedCanvas = doc.createElement('canvas')
  compositedCanvas.width = baseCanvas.width
  compositedCanvas.height = baseCanvas.height
  const ctx = compositedCanvas.getContext('2d')
  if (!ctx) {
    throw new Error(`composited ctx ${pageNo} not found`)
  }
  ctx.drawImage(baseCanvas, 0, 0)
  if (overlayCanvas) {
    ctx.drawImage(overlayCanvas, 0, 0)
  }
  return compositedCanvas
}

export function readCompositedPageBoxStats(
  doc: Document,
  pageNo: number,
  point: IBoxPoint
) {
  const baseCanvas = getBaseCanvas(doc, pageNo)
  const compositedCanvas = getCompositedPageCanvas(doc, pageNo)
  const ctx = compositedCanvas.getContext('2d')
  if (!ctx) {
    throw new Error(`ctx ${pageNo} not found`)
  }
  const scaleX = compositedCanvas.width / baseCanvas.clientWidth
  const scaleY = compositedCanvas.height / baseCanvas.clientHeight
  const x = Math.max(0, Math.floor(point.left * scaleX))
  const y = Math.max(0, Math.floor(point.top * scaleY))
  const width = Math.max(1, Math.ceil((point.right - point.left) * scaleX))
  const height = Math.max(1, Math.ceil((point.bottom - point.top) * scaleY))
  const image = ctx.getImageData(x, y, width, height).data
  let blueish = 0
  for (let index = 0; index < image.length; index += 4) {
    const r = image[index]
    const g = image[index + 1]
    const b = image[index + 2]
    if (b > r && b > g) {
      blueish++
    }
  }
  return {
    width,
    height,
    blueish
  }
}
