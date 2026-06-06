import { IElement } from './Element'

/** 文档样式类型，覆盖正文段落、字符、表格和列表样式。 */
export type DocumentStyleType = 'paragraph' | 'character' | 'table' | 'list'

/** 列表样式片段，用于把段落样式和编号语义关联起来。 */
export interface IDocumentListStyle {
  listType?: IElement['listType']
  listStyle?: IElement['listStyle']
  listLevel?: IElement['listLevel']
  listStart?: IElement['listStart']
  listSymbol?: IElement['listSymbol']
  listWrap?: IElement['listWrap']
}

/** 可复用文档样式，直接格式始终覆盖样式计算结果。 */
export interface IDocumentStyle {
  /** 样式唯一标识，导出 OOXML 时会映射到 styleId。 */
  id: string
  /** 样式显示名称。 */
  name?: string
  /** 样式类型，未指定时按段落样式处理。 */
  type?: DocumentStyleType
  /** 父样式 id，用于继承正文、引用等基础格式。 */
  basedOn?: string
  /** 段落结束后默认切换到的下一个样式 id。 */
  next?: string
  /** 是否内置样式，供 UI 和导出排序识别。 */
  builtin?: boolean
  /** 段落格式片段，例如对齐、缩进、段距、分页控制和制表位。 */
  paragraph?: Partial<IElement>
  /** 字符格式片段，例如字体、字号、粗斜体、颜色和高亮。 */
  text?: Partial<IElement>
  /** 列表格式片段。 */
  list?: IDocumentListStyle
  /** 表格样式片段，第一批用于保存和导出样式 id，表格细分映射后续扩展。 */
  table?: Partial<IElement>
}
