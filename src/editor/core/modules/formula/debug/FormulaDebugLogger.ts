declare global {
  /** 窗口契约，用于约束公式调试开关。 */
  interface Window {
    /** 全局公式排版调试开关，开启后输出测量、换行、渲染和 worker 快照日志。 */
    __CANVAS_EDITOR_FORMULA_DEBUG__?: boolean
  }
}

/** 判断公式调试日志是否开启，默认关闭以避免影响正常输入性能。 */
export function isFormulaDebugEnabled() {
  const globalScope = globalThis as {
    /** 浏览器主线程上的公式调试开关。 */
    __CANVAS_EDITOR_FORMULA_DEBUG__?: boolean
    /** worker 环境没有 window，主线程环境可从 window 兜底读取。 */
    window?: Window
  }
  return Boolean(
    globalScope.__CANVAS_EDITOR_FORMULA_DEBUG__ ||
      globalScope.window?.__CANVAS_EDITOR_FORMULA_DEBUG__
  )
}

/** 输出公式排版调试日志，统一前缀方便用户复制和过滤。 */
export function logFormulaDebug(
  label: string,
  payload: Record<string, unknown>
) {
  // 同时输出对象和 JSON 字符串；浏览器控制台复制折叠对象时，JSON 能保留完整数值。
  console.log(`[formula-debug] ${label}`, payload, JSON.stringify(payload))
}

/** 归一化调试数值，避免浮点尾数干扰人工判断。 */
export function roundFormulaDebugNumber(value: number | undefined) {
  if (value === undefined || Number.isNaN(value)) {
    return value
  }
  return Math.round(value * 100) / 100
}

export {}
