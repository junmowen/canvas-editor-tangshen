/** 最大高度比例，限制页眉、页脚等区域可占用的页面高度。 */
export enum MaxHeightRatio {
  HALF = 'half',
  ONE_THIRD = 'one-third',
  QUARTER = 'quarter'
}

/** 数字展示格式，用于在阿拉伯数字和中文数字之间切换。 */
export enum NumberType {
  ARABIC = 'arabic',
  CHINESE = 'chinese'
}

/** 图片排版方式，控制图片以内联、块级、环绕或浮动方式参与布局。 */
export enum ImageDisplay {
  INLINE = 'inline',
  BLOCK = 'block',
  SURROUND = 'surround',
  TIGHT = 'tight',
  FLOAT_TOP = 'float-top',
  FLOAT_BOTTOM = 'float-bottom'
}

/** 插入定位方式，描述目标元素内外及前后位置。 */
export enum LocationPosition {
  BEFORE = 'before',
  AFTER = 'after',
  OUTER_BEFORE = 'outer-before',
  OUTER_AFTER = 'outer-after'
}

/** 弹性布局方向，用于控制控件选项横向或纵向排列。 */
export enum FlexDirection {
  ROW = 'row',
  COLUMN = 'column'
}
