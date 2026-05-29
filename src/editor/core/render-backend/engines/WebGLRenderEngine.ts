import type { IRenderBackend } from '../types/RenderBackend'
import type { IRenderSurface } from '../types/RenderSurface'
import type { IRenderTask } from '../types/RenderTask'

/** webgl渲染engine选项契约，用于约束内部流程中传递的数据结构。 */
export interface IWebGLRenderEngineOptions {
  /** 是否启用 WebGL 任务处理，默认关闭以避免影响正文 Canvas2D 渲染。 */
  enabled?: boolean
  /** 是否允许 WebGL 接管独立图片任务。 */
  imageTask?: boolean
  /** 测试 / 灰度熔断开关：模拟 context lost，任务应自动回退 Canvas2D。 */
  forceContextLost?: boolean
  /** 图片纹理缓存上限，默认保留 32 张纹理。 */
  maxTextureCacheSize?: number
  /** 图片纹理缓存估算显存上限，默认 128MB。 */
  maxTextureCacheBytes?: number
}

/** webgltexture缓存item契约，用于约束内部流程中传递的数据结构。 */
interface IWebGLTextureCacheItem {
  /** WebGL 纹理对象，用于缓存位图上传结果。 */
  texture: WebGLTexture
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 估算字节数，用于衡量缓存或纹理占用。 */
  estimatedBytes: number
  /** 最近使用序号，用于缓存淘汰策略判断冷热。 */
  lastUsedSeq: number
}

/**
 * WebGL 图片渲染引擎。
 *
 * 只接独立图片任务，用于图片纹理复用、滤镜和降采样输出；
 * 默认关闭，避免 WebGL 上下文影响正文 Canvas2D 主链路。
 */
export class WebGLRenderEngine implements IRenderBackend {
  /** 渲染引擎名称，用于后端调度统计。 */
  public readonly name = 'webgl'
  /** 当前浏览器是否具备 WebGL 基础能力。 */
  public readonly supported: boolean
  /** 当前引擎配置，保留引用以支持运行时灰度开关。 */
  private readonly options: IWebGLRenderEngineOptions
  /** 复用的 WebGL 探测 / 任务上下文。 */
  private readonly canvas: HTMLCanvasElement | null
  /** 只读WebGL 上下文，用于执行纹理上传和 GPU 绘制。 */
  private readonly gl: WebGLRenderingContext | null
  private contextLost = false
  /** 复用的图片处理 shader 程序和顶点 buffer。 */
  private program: WebGLProgram | null = null
  private positionBuffer: WebGLBuffer | null = null
  private texCoordBuffer: WebGLBuffer | null = null
  /** 图片纹理 LRU 缓存。 */
  private readonly textureCache = new Map<string, IWebGLTextureCacheItem>()
  private textureUseSeq = 0
  private textureUploadCount = 0
  private textureReuseCount = 0
  private textureEvictCount = 0
  private textureBudgetEvictCount = 0
  private filterApplyCount = 0
  private downsampleRenderCount = 0
  private cropRenderCount = 0
  private rotationRenderCount = 0
  private originalSourcePixels = 0
  private outputPixels = 0
  private savedUploadPixels = 0

  /**
   * 创建 WebGL 渲染引擎。
   *
   * @param options - 引擎启用配置
   */
  constructor(options: IWebGLRenderEngineOptions = {}) {
    this.options = options
    const context = this.createContext()
    this.canvas = context.canvas
    this.gl = context.gl
    this.supported = Boolean(this.gl)
    this.canvas?.addEventListener('webglcontextlost', evt => {
      evt.preventDefault()
      this.contextLost = true
      this.releaseCachedResources()
    })
    this.canvas?.addEventListener('webglcontextrestored', () => {
      this.contextLost = false
    })
  }

  /**
   * 判断任务是否适合由 WebGL 引擎处理。
   *
   * 仅匹配独立 `image-webgl` 任务，不抢占正文 base / overlay。
   *
   * @returns 当前任务可由 WebGL 图片管线处理时返回 true
   */
  public canRender(task: IRenderTask): boolean {
    return (
      Boolean(this.options.enabled) &&
      this.options.imageTask !== false &&
      this.supported &&
      !this.isContextUnavailable() &&
      task.reason === 'image-webgl' &&
      (Boolean(task.webglImage) || Boolean(task.execute))
    )
  }

  /**
   * 执行 WebGL 渲染任务。
   *
   * 图片任务走 WebGL shader，其他兼容任务回退到 execute。
   *
   * @param _surface - 目标渲染 surface
   * @param _task - 渲染任务描述
   */
  public render(surface: IRenderSurface, task: IRenderTask) {
    if (!this.gl || this.isContextUnavailable()) {
      throw new Error('WebGL image task context unavailable')
    }
    if (task.webglImage) {
      this.renderImageTask(surface, task.webglImage)
      return
    }
    task.execute?.(surface, task)
  }

  /** 获取 WebGL 引擎能力状态。 */
  public getCapability() {
    const textureCacheBytes = this.getTextureCacheBytes()
    const maxTextureCacheBytes =
      this.options.maxTextureCacheBytes ?? 128 * 1024 * 1024
    return {
      supported: this.supported,
      enabled:
        Boolean(this.options.enabled) &&
        this.options.imageTask !== false &&
        !this.isContextUnavailable(),
      textureCacheSize: this.textureCache.size,
      maxTextureCacheSize: this.options.maxTextureCacheSize ?? 32,
      textureCacheBytes,
      textureCacheMB: this.toMB(textureCacheBytes),
      maxTextureCacheBytes,
      maxTextureCacheMB: this.toMB(maxTextureCacheBytes),
      textureUploadCount: this.textureUploadCount,
      textureReuseCount: this.textureReuseCount,
      textureEvictCount: this.textureEvictCount,
      textureBudgetEvictCount: this.textureBudgetEvictCount,
      filterApplyCount: this.filterApplyCount,
      downsampleRenderCount: this.downsampleRenderCount,
      cropRenderCount: this.cropRenderCount,
      rotationRenderCount: this.rotationRenderCount,
      originalSourcePixels: this.originalSourcePixels,
      outputPixels: this.outputPixels,
      savedUploadPixels: this.savedUploadPixels,
      estimatedDownsampleSavedPixels: Math.max(
        0,
        this.originalSourcePixels - this.outputPixels
      )
    }
  }

  /** 判断 WebGL 上下文是否已不可用。 */
  private isContextUnavailable(): boolean {
    return Boolean(this.options.forceContextLost) || this.contextLost
  }

  /** 探测当前环境是否支持 WebGL 上下文。 */
  private createContext(): {
    /** Canvas 画布实例，承载当前渲染输出。 */
    canvas: HTMLCanvasElement | null
    /** WebGL 上下文，用于执行纹理上传和 GPU 绘制。 */
    gl: WebGLRenderingContext | null
  } {
    if (typeof document === 'undefined') {
      return {
        canvas: null,
        gl: null
      }
    }
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    return {
      canvas,
      gl
    }
  }

  /** 使用最小纹理管线把图片绘制到目标 2D surface。 */
  private renderImageTask(
    surface: IRenderSurface,
    imageTask: NonNullable<IRenderTask['webglImage']>
  ) {
    const gl = this.gl!
    const outputWidth = Math.max(1, Math.ceil(imageTask.width * surface.dpr))
    const outputHeight = Math.max(1, Math.ceil(imageTask.height * surface.dpr))
    if (this.canvas) {
      this.canvas.width = outputWidth
      this.canvas.height = outputHeight
    }
    gl.viewport(0, 0, outputWidth, outputHeight)
    const program = this.getImageProgram(gl)
    const positionBuffer = this.getPositionBuffer(gl)
    const texCoordBuffer = this.getTexCoordBuffer(gl)
    const texture = this.getImageTexture(gl, imageTask)
    gl.useProgram(program)
    this.applyImageUniforms(gl, program, imageTask)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer)
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord')
    gl.enableVertexAttribArray(texCoordLocation)
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    surface.ctx2d.clearRect(0, 0, imageTask.width, imageTask.height)
    surface.ctx2d.drawImage(this.canvas!, 0, 0, imageTask.width, imageTask.height)
    if (this.hasFilter(imageTask)) {
      this.filterApplyCount++
    }
    if (this.isDownsampleRender(imageTask)) {
      this.downsampleRenderCount++
    }
    if (this.hasCrop(imageTask)) {
      this.cropRenderCount++
    }
    if (this.hasRotation(imageTask)) {
      this.rotationRenderCount++
    }
    this.recordImageBenefit(imageTask, outputWidth, outputHeight)
    this.pruneTextureCache(gl)
  }

  /** 写入图片 shader 参数。 */
  private applyImageUniforms(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    imageTask: NonNullable<IRenderTask['webglImage']>
  ) {
    const filter = imageTask.filter || {}
    const grayscale = this.clampUniform(filter.grayscale ?? 0, 0, 1)
    const brightness = Math.max(0, filter.brightness ?? 1)
    const contrast = Math.max(0, filter.contrast ?? 1)
    const crop = this.getNormalizedCrop(imageTask)
    gl.activeTexture(gl.TEXTURE0)
    gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0)
    gl.uniform1f(gl.getUniformLocation(program, 'u_grayscale'), grayscale)
    gl.uniform1f(gl.getUniformLocation(program, 'u_brightness'), brightness)
    gl.uniform1f(gl.getUniformLocation(program, 'u_contrast'), contrast)
    gl.uniform4f(
      gl.getUniformLocation(program, 'u_crop'),
      crop.x,
      crop.y,
      crop.width,
      crop.height
    )
    gl.uniform1f(
      gl.getUniformLocation(program, 'u_rotation'),
      this.getRotationRadians(imageTask)
    )
  }

  /** 限制 uniform 数值，避免异常数据进入 shader。 */
  private clampUniform(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
  }

  /** 判断任务是否包含有效滤镜。 */
  private hasFilter(imageTask: NonNullable<IRenderTask['webglImage']>): boolean {
    const filter = imageTask.filter
    if (!filter) return false
    return (
      (filter.grayscale ?? 0) !== 0 ||
      (filter.brightness ?? 1) !== 1 ||
      (filter.contrast ?? 1) !== 1
    )
  }

  /** 判断任务是否包含有效裁剪。 */
  private hasCrop(imageTask: NonNullable<IRenderTask['webglImage']>): boolean {
    const crop = imageTask.crop
    if (!crop) return false
    const sourceWidth = this.getTextureSourceWidth(imageTask.source)
    const sourceHeight = this.getTextureSourceHeight(imageTask.source)
    return (
      crop.x > 0 ||
      crop.y > 0 ||
      crop.width < sourceWidth ||
      crop.height < sourceHeight
    )
  }

  /** 判断任务是否包含有效旋转。 */
  private hasRotation(imageTask: NonNullable<IRenderTask['webglImage']>): boolean {
    return this.normalizeRotation(imageTask.rotation) !== 0
  }

  /** 将裁剪区域归一化为纹理坐标。 */
  private getNormalizedCrop(
    imageTask: NonNullable<IRenderTask['webglImage']>
  ): { x: number; y: number; width: number; height: number } {
    const sourceWidth = Math.max(1, this.getTextureSourceWidth(imageTask.source))
    const sourceHeight = Math.max(1, this.getTextureSourceHeight(imageTask.source))
    const crop = imageTask.crop
    if (!crop) {
      return {
        x: 0,
        y: 0,
        width: 1,
        height: 1
      }
    }
    const x = this.clampUniform(crop.x, 0, Math.max(0, sourceWidth - 1))
    const y = this.clampUniform(crop.y, 0, Math.max(0, sourceHeight - 1))
    const width = this.clampUniform(crop.width, 1, sourceWidth - x)
    const height = this.clampUniform(crop.height, 1, sourceHeight - y)
    return {
      x: x / sourceWidth,
      y: y / sourceHeight,
      width: width / sourceWidth,
      height: height / sourceHeight
    }
  }

  /** 获取 Canvas2D 坐标系一致的旋转弧度。 */
  private getRotationRadians(
    imageTask: NonNullable<IRenderTask['webglImage']>
  ): number {
    return (this.normalizeRotation(imageTask.rotation) * Math.PI) / 180
  }

  /** 归一化旋转角度，避免无意义的大数进入 shader。 */
  private normalizeRotation(rotation = 0): number {
    const normalized = rotation % 360
    return normalized < 0 ? normalized + 360 : normalized
  }

  /** 判断当前输出是否为降采样渲染。 */
  private isDownsampleRender(
    imageTask: NonNullable<IRenderTask['webglImage']>
  ): boolean {
    if (imageTask.downsample) return true
    const sourceWidth = this.getTextureSourceWidth(imageTask.source)
    const sourceHeight = this.getTextureSourceHeight(imageTask.source)
    return sourceWidth > imageTask.width || sourceHeight > imageTask.height
  }

  /** 获取并复用图片处理 shader 程序。 */
  private getImageProgram(gl: WebGLRenderingContext): WebGLProgram {
    if (!this.program) {
      this.program = this.createImageProgram(gl)
    }
    return this.program
  }

  /** 获取并复用顶点位置 buffer。 */
  private getPositionBuffer(gl: WebGLRenderingContext): WebGLBuffer {
    if (!this.positionBuffer) {
      const buffer = gl.createBuffer()
      if (!buffer) {
        throw new Error('WebGL image task position buffer allocation failed')
      }
      this.positionBuffer = buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      )
    }
    return this.positionBuffer
  }

  /** 获取并复用纹理坐标 buffer。 */
  private getTexCoordBuffer(gl: WebGLRenderingContext): WebGLBuffer {
    if (!this.texCoordBuffer) {
      const buffer = gl.createBuffer()
      if (!buffer) {
        throw new Error('WebGL image task texCoord buffer allocation failed')
      }
      this.texCoordBuffer = buffer
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0]),
        gl.STATIC_DRAW
      )
    }
    return this.texCoordBuffer
  }

  /** 获取图片纹理，优先复用同源同尺寸缓存。 */
  private getImageTexture(
    gl: WebGLRenderingContext,
    imageTask: NonNullable<IRenderTask['webglImage']>
  ): WebGLTexture {
    const cacheKey = this.getTextureCacheKey(imageTask)
    const width = this.getTextureSourceWidth(imageTask.source)
    const height = this.getTextureSourceHeight(imageTask.source)
    const cached = this.textureCache.get(cacheKey)
    if (cached && cached.width === width && cached.height === height) {
      cached.lastUsedSeq = ++this.textureUseSeq
      this.textureReuseCount++
      this.savedUploadPixels += width * height
      return cached.texture
    }
    if (cached) {
      gl.deleteTexture(cached.texture)
      this.textureCache.delete(cacheKey)
      this.textureEvictCount++
    }
    const texture = gl.createTexture()
    if (!texture) {
      throw new Error('WebGL image task texture allocation failed')
    }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imageTask.source
    )
    this.textureCache.set(cacheKey, {
      texture,
      width,
      height,
      estimatedBytes: width * height * 4,
      lastUsedSeq: ++this.textureUseSeq
    })
    this.textureUploadCount++
    return texture
  }

  /** 生成纹理缓存键。 */
  private getTextureCacheKey(
    imageTask: NonNullable<IRenderTask['webglImage']>
  ): string {
    return imageTask.cacheKey || `${imageTask.width}x${imageTask.height}`
  }

  /** 获取纹理源固有宽度。 */
  private getTextureSourceWidth(source: TexImageSource): number {
    return (
      ('naturalWidth' in source && source.naturalWidth) ||
      ('videoWidth' in source && source.videoWidth) ||
      ('width' in source && source.width) ||
      0
    )
  }

  /** 获取纹理源固有高度。 */
  private getTextureSourceHeight(source: TexImageSource): number {
    return (
      ('naturalHeight' in source && source.naturalHeight) ||
      ('videoHeight' in source && source.videoHeight) ||
      ('height' in source && source.height) ||
      0
    )
  }

  /** 按 LRU 上限淘汰图片纹理缓存。 */
  private pruneTextureCache(gl: WebGLRenderingContext) {
    const maxSize = Math.max(0, this.options.maxTextureCacheSize ?? 32)
    const maxBytes = Math.max(
      0,
      this.options.maxTextureCacheBytes ?? 128 * 1024 * 1024
    )
    while (this.textureCache.size > maxSize || this.getTextureCacheBytes() > maxBytes) {
      let oldestKey = ''
      let oldestSeq = Number.POSITIVE_INFINITY
      this.textureCache.forEach((item, key) => {
        if (item.lastUsedSeq < oldestSeq) {
          oldestKey = key
          oldestSeq = item.lastUsedSeq
        }
      })
      const oldest = this.textureCache.get(oldestKey)
      if (!oldest) break
      const isOverByteBudget = this.getTextureCacheBytes() > maxBytes
      gl.deleteTexture(oldest.texture)
      this.textureCache.delete(oldestKey)
      this.textureEvictCount++
      if (isOverByteBudget) {
        this.textureBudgetEvictCount++
      }
    }
  }

  /** 记录图片任务输入输出像素，用于量化高分辨率图片降采样收益。 */
  private recordImageBenefit(
    imageTask: NonNullable<IRenderTask['webglImage']>,
    outputWidth: number,
    outputHeight: number
  ) {
    const sourceWidth = this.getTextureSourceWidth(imageTask.source)
    const sourceHeight = this.getTextureSourceHeight(imageTask.source)
    this.originalSourcePixels += sourceWidth * sourceHeight
    this.outputPixels += outputWidth * outputHeight
  }

  /** 估算当前 WebGL 纹理缓存占用。 */
  private getTextureCacheBytes(): number {
    return Array.from(this.textureCache.values()).reduce((total, item) => {
      return total + item.estimatedBytes
    }, 0)
  }

  /** 将字节数转换为 MB，保留两位小数。 */
  private toMB(bytes: number): number {
    return Math.round((bytes / 1024 / 1024) * 100) / 100
  }

  /** 释放 WebGL 上下文关联的缓存资源。 */
  private releaseCachedResources() {
    if (!this.gl) return
    this.textureCache.forEach(item => {
      this.gl!.deleteTexture(item.texture)
    })
    this.textureCache.clear()
    if (this.positionBuffer) {
      this.gl.deleteBuffer(this.positionBuffer)
      this.positionBuffer = null
    }
    if (this.texCoordBuffer) {
      this.gl.deleteBuffer(this.texCoordBuffer)
      this.texCoordBuffer = null
    }
    if (this.program) {
      this.gl.deleteProgram(this.program)
      this.program = null
    }
  }

  /** 创建图片处理 shader 程序。 */
  private createImageProgram(gl: WebGLRenderingContext): WebGLProgram {
    const vertexShader = this.createShader(
      gl,
      gl.VERTEX_SHADER,
      `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
          gl_Position = vec4(a_position, 0.0, 1.0);
          v_texCoord = a_texCoord;
        }
      `
    )
    const fragmentShader = this.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform sampler2D u_image;
        uniform float u_grayscale;
        uniform float u_brightness;
        uniform float u_contrast;
        uniform vec4 u_crop;
        uniform float u_rotation;
        void main() {
          vec2 centered = v_texCoord - vec2(0.5, 0.5);
          float angle = -u_rotation;
          float cosValue = cos(angle);
          float sinValue = sin(angle);
          vec2 rotated = vec2(
            centered.x * cosValue - centered.y * sinValue,
            centered.x * sinValue + centered.y * cosValue
          ) + vec2(0.5, 0.5);
          if (
            rotated.x < 0.0 ||
            rotated.x > 1.0 ||
            rotated.y < 0.0 ||
            rotated.y > 1.0
          ) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
          }
          vec2 cropCoord = u_crop.xy + rotated * u_crop.zw;
          vec4 color = texture2D(u_image, cropCoord);
          float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          vec3 grayscale = vec3(luminance);
          vec3 filtered = mix(color.rgb, grayscale, u_grayscale);
          filtered = (filtered - 0.5) * u_contrast + 0.5;
          filtered = filtered * u_brightness;
          gl_FragColor = vec4(clamp(filtered, 0.0, 1.0), color.a);
        }
      `
    )
    const program = gl.createProgram()
    if (!program) {
      throw new Error('WebGL image task program allocation failed')
    }
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) || 'unknown program link error'
      gl.deleteProgram(program)
      throw new Error(message)
    }
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return program
  }

  /** 创建 shader。 */
  private createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader {
    const shader = gl.createShader(type)
    if (!shader) {
      throw new Error('WebGL image task shader allocation failed')
    }
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || 'unknown shader compile error'
      gl.deleteShader(shader)
      throw new Error(message)
    }
    return shader
  }
}
