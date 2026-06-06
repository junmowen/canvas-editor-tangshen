import {
  IWorkerPageRenderSnapshot,
  IWorkerRenderErrorResult,
  IWorkerRenderSuccessResult
} from './WorkerRenderProtocol'
import { BackgroundRepeat, BackgroundSize } from '../../../dataset/enum/Background'
import {
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../../modules/formula/debug/FormulaDebugLogger'
import { createFormulaVisualBox } from '../../modules/formula/model/FormulaVisualModel'

/** worker 图片资源缓存，避免同一页重复解码。 */
const imageBitmapCache = new Map<string, Promise<ImageBitmap>>()

/** 根据快照尺寸创建 worker 内部 OffscreenCanvas。 */
function createCanvas(snapshot: IWorkerPageRenderSnapshot): OffscreenCanvas {
  // 创建 canvas 实例。
  const canvas = new OffscreenCanvas(
    Math.floor(snapshot.width * snapshot.dpr),
    Math.floor(snapshot.height * snapshot.dpr)
  )
  return canvas
}

/** 获取 worker 侧图片 bitmap。 */
async function getImageBitmap(src: string): Promise<ImageBitmap> {
  let bitmapPromise = imageBitmapCache.get(src)
  if (!bitmapPromise) {
    bitmapPromise = createImageBlob(src)
      .then(blob => createImageBitmap(blob))
      .catch(error => {
        imageBitmapCache.delete(src)
        throw error
      })
    imageBitmapCache.set(src, bitmapPromise)
  }
  return bitmapPromise
}

/** 创建图片 Blob，SVG data URL 在 worker fetch 下存在浏览器行为差异，需手动解码。 */
async function createImageBlob(src: string): Promise<Blob> {
  const base64SvgPrefix = 'data:image/svg+xml;base64,'
  if (src.startsWith(base64SvgPrefix)) {
    const binary = atob(src.slice(base64SvgPrefix.length))
    // 创建 bytes 实例。
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: 'image/svg+xml' })
  }
  const response = await fetch(src)
  if (!response.ok) {
    throw new Error(`image fetch failed status=${response.status}`)
  }
  return response.blob()
}

/** 绘制页面背景图片，保持和主线程 Background 粒子的 contain / cover 语义一致。 */
async function drawBackgroundImage(
  ctx: OffscreenCanvasRenderingContext2D,
  command: Extract<
    IWorkerPageRenderSnapshot['commandList'][number],
    { type: 'backgroundImage' }
  >
) {
  const bitmap = await getImageBitmap(command.src)
  if (command.size === BackgroundSize.CONTAIN) {
    const imageWidth = bitmap.width * command.scale
    const imageHeight = bitmap.height * command.scale
    if (
      !command.repeat ||
      command.repeat === BackgroundRepeat.NO_REPEAT
    ) {
      ctx.drawImage(bitmap, 0, 0, imageWidth, imageHeight)
      return
    }
    const repeatXCount =
      command.repeat === BackgroundRepeat.REPEAT ||
      command.repeat === BackgroundRepeat.REPEAT_X
        ? Math.ceil((command.width * command.scale) / imageWidth)
        : 1
    const repeatYCount =
      command.repeat === BackgroundRepeat.REPEAT ||
      command.repeat === BackgroundRepeat.REPEAT_Y
        ? Math.ceil((command.height * command.scale) / imageHeight)
        : 1
    for (let x = 0; x < repeatXCount; x++) {
      for (let y = 0; y < repeatYCount; y++) {
        ctx.drawImage(
          bitmap,
          x * imageWidth,
          y * imageHeight,
          imageWidth,
          imageHeight
        )
      }
    }
    return
  }
  ctx.drawImage(
    bitmap,
    0,
    0,
    command.width * command.scale,
    command.height * command.scale
  )
}

/** 绘制重复文字水印。 */
function drawRepeatTextWatermark(
  ctx: OffscreenCanvasRenderingContext2D,
  command: Extract<
    IWorkerPageRenderSnapshot['commandList'][number],
    { type: 'repeatTextWatermark' }
  >
) {
  ctx.save()
  ctx.globalAlpha = command.alpha
  ctx.font = command.font
  const measureText = ctx.measureText(command.text)
  const textWidth = measureText.width
  const textHeight =
    measureText.actualBoundingBoxAscent +
    measureText.actualBoundingBoxDescent
  const diagonalLength = Math.sqrt(textWidth ** 2 + textHeight ** 2)
  const patternWidth = diagonalLength + 2 * command.gap[0]
  const patternHeight = diagonalLength + 2 * command.gap[1]
  // 创建 pattern Canvas 实例。
  const patternCanvas = new OffscreenCanvas(
    Math.max(1, Math.ceil(patternWidth)),
    Math.max(1, Math.ceil(patternHeight))
  )
  const patternCtx = patternCanvas.getContext(
    '2d'
  ) as OffscreenCanvasRenderingContext2D | null
  if (!patternCtx) {
    throw new Error('repeat watermark pattern context not found')
  }
  patternCtx.translate(patternWidth / 2, patternHeight / 2)
  patternCtx.rotate((-45 * Math.PI) / 180)
  patternCtx.translate(-patternWidth / 2, -patternHeight / 2)
  patternCtx.font = command.font
  patternCtx.fillStyle = command.fillStyle
  patternCtx.fillText(
    command.text,
    (patternWidth - textWidth) / 2,
    (patternHeight - textHeight) / 2 +
      measureText.actualBoundingBoxAscent
  )
  const pattern = ctx.createPattern(patternCanvas, 'repeat')
  if (pattern) {
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, command.width, command.height)
  }
  ctx.restore()
}

/** 绘制重复图片水印。 */
async function drawRepeatImageWatermark(
  ctx: OffscreenCanvasRenderingContext2D,
  command: Extract<
    IWorkerPageRenderSnapshot['commandList'][number],
    { type: 'repeatImageWatermark' }
  >
) {
  const bitmap = await getImageBitmap(command.src)
  const diagonalLength = Math.sqrt(
    command.imageWidth ** 2 + command.imageHeight ** 2
  )
  const patternWidth = diagonalLength + 2 * command.gap[0]
  const patternHeight = diagonalLength + 2 * command.gap[1]
  // 创建 pattern Canvas 实例。
  const patternCanvas = new OffscreenCanvas(
    Math.max(1, Math.ceil(patternWidth)),
    Math.max(1, Math.ceil(patternHeight))
  )
  const patternCtx = patternCanvas.getContext(
    '2d'
  ) as OffscreenCanvasRenderingContext2D | null
  if (!patternCtx) {
    throw new Error('repeat image watermark pattern context not found')
  }
  patternCtx.translate(patternWidth / 2, patternHeight / 2)
  patternCtx.rotate((-45 * Math.PI) / 180)
  patternCtx.translate(-patternWidth / 2, -patternHeight / 2)
  patternCtx.drawImage(
    bitmap,
    (patternWidth - command.imageWidth) / 2,
    (patternHeight - command.imageHeight) / 2,
    command.imageWidth,
    command.imageHeight
  )
  const pattern = ctx.createPattern(patternCanvas, 'repeat')
  if (pattern) {
    ctx.save()
    ctx.globalAlpha = command.alpha
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, command.width, command.height)
    ctx.restore()
  }
}

/** 执行单页 base 绘制命令。 */
async function renderSnapshot(
  snapshot: IWorkerPageRenderSnapshot
): Promise<ImageBitmap> {
  const canvas = createCanvas(snapshot)
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D | null
  if (!ctx) {
    throw new Error('OffscreenCanvas 2d context not found')
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.scale(snapshot.dpr, snapshot.dpr)
  ctx.textBaseline = 'alphabetic'
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'

  for (let i = 0; i < snapshot.commandList.length; i++) {
    const command = snapshot.commandList[i]
    if (command.type === 'clear') {
      ctx.clearRect(
        command.rect.x,
        command.rect.y,
        command.rect.width,
        command.rect.height
      )
    } else if (command.type === 'backgroundImage') {
      await drawBackgroundImage(ctx, command)
    } else if (command.type === 'fillRect') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.fillStyle = command.fillStyle
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      ctx.fillRect(
        command.rect.x,
        command.rect.y,
        command.rect.width,
        command.rect.height
      )
      ctx.restore()
    } else if (command.type === 'fillText') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.font = command.font
      ctx.fillStyle = command.fillStyle
      ctx.textBaseline = command.baseline ?? 'alphabetic'
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      if (command.rotate) {
        ctx.rotate(command.rotate)
      }
      ctx.fillText(command.text, command.x, command.y)
      ctx.restore()
    } else if (command.type === 'formulaText') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      const visualBox = createFormulaVisualBox({
        ctx: ctx as unknown as CanvasRenderingContext2D,
        latex: command.latex,
        font: command.font,
        defaultSize: command.defaultSize,
        element: {
          value: command.latex,
          color: command.fillStyle,
          formula: {
            latex: command.latex,
            placeholderText: command.placeholderText,
            placeholderColor: command.placeholderColor
          }
        } as any,
        defaultColor: command.fillStyle,
        debugSource: 'worker-render'
      })
      ctx.font = command.font
      ctx.fillStyle = command.fillStyle
      const textMetrics = ctx.measureText(command.displayText)
      const textWidth = textMetrics.width || visualBox.width
      const textAscent =
        textMetrics.actualBoundingBoxAscent || command.defaultSize * 0.82
      const textDescent =
        textMetrics.actualBoundingBoxDescent || command.defaultSize * 0.22
      // worker 使用布局层传入的占位宽高，避免缓存页公式尺寸和主线程不一致。
      const metricsWidth = Math.max(
        1,
        command.metricsWidth || textWidth
      )
      const metricsAscent =
        command.metricsAscent !== undefined
          ? command.metricsAscent
          : textAscent
      const metricsDescent =
        command.metricsDescent !== undefined
          ? command.metricsDescent
          : textDescent
      const metricsHeight = Math.max(1, metricsAscent + metricsDescent)
      const visualHeight = Math.max(1, visualBox.ascent + visualBox.descent)
      const scale = Math.min(
        1,
        metricsWidth / visualBox.width,
        metricsHeight / visualHeight
      )
      const renderWidth = visualBox.width * scale
      const renderX = command.x + Math.max(0, (metricsWidth - renderWidth) / 2)
      const renderY = command.y + Math.max(
        0,
        (metricsHeight - visualBox.ascent * scale - visualBox.descent * scale) / 2
      )
      ctx.translate(renderX, renderY)
      ctx.scale(scale, scale)
      visualBox.render(ctx as unknown as CanvasRenderingContext2D, 0, 0)
      if (command.debug) {
        logFormulaDebug('worker-render', {
          latex: command.latex,
          displayText: command.displayText,
          x: roundFormulaDebugNumber(command.x),
          baselineY: roundFormulaDebugNumber(command.y),
          visualWidth: roundFormulaDebugNumber(visualBox.width),
          visualAscent: roundFormulaDebugNumber(visualBox.ascent),
          visualDescent: roundFormulaDebugNumber(visualBox.descent),
          metricsWidth: roundFormulaDebugNumber(metricsWidth),
          metricsHeight: roundFormulaDebugNumber(metricsHeight),
          renderScale: roundFormulaDebugNumber(scale),
          font: command.font,
          fillStyle: command.fillStyle
        })
      }
      ctx.restore()
    } else if (command.type === 'repeatTextWatermark') {
      drawRepeatTextWatermark(ctx, command)
    } else if (command.type === 'repeatImageWatermark') {
      await drawRepeatImageWatermark(ctx, command)
    } else if (command.type === 'drawImage') {
      const bitmap = await getImageBitmap(command.src)
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      if (command.rotate) {
        ctx.rotate(command.rotate)
      }
      ctx.drawImage(
        bitmap,
        command.rect.x,
        command.rect.y,
        command.rect.width,
        command.rect.height
      )
      ctx.restore()
    } else if (command.type === 'strokeRect') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.strokeStyle = command.strokeStyle
      ctx.lineWidth = command.lineWidth
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      ctx.strokeRect(
        command.rect.x,
        command.rect.y,
        command.rect.width,
        command.rect.height
      )
      ctx.restore()
    } else if (command.type === 'strokePath') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.strokeStyle = command.strokeStyle
      ctx.lineWidth = command.lineWidth
      ctx.setLineDash(command.lineDash ?? [])
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      ctx.beginPath()
      for (let j = 0; j < command.segmentList.length; j++) {
        const segment = command.segmentList[j]
        ctx.moveTo(segment.from[0], segment.from[1])
        ctx.lineTo(segment.to[0], segment.to[1])
      }
      ctx.stroke()
      ctx.restore()
    } else if (command.type === 'strokeSvgPath') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.strokeStyle = command.strokeStyle
      ctx.lineWidth = command.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      if (command.scaleX !== undefined || command.scaleY !== undefined) {
        ctx.scale(command.scaleX ?? 1, command.scaleY ?? 1)
      }
      ctx.stroke(new Path2D(command.path))
      ctx.restore()
    } else if (command.type === 'fillPath') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.fillStyle = command.fillStyle
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      ctx.beginPath()
      const firstSegment = command.segmentList[0]
      if (firstSegment) {
        ctx.moveTo(firstSegment.from[0], firstSegment.from[1])
      }
      for (let j = 0; j < command.segmentList.length; j++) {
        const segment = command.segmentList[j]
        ctx.lineTo(segment.to[0], segment.to[1])
      }
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    } else if (command.type === 'strokeCircle') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.strokeStyle = command.strokeStyle
      ctx.lineWidth = command.lineWidth
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      ctx.beginPath()
      ctx.arc(command.x, command.y, command.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    } else if (command.type === 'fillCircle') {
      ctx.save()
      ctx.globalAlpha = command.alpha ?? 1
      ctx.fillStyle = command.fillStyle
      if (command.translateX !== undefined || command.translateY !== undefined) {
        ctx.translate(command.translateX ?? 0, command.translateY ?? 0)
      }
      ctx.beginPath()
      ctx.arc(command.x, command.y, command.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else if (command.type === 'pushClipRect') {
      ctx.save()
      ctx.beginPath()
      ctx.rect(
        command.rect.x,
        command.rect.y,
        command.rect.width,
        command.rect.height
      )
      ctx.clip()
    } else if (command.type === 'popState') {
      ctx.restore()
    }
  }

  return canvas.transferToImageBitmap()
}

/** 发送 worker 响应；这里不依赖 tsconfig WebWorker lib。 */
function postWorkerMessage(message: unknown, transfer?: Transferable[]) {
  const workerGlobal = globalThis as unknown as {
    /** 发送 Message 对应的消息。 */
    postMessage(message: unknown, transfer?: Transferable[]): void
  }
  workerGlobal.postMessage(message, transfer)
}

onmessage = evt => {
  const snapshot = evt.data as IWorkerPageRenderSnapshot
  renderSnapshot(snapshot)
    .then(bitmap => {
      const result: IWorkerRenderSuccessResult = {
        type: 'success',
        jobId: snapshot.jobId,
        pageNo: snapshot.pageNo,
        layer: snapshot.layer,
        width: snapshot.width,
        height: snapshot.height,
        dpr: snapshot.dpr,
        scale: snapshot.scale,
        layoutVersion: snapshot.layoutVersion,
        baseVisualVersion: snapshot.baseVisualVersion,
        bitmap
      }
      postWorkerMessage(result, [bitmap])
    })
    .catch(error => {
      const result: IWorkerRenderErrorResult = {
        type: 'error',
        jobId: snapshot.jobId,
        pageNo: snapshot.pageNo,
        layer: snapshot.layer,
        errorReason: error instanceof Error ? error.message : String(error)
      }
      postWorkerMessage(result)
    })
}
