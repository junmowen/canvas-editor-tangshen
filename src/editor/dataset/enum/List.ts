/** 列表节点类型，区分有序列表和无序列表。 */
export enum ListType {
  UL = 'ul',
  OL = 'ol'
}

/** 无序列表标记样式，控制圆点、空心圆、方块和复选框符号。 */
export enum UlStyle {
  DISC = 'disc', // 实心圆点
  CIRCLE = 'circle', // 空心圆点
  SQUARE = 'square', // 实心方块
  CHECKBOX = 'checkbox' // 复选框
}

/** 有序列表标记样式，控制数字编号显示方式。 */
export enum OlStyle {
  DECIMAL = 'decimal' // 阿拉伯数字
}

/** 列表样式集合，统一描述有序和无序列表可用的标记样式。 */
export enum ListStyle {
  DISC = UlStyle.DISC,
  CIRCLE = UlStyle.CIRCLE,
  SQUARE = UlStyle.SQUARE,
  DECIMAL = OlStyle.DECIMAL,
  CHECKBOX = UlStyle.CHECKBOX
}
