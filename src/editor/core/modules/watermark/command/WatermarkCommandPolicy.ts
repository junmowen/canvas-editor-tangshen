import { defaultWatermarkOption } from '../../../../dataset/constant/Watermark'
import { IWatermark } from '../../../../interface/Watermark'

type TWatermarkOptionsHost = {
  /** 水印配置。 */
  watermark: Required<IWatermark>
}

/** 添加或更新水印配置。 */
export function applyWatermarkOptions(
  options: TWatermarkOptionsHost,
  payload: IWatermark
) {
  const { type, color, size, opacity, font, gap, width, height, numberType } =
    defaultWatermarkOption
  options.watermark.data = payload.data
  options.watermark.type = payload.type || type
  options.watermark.width = payload.width || width
  options.watermark.height = payload.height || height
  options.watermark.color = payload.color || color
  options.watermark.size = payload.size || size
  options.watermark.opacity = payload.opacity || opacity
  options.watermark.font = payload.font || font
  options.watermark.repeat = !!payload.repeat
  options.watermark.numberType = payload.numberType || numberType
  options.watermark.gap = payload.gap || gap
}

/** 删除水印配置并返回是否发生变更。 */
export function resetWatermarkOptions(options: TWatermarkOptionsHost) {
  if (!options.watermark?.data) return false
  options.watermark = { ...defaultWatermarkOption }
  return true
}
