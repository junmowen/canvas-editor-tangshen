declare global {
  interface Window {
    __CANVAS_EDITOR_CHUNK_DEBUG__?: boolean
  }
}

/** chunk 调试日志，默认关闭，避免影响正常输入性能。 */
export function isChunkDebugEnabled() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.__CANVAS_EDITOR_CHUNK_DEBUG__)
  )
}

/** 输出 chunk 调试日志。调用方应先用 isChunkDebugEnabled 避免热路径构造调试对象。 */
export function logChunkDebug(label: string, payload: Record<string, unknown>) {
  console.log(`[chunk-debug] ${label}`, payload)
}

export {}
