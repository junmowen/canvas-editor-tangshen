import { ZERO } from '../../dataset/constant/Common'
import { titleSizeMapping } from '../../dataset/constant/Title'
import { RowFlex } from '../../dataset/enum/Row'
import { TitleLevel } from '../../dataset/enum/Title'
import { IElement, IRowIndentPayload, ITabStop } from '../../interface/Element'
import { IPageColumns } from '../../interface/PageColumns'
import { ITitleOption } from '../../interface/Title'
import { isTextLikeElement } from '../../utils/elementLayout'

type TParagraphIndentKey =
  | 'rowIndentLeft'
  | 'rowIndentRight'
  | 'rowIndent'
  | 'rowHangingIndent'

function setParagraphIndentValue(
  element: IElement,
  key: TParagraphIndentKey,
  value: number | null | undefined
) {
  if (value === undefined) return
  const nextValue = value === null ? null : Math.max(0, value)
  if (nextValue === null || nextValue === 0) {
    delete element[key]
  } else {
    element[key] = nextValue
  }
}

export function applyParagraphIndent(
  paragraphElementList: IElement[],
  payload: IRowIndentPayload
) {
  paragraphElementList.forEach(element => {
    setParagraphIndentValue(element, 'rowIndentLeft', payload.left)
    setParagraphIndentValue(element, 'rowIndentRight', payload.right)
    setParagraphIndentValue(element, 'rowIndent', payload.firstLine)
    setParagraphIndentValue(element, 'rowHangingIndent', payload.hanging)
  })
}

export function normalizeTabStops(payload: ITabStop[] | null): ITabStop[] {
  return (payload || [])
    .filter(tabStop => Number.isFinite(tabStop.position) && tabStop.position >= 0)
    .map(tabStop => ({
      position: tabStop.position,
      alignment: tabStop.alignment
    }))
    .sort((a, b) => a.position - b.position)
}

/** 应用或清除标题段落格式。 */
export function applyTitleToElementList(payload: {
  /** 需要修改的元素列表。 */
  elementList: IElement[]
  /** 标题层级；null 表示恢复正文。 */
  level: TitleLevel | null
  /** 新标题 id。 */
  titleId: string
  /** 标题字号配置。 */
  titleOptions: Required<ITitleOption>
}) {
  const { elementList, level, titleId, titleOptions } = payload
  elementList.forEach(element => {
    if (!element.type && element.value === ZERO) return
    if (level) {
      element.level = level
      element.titleId = titleId
      if (isTextLikeElement(element)) {
        element.size = titleOptions[titleSizeMapping[level]]
        element.bold = true
      }
      return
    }
    if (element.titleId) {
      delete element.titleId
      delete element.title
      delete element.level
      delete element.size
      delete element.bold
    }
  })
}

/** 应用段落水平对齐方式。 */
export function applyRowFlexToParagraphList(
  paragraphElementList: IElement[],
  rowFlex: RowFlex
) {
  paragraphElementList.forEach(element => {
    element.rowFlex = rowFlex
  })
}

/** 应用段落行间距。 */
export function applyRowMarginToParagraphList(
  paragraphElementList: IElement[],
  rowMargin: number
) {
  paragraphElementList.forEach(element => {
    element.rowMargin = rowMargin
  })
}

/** 应用或清除局部分栏配置。 */
export function applyRowColumnsToParagraphList(
  paragraphElementList: IElement[],
  columns: IPageColumns | null
) {
  paragraphElementList.forEach(element => {
    if (columns) {
      element.columns = {
        ...columns,
        widths: columns.widths ? columns.widths.slice() : undefined
      }
    } else {
      delete element.columns
    }
  })
}
