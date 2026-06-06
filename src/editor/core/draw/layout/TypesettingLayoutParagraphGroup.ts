import { TypesettingParagraphBlockType } from '../../../interface/TypesettingLayout'
import { ITypesettingParagraphBlockSegment } from './TypesettingLayoutParagraphSegment'

/** 内部段落块分组，保存同一块内的连续行内片段。 */
export interface ITypesettingParagraphBlockGroup {
  /** 段落块类型，用于后续分页规则选择处理路径。 */
  type: TypesettingParagraphBlockType
  /** 段落块分组键，用于判断相邻片段是否属于同一段落块。 */
  key: string
  /** 段落块中的行内片段列表。 */
  segmentList: ITypesettingParagraphBlockSegment[]
  /** 段落块左边界。 */
  left: number
  /** 段落块上边界。 */
  top: number
  /** 段落块右边界。 */
  right: number
  /** 段落块下边界。 */
  bottom: number
}

/** 把行内片段追加到段落块分组，连续普通段落自动换行沿用上一块。 */
export function appendTypesettingParagraphSegment(
  groupList: ITypesettingParagraphBlockGroup[],
  segment: ITypesettingParagraphBlockSegment
) {
  const previous = groupList[groupList.length - 1]
  const blockKey = resolveSegmentBlockKey(segment, previous)
  if (previous && previous.key === blockKey) {
    previous.segmentList.push(segment)
    previous.left = Math.min(previous.left, segment.left)
    previous.top = Math.min(previous.top, segment.top)
    previous.right = Math.max(previous.right, segment.right)
    previous.bottom = Math.max(previous.bottom, segment.bottom)
    return
  }
  groupList.push({
    type: segment.type,
    key: blockKey,
    segmentList: [segment],
    left: segment.left,
    top: segment.top,
    right: segment.right,
    bottom: segment.bottom
  })
}

/** 普通段落没有稳定 id，连续换行后的片段要显式开新块，自动换行则沿用上一块。 */
function resolveSegmentBlockKey(
  segment: ITypesettingParagraphBlockSegment,
  previous?: ITypesettingParagraphBlockGroup
) {
  if (segment.type !== 'paragraph') {
    return segment.semanticKey
  }
  if (previous?.type === 'paragraph' && !segment.isParagraphStart) {
    return previous.key
  }
  return `paragraph:${segment.row.startIndex + segment.startElementOffset}`
}
