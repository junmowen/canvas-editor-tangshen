/** 渲染层枚举，用于区分不同 surface 的职责和生命周期。 */
export enum RenderLayer {
  /** 基础正文层，承载页面背景、正文、页眉页脚等静态内容。 */
  BASE = 'base',
  /** 覆盖装饰层，承载选区、搜索高亮、控件高亮等高频变化内容。 */
  OVERLAY = 'overlay',
  /** 导出层，用于后续隔离 dataURL / 打印导出 surface。 */
  EXPORT = 'export',
  /** 度量层，用于后续统一文本测量或离屏测量 canvas。 */
  MEASURE = 'measure'
}
