import { IRenderBackendDebugSnapshot } from '../render-backend/RenderBackendDebugPanel'
import type { Draw } from './Draw'

export function createRenderBackendDebugSnapshot(
  draw: Draw
): IRenderBackendDebugSnapshot {
  const stats = draw.getRenderBackendStats()
  const webglCapability = stats.backend.capabilityList.find(item => {
    return item.name === 'webgl'
  }) as Record<string, number | string | boolean | undefined> | undefined
  const previewTotal = stats.imagePreview.hitCount + stats.imagePreview.missCount
  const documentTextStore = stats.documentTextStore
  return {
    pageCount: draw.getPageCount(),
    visiblePageNoList: draw.getViewState().getVisiblePageNoList(),
    intersectionPageNo: draw.getViewState().getIntersectionPageNo(),
    currentPageNo: draw.getPageNo(),
    backend: {
      dispatchCount: stats.backend.dispatchCount,
      renderCount: stats.backend.renderCount,
      missCount: stats.backend.missCount,
      failureCount: stats.backend.failureCount,
      failoverCount: stats.backend.failoverCount,
      slowCount: stats.backend.recentWindow.slowCount,
      capabilityList: stats.backend.capabilityList
    },
    worker: {
      submitCount: stats.workerRender.submitCount,
      successCount: stats.workerRender.successCount,
      failoverCount: stats.workerRender.failoverCount,
      pendingCount: stats.workerRender.pendingCount,
      activeCount: stats.workerRender.activeCount,
      queuedCount: stats.workerRender.queuedCount,
      circuitOpen: stats.workerRender.circuitOpen,
      lastFailoverReason: stats.workerRender.lastFailoverReason
    },
    baseRenderSource: {
      canvas2DRenderCount: stats.baseRenderSource.canvas2DRenderCount,
      workerRenderCount: stats.baseRenderSource.workerRenderCount,
      bitmapCacheComposeCount: stats.baseRenderSource.bitmapCacheComposeCount
    },
    typingPreview: {
      attemptCount: stats.typingPreview.attemptCount,
      patchSuccessCount: stats.typingPreview.chunkSuccessCount,
      linePatchSuccessCount: stats.typingPreview.lineSuccessCount,
      failureCount: stats.typingPreview.failCount
    },
    image: {
      previewCacheHitRate:
        previewTotal > 0
          ? Math.round((stats.imagePreview.hitCount / previewTotal) * 100) / 100
          : 0,
      previewCacheEstimatedMB: stats.imagePreview.estimatedMB,
      webglTextureCacheMB: Number(webglCapability?.textureCacheMB || 0),
      webglMaxTextureCacheMB: Number(webglCapability?.maxTextureCacheMB || 0),
      estimatedDownsampleSavedPixels: Number(
        webglCapability?.estimatedDownsampleSavedPixels || 0
      ),
      savedUploadPixels: Number(webglCapability?.savedUploadPixels || 0)
    },
    memory: {
      estimatedTotalMB: stats.memory.estimatedTotalMB,
      activeSurfaceMB: Math.round(
        (stats.memory.activeSurfaceBytes / 1024 / 1024) * 100
      ) / 100,
      bitmapCacheMB: Math.round(
        (stats.memory.bitmapCacheBytes / 1024 / 1024) * 100
      ) / 100,
      imagePreviewBitmapMB: Math.round(
        (stats.memory.imagePreviewBitmapBytes / 1024 / 1024) * 100
      ) / 100,
      idleCanvasPoolMB: Math.round(
        (stats.memory.idleCanvasPoolBytes / 1024 / 1024) * 100
      ) / 100
    },
    documentTextStore: {
      type: documentTextStore.type,
      length: documentTextStore.length,
      operationCount: documentTextStore.operationCount,
      externalMutationCount: documentTextStore.externalMutationCount,
      mirrorMode: documentTextStore.mirrorMode,
      mirrorHealthy: documentTextStore.mirrorHealthy,
      mirrorReplayCount: documentTextStore.mirrorReplayCount,
      mirrorReplayMismatchCount: documentTextStore.mirrorReplayMismatchCount,
      mirrorReplaySkippedCount: documentTextStore.mirrorReplaySkippedCount
    }
  }
}
