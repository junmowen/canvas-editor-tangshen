/** 公式来源格式，描述当前公式最初由哪种结构写入。 */
export type FormulaSourceFormat = 'latex' | 'mathml' | 'ooxml'

/** 公式展示模式，区分行内公式和独立公式段。 */
export type FormulaDisplayMode = 'inline' | 'block'

/** 公式节点类型，覆盖专业公式编辑器第一批需要承载的结构。 */
export type FormulaNodeType =
  | 'root'
  | 'text'
  | 'symbol'
  | 'fraction'
  | 'sqrt'
  | 'subscript'
  | 'superscript'
  | 'subsup'
  | 'matrix'
  | 'group'
  | 'operator'
  | 'unit'

/** 公式专业领域，用于数学、物理、化学、医院和工厂等场景筛选符号库。 */
export type FormulaDomain =
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'hospital'
  | 'factory'

/** 公式 AST 节点，保存可编辑、可导入导出的结构化公式内容。 */
export interface IFormulaNode {
  /** 节点类型，用于选择编辑器控件和 OOXML 映射策略。 */
  type: FormulaNodeType
  /** 节点值，用于文本、符号、单位或运算符的实际内容。 */
  value?: string
  /** 子节点列表，用于表达分组、根节点和普通连续公式片段。 */
  children?: IFormulaNode[]
  /** 分子节点，用于分式结构。 */
  numerator?: IFormulaNode
  /** 分母节点，用于分式结构。 */
  denominator?: IFormulaNode
  /** 被开方节点，用于根式结构。 */
  radicand?: IFormulaNode
  /** 根指数节点，用于 n 次根结构。 */
  index?: IFormulaNode
  /** 基础节点，用于上下标结构。 */
  base?: IFormulaNode
  /** 上标节点，用于上标或上下标组合结构。 */
  superscript?: IFormulaNode
  /** 下标节点，用于下标或上下标组合结构。 */
  subscript?: IFormulaNode
  /** 矩阵行列表，用于矩阵、方程组和多行公式。 */
  rows?: IFormulaNode[][]
}

/** 公式结构化模型，作为 LATEX 元素向完整专业公式能力演进的核心数据。 */
export interface IFormula {
  /** 公式唯一标识，用于跨导入导出和业务系统绑定。 */
  id?: string
  /** 公式展示模式，用于决定行内测量或块级排版。 */
  displayMode?: FormulaDisplayMode
  /** 来源格式，标记 `latex`、`mathml` 或 `ooxml` 的输入来源。 */
  sourceFormat: FormulaSourceFormat
  /** LaTeX 文本，作为当前渲染链路和复制粘贴的序列化来源。 */
  latex?: string
  /** 空白公式控件的占位 LaTeX，仅用于界面占位渲染，不作为真实公式内容导出。 */
  placeholderLatex?: string
  /** 空白公式控件的占位文本，用于正文灰色提示用户点击编辑。 */
  placeholderText?: string
  /** 空白公式控件的占位颜色，用于和真实公式内容做视觉区分。 */
  placeholderColor?: string
  /** 文本型公式控件的展示文本，用于段落布局、搜索和备用渲染。 */
  displayText?: string
  /** MathML 文本，用于 Web/专业系统交换。 */
  mathML?: string
  /** OOXML 公式片段，用于 DOCX 导入导出往返。 */
  ooxml?: string
  /** 公式 AST，保存可编辑、可搜索、可导出的结构化内容。 */
  ast: IFormulaNode
  /** 公式编号，用于工程、医疗报告里的独立公式编号。 */
  number?: string
  /** 专业领域标签，用于符号库、模板和业务校验。 */
  domainTags?: FormulaDomain[]
  /** 已使用的专业符号标识，便于业务侧统计和校验。 */
  symbolIds?: string[]
}

/** 公式符号条目，描述专业符号库中可插入的单个符号。 */
export interface IFormulaSymbol {
  /** 符号唯一标识，用于 API 传值和业务配置。 */
  id: string
  /** 符号所属专业领域。 */
  domain: FormulaDomain
  /** 符号分类，用于 UI 分组和搜索过滤。 */
  category: string
  /** 展示名称，用于符号面板和业务配置。 */
  label: string
  /** 插入时使用的 LaTeX 片段。 */
  latex: string
  /** 符号说明，用于专业场景搜索和配置提示。 */
  description: string
  /** 关键字列表，用于中文/英文检索。 */
  keywords: string[]
}
