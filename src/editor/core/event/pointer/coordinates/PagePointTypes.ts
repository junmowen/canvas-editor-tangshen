/**
 * 事件层归一化后的页内坐标。
 *
 * x / y 始终是当前页局部坐标，
 * pageIndex 则表示命中的分页页号。
 */
export type IPagePoint = {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 页面索引，用于定位对应元素、行或片段。 */
  pageIndex: string | null
}
