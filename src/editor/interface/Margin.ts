/** 页边距四元组，按上、右、下、左的顺序保存页面边距。 */
export type IMargin = [top: number, right: number, bottom: number, left: number]

/** 装订线位置枚举，限定装订线可放在左侧、顶部或内侧。 */
export type PageGutterPosition = 'left' | 'top' | 'inside'
