import { isOoxmlElement } from './OoxmlDom'
import { TrackChangeType } from '../../../interface/Element'

export type TOoxmlTrackChangeChildKind =
  | 'run'
  | 'hyperlink'
  | 'sdt'
  | 'math'
  | 'mathParagraph'
  | 'skip'

export type TOoxmlRunChildKind =
  | 'runProperties'
  | 'text'
  | 'tab'
  | 'break'
  | 'drawing'
  | 'skip'

export type TOoxmlParagraphChildKind =
  | 'paragraphProperties'
  | 'run'
  | 'trackChange'
  | 'hyperlink'
  | 'sdt'
  | 'math'
  | 'mathParagraph'
  | 'skip'

export type TOoxmlBlockChildKind =
  | 'paragraph'
  | 'table'
  | 'mathParagraph'
  | 'skip'

export function resolveOoxmlTrackChangeChildKind(
  childElement: Element
): TOoxmlTrackChangeChildKind {
  if (isOoxmlElement(childElement, 'r')) return 'run'
  if (isOoxmlElement(childElement, 'hyperlink')) return 'hyperlink'
  if (isOoxmlElement(childElement, 'sdt')) return 'sdt'
  if (isOoxmlElement(childElement, 'oMath')) return 'math'
  if (isOoxmlElement(childElement, 'oMathPara')) return 'mathParagraph'
  return 'skip'
}

export function resolveOoxmlRunChildKind(
  childElement: Element
): TOoxmlRunChildKind {
  if (isOoxmlElement(childElement, 'rPr')) return 'runProperties'
  if (
    isOoxmlElement(childElement, 't') ||
    isOoxmlElement(childElement, 'delText')
  ) {
    return 'text'
  }
  if (isOoxmlElement(childElement, 'tab')) return 'tab'
  if (isOoxmlElement(childElement, 'br')) return 'break'
  if (isOoxmlElement(childElement, 'drawing')) return 'drawing'
  return 'skip'
}

export function resolveOoxmlParagraphChildKind(
  childElement: Element
): TOoxmlParagraphChildKind {
  if (isOoxmlElement(childElement, 'pPr')) return 'paragraphProperties'
  if (isOoxmlElement(childElement, 'r')) return 'run'
  if (isOoxmlElement(childElement, 'ins') || isOoxmlElement(childElement, 'del')) {
    return 'trackChange'
  }
  if (isOoxmlElement(childElement, 'hyperlink')) return 'hyperlink'
  if (isOoxmlElement(childElement, 'sdt')) return 'sdt'
  if (isOoxmlElement(childElement, 'oMath')) return 'math'
  if (isOoxmlElement(childElement, 'oMathPara')) return 'mathParagraph'
  return 'skip'
}

export function resolveOoxmlBlockChildKind(
  childElement: Element
): TOoxmlBlockChildKind {
  if (isOoxmlElement(childElement, 'p')) return 'paragraph'
  if (isOoxmlElement(childElement, 'tbl')) return 'table'
  if (isOoxmlElement(childElement, 'oMathPara')) return 'mathParagraph'
  return 'skip'
}

/** 判断 br 是否为分页符。 */
export function isOoxmlPageBreakElement(element: Element) {
  return element.getAttribute('w:type') === 'page'
}

/** 从 OOXML 修订容器推导内部修订类型。 */
export function resolveOoxmlTrackChangeType(
  changeElement: Element
): TrackChangeType {
  return isOoxmlElement(changeElement, 'del') ? 'delete' : 'insert'
}

/** 把 OOXML 修订日期还原为内部时间戳，非法或缺失时使用稳定兜底值。 */
export function importOoxmlTrackChangeTimestamp(
  value: string | null | undefined
) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}
