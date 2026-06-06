import { deepClone } from '../../../utils'
import { getSlimCloneElementList } from '../../../utils/elementText'
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

  /** 输入态历史提交计时器，用于合并连续字符输入。 */
  private typingHistoryTimer: number | null = null

  /** 最近一次输入态历史提交的光标位置。 */
  private pendingTypingCurIndex: number | undefined

  /** 输入停止多久后提交历史快照。 */
  private readonly typingHistoryDelay = 350

  public submitHistory(curIndex: number | undefined) {
    if (this.draw.getHistoryManager().isDisabledHistory()) return
    this.cancelTypingHistory()
    this.commitHistory(curIndex)
  }

  /** 输入态历史提交，连续输入只保留最后一次全量快照。 */
  public submitTypingHistory(curIndex: number | undefined) {
    if (this.draw.getHistoryManager().isDisabledHistory()) return
    this.pendingTypingCurIndex = curIndex
    if (this.typingHistoryTimer !== null) {
      window.clearTimeout(this.typingHistoryTimer)
    }
    this.typingHistoryTimer = window.setTimeout(() => {
      const nextCurIndex = this.pendingTypingCurIndex
      this.typingHistoryTimer = null
      this.pendingTypingCurIndex = undefined
      this.commitHistory(nextCurIndex)
    }, this.typingHistoryDelay)
  }

  /** 取消待提交的输入态历史。 */
  public cancelTypingHistory() {
    if (this.typingHistoryTimer !== null) {
      window.clearTimeout(this.typingHistoryTimer)
      this.typingHistoryTimer = null
    }
    this.pendingTypingCurIndex = undefined
  }

  /** 立即提交一次完整历史快照。 */
  private commitHistory(curIndex: number | undefined) {
    if (this.draw.getHistoryManager().isDisabledHistory()) return
    const components = this.draw.getComponents()
    const positionContext = this.draw.getCoordinate().getPositionContext()
    const { headerPageScopes, main, footerPageScopes } = this.draw
      .getObjectResolver()
      .getOriginalEditorData()
    const oldElementList = getSlimCloneElementList(main)
    const oldHeaderPageScopes = deepClone(headerPageScopes || [])
    const oldFooterPageScopes = deepClone(footerPageScopes || [])
    const oldRange = deepClone(components.range.getEditBoundaryRange())
    const pageNo = this.draw.getPageNo()
    const oldPositionContext = deepClone(positionContext)
    const zone = components.zone.getZone()

    components.historyManager.execute(() => {
      components.zone.setZone(zone)
      this.draw.setPageNo(pageNo)
      this.draw.getCoordinate().setPositionContext(deepClone(oldPositionContext))
      components.header.setPageScopes(deepClone(oldHeaderPageScopes))
      components.footer.setPageScopes(deepClone(oldFooterPageScopes))
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
