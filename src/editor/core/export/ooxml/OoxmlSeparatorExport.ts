import { defaultSeparatorOption } from '../../../dataset/constant/Separator'
import { ElementType } from '../../../dataset/enum/Element'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { normalizeOoxmlHexColor } from './OoxmlUnit'

/** 分隔线导出上下文，承载全局 separator 默认样式。 */
export type TOoxmlSeparatorExportOptions = Pick<IEditorOption, 'separator'>

/** 判断当前元素是否为 OOXML 可导出的分隔线。 */
export function isOoxmlSeparatorElement(element: IElement | undefined) {
  return element?.type === ElementType.SEPARATOR
}

/** 把分隔线 dashArray 映射为 Word 段落边框线型。 */
function getOoxmlSeparatorBorderValue(dashArray: number[] | undefined) {
  if (!dashArray?.length || dashArray.every(value => value === 0)) {
    return 'single'
  }
  const dashKey = dashArray.join(',')
  // 常用菜单线型按 Word 原生边框值映射，保证 DOCX 中能稳定显示。
  if (dashKey === '1,1') {
    return 'dotted'
  }
  if (dashKey === '7,3,3,3') {
    return 'dotDash'
  }
  if (dashKey === '6,2,2,2,2,2') {
    return 'dotDotDash'
  }
  return 'dashed'
}

/** 把 Canvas 分隔线宽度换算为 Word 边框 w:sz 使用的 eighth-point。 */
function convertSeparatorLineWidthToOoxmlSize(lineWidth: number | undefined) {
  return Math.max(1, Math.round((lineWidth || 1) * 8))
}

/** 生成分隔线对应的段落底边框，作为 Word 中可见且稳定的横线结构。 */
export function createOoxmlSeparatorParagraphBorder(
  element: IElement | undefined,
  options?: TOoxmlSeparatorExportOptions
) {
  if (!element || !isOoxmlSeparatorElement(element)) return ''
  const separatorOption = {
    ...defaultSeparatorOption,
    ...options?.separator
  }
  const value = getOoxmlSeparatorBorderValue(element.dashArray)
  const color = normalizeOoxmlHexColor(element.color || separatorOption.strokeStyle)
  const size = convertSeparatorLineWidthToOoxmlSize(separatorOption.lineWidth)
  return `<w:pBdr><w:bottom w:val="${value}" w:sz="${size}" w:space="1" w:color="${color}"/></w:pBdr>`
}
