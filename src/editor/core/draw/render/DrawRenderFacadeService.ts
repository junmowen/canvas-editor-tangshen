import { IDrawOption } from '../../../interface/Draw'
import { ITableLayoutSnapshot } from '../../table/layout/TableLayoutSnapshotTypes'
import type { Draw } from '../Draw'
import { DrawRenderFinalizeService } from './DrawRenderFinalizeService'
import { DrawRenderSurfaceInvalidator } from './DrawRenderSurfaceInvalidator'
import { TableTypingRenderHelper } from './TableTypingRenderHelper'
import { TypingPatchCoordinator } from './TypingPatchCoordinator'

/** Draw 渲染门面服务，统一编排排版、画布刷新、光标恢复和历史提交。 */
export class DrawRenderFacadeService {
  /** surface / bitmap cache 失效 helper。 */
  private readonly surfaceInvalidator: DrawRenderSurfaceInvalidator
  /** render 流程通用收尾服务。 */
  private readonly finalizeService: DrawRenderFinalizeService
  /** 输入态 chunk / line patch 决策协调器。 */
  private readonly typingPatchCoordinator: TypingPatchCoordinator
  /** 表格输入渲染辅助器。 */
  private readonly tableTypingRenderHelper: TableTypingRenderHelper

  /** 关联的 Draw 聚合根。 */
  constructor(private readonly draw: Draw) {
    this.surfaceInvalidator = new DrawRenderSurfaceInvalidator(draw)
    this.finalizeService = new DrawRenderFinalizeService(draw)
    this.typingPatchCoordinator = new TypingPatchCoordinator(draw)
    this.tableTypingRenderHelper = new TableTypingRenderHelper(draw)
  }

  /** 获取表格布局快照，首次访问时按当前版本懒构建。 */
  public getTableLayoutSnapshot(): ITableLayoutSnapshot {
    let tableLayoutSnapshot = this.draw.getRuntime().getTableLayoutSnapshot()
    if (!tableLayoutSnapshot) {
      tableLayoutSnapshot = this.draw.getServices().tableLayoutSnapshotBuilder.build({
        version: this.draw.getTableLayoutSnapshotVersion()
      })
      this.draw.getRuntime().replaceTableLayoutSnapshot(tableLayoutSnapshot)
    }
    return tableLayoutSnapshot
  }

  /** 执行一次渲染；输入态优先走 chunk 管线，避免同步整篇 layout。 */
  public render(payload?: IDrawOption) {
    const renderInvalidationManager =
      this.draw.getServices().renderInvalidationManager
    const {
      isSubmitHistory = true,
      isSetCursor = true,
      isCompute = true,
      isLazy = true,
      pageRenderScope = 'all',
      isTyping = false,
      typingInsertedCount = 0,
      isSkipTypingPreview = false,
      isImmediateTypingCompute = false,
      typingEditIndex,
      isInit = false,
      isSourceHistory = false,
      isFirstRender = false
    } = payload || {}
    let { curIndex } = payload || {}
    const isTableTyping =
      isTyping && this.draw.getCoordinate().getPositionContext().isTable
    const tableTypingEditIndex = isTableTyping
      ? typingEditIndex ?? this.resolveTypingEditIndex(
          curIndex,
          typingInsertedCount
        )
      : undefined
    renderInvalidationManager.cancelScheduledFrameRender()
    if (
      isTyping &&
      isCompute &&
      !isImmediateTypingCompute &&
      !isTableTyping
    ) {
      this.renderTypingChunkPipeline({
        curIndex,
        editIndex: typingEditIndex,
        insertedCount: typingInsertedCount,
        isSkipTypingPreview,
        isSubmitHistory,
        isSetCursor,
        isFirstRender,
        isInit,
        isSourceHistory
      })
      return
    }
    if (isTableTyping) {
      this.renderTypingTableCellChunkPipeline({
        curIndex,
        editIndex: tableTypingEditIndex,
        insertedCount: typingInsertedCount,
        isSubmitHistory,
        isFirstRender,
        isInit,
        isSourceHistory
      })
      return
    }
    if (!isTyping && isCompute) {
      // 非输入全量渲染会重建整体 layout，旧 chunk dirty 状态由完整布局覆盖。
      this.draw.getServices().documentChunkIndex.clearDirty()
    }
    this.draw.getViewState().incrementRenderCount()
    if (isTyping) {
      renderInvalidationManager.suppressBaseBitmapCache()
      if (!isTableTyping) {
        // 主文档输入才按全局索引标记 chunk；表格输入已在上方走完整表格布局。
        this.draw.getServices().documentChunkIndex.markDirtyAroundIndex(curIndex)
      }
    }
    if (isCompute) {
      renderInvalidationManager.markLayoutDirty()
    } else {
      // 非布局重绘也可能改变背景、水印等 base 视觉内容，需要推进 bitmap 版本。
      renderInvalidationManager.markBaseBitmapDirty()
    }
    const oldPageSize = this.draw.getPageRowList().length
    if (isCompute) {
      // 布局重算会生成新的内容版本，旧 bitmap 缓存必须整体失效。
      this.draw.getPageCanvasHost().invalidateAllBitmapCache()
      const layoutResult = this.draw.getServices().layoutPipeline.compute(
        payload?.layoutPatch
      )
      if (layoutResult.continuousPageHeight !== undefined) {
        this.draw
          .getPageCanvasHost()
          .resizeContinuousPage(0, layoutResult.continuousPageHeight, this.draw.getHeight())
      }
      if (isTableTyping) {
        // 完整表格布局会重建子 chunk 索引；布局提交后再标记本次输入命中的 td 子 chunk。
        this.tableTypingRenderHelper.markTableCellChunkDirty(tableTypingEditIndex)
      }
    }
    this.finalizeService.syncContinuousPageHeight()
    this.finalizeService.refreshRuntime({
      isLazy,
      pageRenderScope
    })
    curIndex = this.finalizeService.finalizeCursor({ curIndex, isSetCursor })
    this.finalizeService.submitHistory({
      curIndex,
      isTyping,
      isSubmitHistory,
      isFirstRender
    })
    this.finalizeService.schedulePostRenderEffects({
      isCompute,
      isSubmitHistory,
      isSourceHistory,
      isInit,
      oldPageSize
    })
  }

  /** 输入态 chunk 管线渲染，不再调度 idle 整篇 layout 回放。 */
  private renderTypingChunkPipeline(payload: {
    curIndex?: number
    editIndex?: number
    insertedCount: number
    isSkipTypingPreview: boolean
    isSubmitHistory: boolean
    isSetCursor: boolean
    isFirstRender: boolean
    isInit: boolean
    isSourceHistory: boolean
  }) {
    const {
      curIndex,
      editIndex: payloadEditIndex,
      insertedCount,
      isSkipTypingPreview,
      isSubmitHistory,
      isSetCursor,
      isFirstRender,
      isInit,
      isSourceHistory
    } = payload
    const oldPageSize = this.draw.getPageRowList().length
    const renderInvalidationManager =
      this.draw.getServices().renderInvalidationManager
    const editIndex = payloadEditIndex ?? this.resolveTypingEditIndex(
      curIndex,
      insertedCount
    )
    this.draw.getViewState().incrementRenderCount()
    renderInvalidationManager.suppressBaseBitmapCache()
    this.draw.getServices().documentChunkIndex.markDirtyAroundIndex(editIndex)
    if (!isSkipTypingPreview && curIndex !== undefined) {
      this.draw.getServices().pageRenderer.renderTypingChunkPreview({
        curIndex,
        editIndex,
        insertedCount
      })
    }
    const { finalPatchResult, requiresFullLayout } =
      this.typingPatchCoordinator.patchAroundEdit({
        curIndex,
        editIndex,
        insertedCount
      })
    if (requiresFullLayout || !finalPatchResult.patched) {
      this.renderTypingFullLayoutFallback({
        curIndex,
        isSubmitHistory,
        isSetCursor,
        isFirstRender,
        isInit,
        isSourceHistory,
        oldPageSize
      })
      return
    }
    if (finalPatchResult.patched) {
      renderInvalidationManager.markLayoutDirty()
      // chunk / 单行 patch 已经改变正文内容版本；必须推进 base bitmap 版本，避免点击 / 选区刷新时合成旧页面缓存覆盖新输入。
      renderInvalidationManager.markBaseBitmapDirty()
      const affectedPageNoList =
        finalPatchResult.affectedPageNoList ||
        (finalPatchResult.pageNo !== undefined ? [finalPatchResult.pageNo] : [])
      this.typingPatchCoordinator.logPatchResult(finalPatchResult)
      this.finalizeService.syncContinuousPageHeight()
      this.surfaceInvalidator.applyTypingPatchInvalidation({
        affectedPageNoList,
        requiresSurfaceClear: finalPatchResult.requiresSurfaceClear,
        oldPageSize
      })
      this.finalizeService.finalizeCursor({
        curIndex,
        isSetCursor,
        isTyping: true
      })
    } else {
      // chunk 和单行正式 patch 都覆盖不了的复杂场景保持 dirty，不再回退整篇 layout。
      this.draw.getComponents().cursor.drawCursor()
    }
    this.finalizeService.submitHistory({
      curIndex,
      isTyping: true,
      isSubmitHistory,
      isFirstRender
    })
    this.finalizeService.schedulePostRenderEffects({
      isCompute: false,
      isSubmitHistory,
      isSourceHistory,
      isInit,
      oldPageSize
    })
  }

  /** 输入态正确性回退：当页级传播后方存在表格时，先同步完整 layout 保证父子 chunk 一致。 */
  private renderTypingFullLayoutFallback(payload: {
    curIndex?: number
    isSubmitHistory: boolean
    isSetCursor: boolean
    isFirstRender: boolean
    isInit: boolean
    isSourceHistory: boolean
    oldPageSize: number
  }) {
    const {
      curIndex,
      isSubmitHistory,
      isSetCursor,
      isFirstRender,
      isInit,
      isSourceHistory,
      oldPageSize
    } = payload
    const renderInvalidationManager =
      this.draw.getServices().renderInvalidationManager
    renderInvalidationManager.markLayoutDirty()
    renderInvalidationManager.markBaseBitmapDirty()
    this.draw.getComponents().tableTool.dispose()
    this.draw.getPageCanvasHost().invalidateAllBitmapCache()
    const layoutResult = this.draw.getServices().layoutPipeline.compute()
    if (layoutResult.continuousPageHeight !== undefined) {
      this.draw
        .getPageCanvasHost()
        .resizeContinuousPage(0, layoutResult.continuousPageHeight, this.draw.getHeight())
    }
    this.finalizeService.refreshRuntime({
      isLazy: false,
      pageRenderScope: 'visible'
    })
    this.finalizeService.finalizeCursor({
      curIndex,
      isSetCursor,
      isTyping: true
    })
    this.finalizeService.submitHistory({
      curIndex,
      isTyping: true,
      isSubmitHistory,
      isFirstRender
    })
    this.finalizeService.schedulePostRenderEffects({
      isCompute: true,
      isSubmitHistory,
      isSourceHistory,
      isInit,
      oldPageSize
    })
  }

  /** 表格输入态渲染：先恢复原表格分页器作为唯一布局真相。 */
  private renderTypingTableCellChunkPipeline(payload: {
    curIndex?: number
    editIndex?: number
    insertedCount: number
    isSubmitHistory: boolean
    isFirstRender: boolean
    isInit: boolean
    isSourceHistory: boolean
  }) {
    const {
      curIndex,
      editIndex,
      isSubmitHistory,
      isFirstRender,
      isInit,
      isSourceHistory
    } = payload
    const oldPageSize = this.draw.getPageRowList().length
    const renderInvalidationManager =
      this.draw.getServices().renderInvalidationManager
    this.draw.getViewState().incrementRenderCount()
    renderInvalidationManager.suppressBaseBitmapCache()
    renderInvalidationManager.markLayoutDirty()
    renderInvalidationManager.markBaseBitmapDirty()
    this.draw.getServices().documentChunkIndex.clearDirty()
    this.tableTypingRenderHelper.markTableCellChunkDirty(editIndex)
    const oldTablePageNoList =
      this.tableTypingRenderHelper.resolveCurrentLogicalTablePageNoList()
    // 表格分页必须以原 TableLayoutEngine / TableFragmentSplitter 为唯一真相。
    // 优先尝试表格级局部重分页；不满足安全边界时再回退完整 layout。
    const tableLocalRelayoutResult =
      this.draw.getServices().tableLocalRelayoutPipeline.patchCurrentTable()
    if (tableLocalRelayoutResult.patched) {
      renderInvalidationManager.markLayoutDirty()
      renderInvalidationManager.markBaseBitmapDirty()
      this.draw.getCoordinate().setCursorLogicalIndex(curIndex ?? null)
      this.finalizeService.syncContinuousPageHeight()
    } else {
      this.draw.getPageCanvasHost().invalidateAllBitmapCache()
      const layoutResult = this.draw.getServices().layoutPipeline.compute()
      if (layoutResult.continuousPageHeight !== undefined) {
        this.draw
          .getPageCanvasHost()
          .resizeContinuousPage(0, layoutResult.continuousPageHeight, this.draw.getHeight())
      }
      this.surfaceInvalidator.invalidateTablePages([
        ...oldTablePageNoList,
        ...this.tableTypingRenderHelper.resolveCurrentLogicalTablePageNoList()
      ])
      this.finalizeService.syncContinuousPageHeight()
    }
    this.tableTypingRenderHelper.markTableCellChunkDirty(editIndex)
    this.finalizeService.refreshRuntime({
      isLazy: false,
      pageRenderScope: 'visible'
    })
    this.finalizeService.finalizeCursorWhenIndexAvailable(curIndex)
    this.finalizeService.submitHistory({
      curIndex,
      isTyping: true,
      isSubmitHistory,
      isFirstRender
    })
    this.finalizeService.schedulePostRenderEffects({
      isCompute: true,
      isSubmitHistory,
      isSourceHistory,
      isInit,
      oldPageSize
    })
  }

  /** 解析本次输入命中的旧 chunk 索引；插入后光标会右移，不能用右移后的 curIndex 查旧 chunk。 */
  private resolveTypingEditIndex(curIndex: number | undefined, insertedCount: number) {
    if (curIndex === undefined) {
      return curIndex
    }
    if (insertedCount <= 0) {
      return curIndex
    }
    return Math.max(0, curIndex - insertedCount)
  }

}
