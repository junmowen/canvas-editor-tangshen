/**
 * 事件层归一化后的页内坐标。
 *
 * x / y 始终是当前页局部坐标，
 * pageIndex 则表示命中的分页页号。
 */
export type IPagePoint = {
  x: number
  y: number
  pageIndex: string | null
}
