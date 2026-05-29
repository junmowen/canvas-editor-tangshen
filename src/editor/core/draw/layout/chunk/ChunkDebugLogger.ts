declare global {
  /** 窗口契约，用于约束内部流程中传递的数据结构。 */
  interface Window {
    /** 全局分块布局调试开关，控制是否输出 chunk 级诊断信息。 */
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
