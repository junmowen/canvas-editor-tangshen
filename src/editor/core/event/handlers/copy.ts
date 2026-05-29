import { IElement } from '../../../interface/Element'
import { ICopyOption } from '../../../interface/Event'
import { writeElementList } from '../../../utils/clipboard'
import { getTextFromElementList } from '../../../utils/element'
import { IOverrideResult } from '../../extension/override/Override'
import { resolveTableCopyElementList } from '../../modules/table/interaction/resolveTableCopyElementList'
import { CanvasEvent } from '../CanvasEvent'

/** 处理复制操作，把当前选区内容写入剪贴板。 */
export function copy(host: CanvasEvent, options?: ICopyOption) {
  const draw = host.getDraw()
  // 自定义粘贴事件
  const { copy } = draw.getOverride()
  if (copy) {
    const overrideResult = copy()
    // 默认阻止默认事件
    if ((<IOverrideResult>overrideResult)?.preventDefault !== false) return
  }
  const rangeManager = draw.getRange()
  // 光标闭合时复制整行
  let copyElementList: IElement[] | null = null
  const range = rangeManager.getEditBoundaryRange()
  if (range.isCrossRowCol) {
    copyElementList = resolveTableCopyElementList(draw)
  } else {
    copyElementList = rangeManager.getIsCollapsed()
      ? rangeManager.getRangeRowElementList()
      : rangeManager.getSelectionElementList()
  }
  if (options?.isPlainText && copyElementList?.length) {
    copyElementList = [
      {
        value: getTextFromElementList(copyElementList)
      }
    ]
  }
  if (!copyElementList?.length) return
  writeElementList(copyElementList, draw.getOptions())
}
