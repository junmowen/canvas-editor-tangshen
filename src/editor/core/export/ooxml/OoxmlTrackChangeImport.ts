import { IElement, ITrackChange, TrackChangeType } from '../../../interface/Element'
import { getOoxmlAttribute } from './OoxmlDom'
import {
  importOoxmlTrackChangeTimestamp
} from './OoxmlDocumentImportAdapter'

/** 解析 w:ins/w:del 的修订元信息，保留可用的 id、作者和日期字段。 */
export function parseOoxmlTrackChange(
  changeElement: Element | undefined,
  type: TrackChangeType
): ITrackChange {
  return {
    id: getOoxmlAttribute(changeElement, 'id') || `ooxml-${type}`,
    type,
    ...(getOoxmlAttribute(changeElement, 'author')
      ? { author: getOoxmlAttribute(changeElement, 'author')! }
      : {}),
    timestamp: importOoxmlTrackChangeTimestamp(
      getOoxmlAttribute(changeElement, 'date')
    )
  }
}

/** 把当前修订上下文挂到可见元素上，避免段落属性覆盖时丢失修订信息。 */
export function applyOoxmlTrackChangeImport(
  element: IElement,
  trackChange: ITrackChange | undefined
) {
  return trackChange
    ? {
        ...element,
        trackChange: { ...trackChange }
      }
    : element
}
