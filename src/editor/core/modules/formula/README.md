# Formula 目录说明

`formula/` 存放专业公式能力的结构化模型、符号库和后续编辑器能力。

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `model/FormulaModel.ts` | 读取 `ElementType.LATEX` 元素显式携带的结构化公式模型，并提供 LaTeX AST 派生能力。 |
| `model/FormulaSerializer.ts` | 负责公式 AST 与 MathML、OOXML、LaTeX 备用文本之间的转换。 |
| `model/FormulaTextModel.ts` | 将 LaTeX 转成可参与段落排版的文本公式展示值。 |
| `model/FormulaSymbolLibrary.ts` | 内置数学、物理、化学、医院、工厂公式符号库。 |
| `layout/FormulaTextElementLayout.ts` | 让 `ElementType.LATEX` 公式控件按文本宽高测量。 |
| `render/FormulaTextRowRenderer.ts` | 让 `ElementType.LATEX` 公式控件使用文本绘制进入正文。 |

## 函数说明

| 文件 | 函数 | 作用 |
| --- | --- | --- |
| `FormulaModel.ts` | `createFormulaAstFromLatex(latex)` | 将结构化公式里的 LaTeX 派生为公式 AST。 |
| `FormulaModel.ts` | `createFormulaFromMathML(mathML, id?)` | 将外部 MathML 文本解析为内部结构化公式模型。 |
| `FormulaModel.ts` | `normalizeFormulaFromElement(element)` | 读取 LATEX 元素已经携带的结构化公式模型。 |
| `FormulaSerializer.ts` | `parseFormulaMathMLToAst(mathML)` | 将 MathML 解析为内部公式 AST。 |
| `FormulaSerializer.ts` | `createFormulaLatexFromAst(node)` | 将 AST 生成 LaTeX 序列化文本，用于复制、搜索和备用显示。 |
| `FormulaTextModel.ts` | `resolveFormulaDisplayText(latex)` | 生成文本型公式控件的展示文本。 |
| `FormulaSymbolLibrary.ts` | `getFormulaSymbolList(domain?)` | 按专业领域查询公式符号库。 |
