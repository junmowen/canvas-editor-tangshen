import { IRange } from '../../../../interface/Range'
import type { Draw } from '../../../draw/Draw'
import { resolveTableKeywordSearchRange } from '../../table/selection/resolveTableKeywordSearchRange'

/** 获取关键词在文档中的 range 列表。 */
export function getSearchKeywordRangeList(
  draw: Draw,
  keyword: string
): IRange[] {
  const searchMatchList = draw
    .getSearch()
    .getMatchList(keyword, draw.getObjectResolver().getOriginalElementList())
  const searchRangeMap: Map<string, IRange> = new Map()
  for (const searchMatch of searchMatchList) {
    const searchRange = searchRangeMap.get(searchMatch.groupId)
    if (searchRange) {
      searchRange.endIndex += 1
    } else {
      const { groupId, index } = searchMatch
      const range = resolveTableKeywordSearchRange({
        searchMatch,
        range: {
          startIndex: index,
          endIndex: index
        }
      })
      searchRangeMap.set(groupId, range)
    }
  }
  const rangeList: IRange[] = []
  searchRangeMap.forEach(searchRange => {
    rangeList.push(searchRange)
  })
  return rangeList
}
