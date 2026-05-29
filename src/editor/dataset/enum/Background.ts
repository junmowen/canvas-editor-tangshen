/** 背景图尺寸策略，决定图片按完整显示还是铺满页面。 */
export enum BackgroundSize {
  CONTAIN = 'contain',
  COVER = 'cover'
}

/** 背景图重复策略，决定图片在页面中的平铺方向。 */
export enum BackgroundRepeat {
  REPEAT = 'repeat',
  NO_REPEAT = 'no-repeat',
  REPEAT_X = 'repeat-x',
  REPEAT_Y = 'repeat-y'
}
