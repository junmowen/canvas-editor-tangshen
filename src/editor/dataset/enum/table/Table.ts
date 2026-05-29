/** 表格边框应用范围，控制全边框、外边框、内边框或虚线边框。 */
export enum TableBorder {
  ALL = 'all',
  EMPTY = 'empty',
  EXTERNAL = 'external',
  INTERNAL = 'internal',
  DASH = 'dash'
}

/** 表格显示方式，决定表格作为块级或行内内容参与排版。 */
export enum TableDisplay {
  BLOCK = 'block',
  INLINE = 'inline'
}

/** 单元格边框边位，定位需要修改的上、右、下、左边框。 */
export enum TdBorder {
  TOP = 'top',
  RIGHT = 'right',
  BOTTOM = 'bottom',
  LEFT = 'left'
}

/** 单元格斜线方向，控制表头斜线从哪一侧起笔。 */
export enum TdSlash {
  FORWARD = 'forward', // 正斜线 /
  BACK = 'back' // 反斜线 \
}
