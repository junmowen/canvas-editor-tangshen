import { ListStyle, ListType, UlStyle } from '../enum/List'

// 无序列表标记符号映射，供渲染列表项前缀使用。
export const ulStyleMapping: Record<UlStyle, string> = {
  [UlStyle.DISC]: '•',
  [UlStyle.CIRCLE]: '◦',
  [UlStyle.SQUARE]: '▫︎',
  [UlStyle.CHECKBOX]: '☑️'
}

// 列表类型到 HTML 标签名的映射，供导出 DOM 时选择 ol 或 ul。
export const listTypeElementMapping: Record<ListType, string> = {
  [ListType.OL]: 'ol',
  [ListType.UL]: 'ul'
}

// 列表样式到 CSS list-style-type 的映射，供 DOM 导出保持列表外观。
export const listStyleCSSMapping: Record<ListStyle, string> = {
  [ListStyle.DISC]: 'disc',
  [ListStyle.CIRCLE]: 'circle',
  [ListStyle.SQUARE]: 'square',
  [ListStyle.DECIMAL]: 'decimal',
  [ListStyle.CHECKBOX]: 'checkbox'
}
