import type { Draw } from './Draw'

/**
 * 获取渲染后端统计信息。
 *
 * 该入口用于观察 canvas 池复用情况和多引擎调度命中情况。
 */
export function createRenderBackendStatsSnapshot(draw: Draw) {
  const pageCanvasHost = draw.getPageCanvasHost()
  const services = draw.getServices()
  const runtime = draw.getRuntime()
  const surface = pageCanvasHost.getSurfaceStats()
  const canvasPool = pageCanvasHost.getCanvasPoolStats()
  const bitmapCache = surface.bitmapCache
  const imagePreview = draw.getImageParticle().getPreviewBitmapCacheStats()
  const estimatedTotalBytes =
    surface.estimatedActiveBytes +
    canvasPool.estimatedIdleBytes +
    bitmapCache.estimatedBytes +
    imagePreview.estimatedBytes
  return {
    surface,
    canvasPool,
    backend: services.renderBackendManager.getStats(),
    // imagePreview 统计 WebGL / Canvas2D 图片任务处理后的预览 bitmap 复用情况。
    imagePreview,
    // baseRenderSource 区分同步 Canvas2D 重画、worker bitmap 合成和 bitmap cache 合成。
    baseRenderSource: services.pageRenderer.getBaseRenderSourceStats(),
    // typingPreview 统计输入态 chunk / 行级 canvas 局部重绘命中情况。
    typingPreview: services.pageRenderer.getTypingPreviewStats(),
    // layout 用于定位 1000 页输入后仍然卡顿的整篇排版阶段耗时。
    layout: services.layoutPipeline.getStats(),
    // documentChunk 用于推进商业级段落 / chunk 增量布局。
    documentChunk: services.documentChunkIndex.getStats(),
    // tableChunkRange 用于观察页 chunk、表格 chunk、td 子 chunk 的父子范围同步。
    tableChunkRange: services.tableChunkRangeIndex.getStats(),
    // tableCellChunk 用于推进表格单元格父子 chunk 增量布局。
    tableCellChunk: services.tableCellChunkIndex.getStats(),
    // tableCellChunkPipeline 统计表格 td 子 chunk 的同步局部写回。
    tableCellChunkPipeline: services.tableCellChunkPipeline.getStats(),
    // tableLocalRelayout 统计表格级局部重分页是否接管表格输入。
    tableLocalRelayout: services.tableLocalRelayoutPipeline.getStats(),
    // chunkLayout 统计输入态 chunk 管线 patch 命中与失败原因。
    chunkLayout: services.chunkLayoutPipeline.getStats(),
    // asyncInsert 统计大粘贴后台分批事务，观察首批响应、剩余批次和取消情况。
    asyncInsert: services.mutationService.getAsyncInsertStats(),
    // typingLinePatch 统计 chunk 失败后单行正式 patch 的覆盖情况。
    typingLinePatch: services.typingLinePatchPipeline.getStats(),
    tableSnapshot: services.targetResolverService.getTableSnapshotStats(),
    // documentTextStore 统计正文主数据适配层，后续替换为 piece-table / rope 时用于双写对比。
    documentTextStore: runtime.getDocumentTextStoreStats(),
    // workerRender 统计 OffscreenCanvas 后台页渲染 job、备用路径和过期丢弃。
    workerRender: services.workerRenderScheduler.getStats(),
    memory: {
      // activeSurfaceBytes 统计已挂载、测量和 transient surface 的当前占用。
      activeSurfaceBytes: surface.estimatedActiveBytes,
      idleCanvasPoolBytes: canvasPool.estimatedIdleBytes,
      bitmapCacheBytes: bitmapCache.estimatedBytes,
      imagePreviewBitmapBytes: imagePreview.estimatedBytes,
      estimatedTotalBytes,
      estimatedTotalMB: Math.round((estimatedTotalBytes / 1024 / 1024) * 100) / 100,
      peakActiveSurfaceBytes: surface.peakEstimatedActiveBytes,
      peakIdleCanvasPoolBytes: canvasPool.peakEstimatedIdleBytes,
      peakBitmapCacheBytes: bitmapCache.peakEstimatedBytes
    },
    // baseBitmapContentVersion 用于排查非布局基础视觉变化导致的缓存失效。
    baseBitmapContentVersion:
      services.renderInvalidationManager.getBaseBitmapContentVersion()
  }
}

/**
 * 重置渲染后端相关统计。
 *
 * 仅清空性能计数、近期窗口和高水位基线，不释放当前 canvas / bitmap 资源。
 */
export function resetRenderBackendStatsSnapshot(draw: Draw) {
  const services = draw.getServices()
  draw.getPageCanvasHost().resetRenderResourceStats()
  services.renderBackendManager.resetStats()
  services.pageRenderer.resetBaseRenderSourceStats()
  services.pageRenderer.resetTypingPreviewStats()
  services.layoutPipeline.resetStats()
  services.documentChunkIndex.resetStats()
  services.tableChunkRangeIndex.resetStats()
  services.tableCellChunkIndex.resetStats()
  services.tableCellChunkPipeline.resetStats()
  services.tableLocalRelayoutPipeline.resetStats()
  services.chunkLayoutPipeline.resetStats()
  services.mutationService.resetAsyncInsertStats()
  services.typingLinePatchPipeline.resetStats()
  services.tableLayoutSnapshotBuilder.resetStats()
  services.workerRenderScheduler.resetStats()
  draw.getImageParticle().resetPreviewBitmapCacheStats()
  draw.getRuntime().resetDocumentTextStoreStats()
}
