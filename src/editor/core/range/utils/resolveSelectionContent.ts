/**
 * 统一描述选区对应的内容范围。
 *
 * anchorStartIndex / anchorEndIndex 保留原始边界索引，
 * startIndex / endIndex 则用于实际内容切片。
 */
export interface IResolvedSelectionContentRange {
  /** 锚点起始索引，用于还原选区拖拽前的左边界。 */
  anchorStartIndex: number
  /** 锚点结束索引，用于还原选区拖拽前的右边界。 */
  anchorEndIndex: number
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
}

/**
 * 将起止边界索引转换为实际的内容切片范围。
 *
 * 这里沿用区间语义 (startIndex, endIndex]，
 * 因此真正的内容起点需要从左边界的下一个字符开始。
 */
export function resolveSelectionContentRange(
  startIndex: number,
  endIndex: number
): IResolvedSelectionContentRange | null {
  if (startIndex === endIndex) return null
  let anchorStartIndex = startIndex
  let anchorEndIndex = endIndex
  if (anchorStartIndex > anchorEndIndex) {
    const nextStartIndex = anchorEndIndex
    anchorEndIndex = anchorStartIndex
    anchorStartIndex = nextStartIndex
  }
  return {
    anchorStartIndex,
    anchorEndIndex,
    // 选区内容遵循 (startIndex, endIndex]，左边界本身不计入复制内容。
    startIndex: anchorStartIndex + 1,
    endIndex: anchorEndIndex
  }
}

/**
 * 按已经归一化的选区范围截取内容列表。
 */
export function sliceSelectionContent<T>(
  elementList: T[],
  selectionRange: IResolvedSelectionContentRange
): T[] {
  return elementList.slice(selectionRange.startIndex, selectionRange.endIndex + 1)
}
