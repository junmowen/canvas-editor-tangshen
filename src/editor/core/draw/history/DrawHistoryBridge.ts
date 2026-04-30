import { deepClone } from '../../../utils'
import { getSlimCloneElementList } from '../../../utils/element'
import type { Draw } from '../Draw'

/**
 * Draw 历史桥接服务。
 *
 * 负责把当前编辑现场打包成可回放快照，并在 undo / redo 时恢复：
 * - zone
 * - pageNo
 * - positionContext
 * - header/footer/main 数据
 * - range
 *
 * 这是 `HistoryManager` 与 `Draw` 运行现场之间的桥接层。
 */
export class DrawHistoryBridge {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  public submitHistory(curIndex: number | undefined) {
    const components = this.draw.getComponents()
    const positionContext = components.position.getPositionContext()
    const oldElementList = getSlimCloneElementList(
      this.draw.getOriginalMainElementList()
    )
    const oldHeaderElementList = getSlimCloneElementList(
      components.header.getElementList()
    )
    const oldFooterElementList = getSlimCloneElementList(
      components.footer.getElementList()
    )
    const oldRange = deepClone(components.range.getEditBoundaryRange())
    const pageNo = this.draw.getPageNo()
    const oldPositionContext = deepClone(positionContext)
    const zone = components.zone.getZone()

    components.historyManager.execute(() => {
      components.zone.setZone(zone)
      this.draw.setPageNo(pageNo)
      components.position.setPositionContext(deepClone(oldPositionContext))
      components.header.setElementList(deepClone(oldHeaderElementList))
      components.footer.setElementList(deepClone(oldFooterElementList))
      this.draw.replaceMainElementList(deepClone(oldElementList))
      components.range.replaceRange(deepClone(oldRange))
      this.draw.render({
        curIndex,
        isSubmitHistory: false,
        isSourceHistory: true
      })
    })
  }
}
