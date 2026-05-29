# LaTeX Utils 目录说明

`image/particle/latex/utils/` 存放 LaTeX 转 SVG 的解析、排版和符号工具。

## 位置说明

- 所属业务：`image`
- 所属层级：LaTeX 粒子工具
- 上游调用：`LaTexParticle.ts`
- 下游依赖：Hershey 字形数据和 LaTeX token

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `latexCore.ts` | LaTeX tokenize、parse、bbox、layout 和 render 主逻辑。 |
| `LaTexUtils.ts` | LaTeX SVG 工具类和返回类型。 |
| `symbols.ts` | 符号映射。 |
| `hershey.ts`、`hersheyRawA.ts`、`hersheyRawB.ts` | Hershey 字形数据读取和原始数据。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `latexCore.ts` | `tokenize()` / `parse()` / `parseAtom()` | 将 LaTeX 字符串解析为表达式树。 | `LaTexUtils.ts` |
| `latexCore.ts` | `computeBbox()` / `group()` / `align()` / `plan()` | 计算表达式尺寸并安排布局。 | `LaTexUtils.ts` |
| `latexCore.ts` | `flatten()` / `render()` | 展平表达式并生成绘制路径。 | `LaTexUtils.ts` |
| `symbols.ts` | `asciiMap()` | 将符号映射为 Hershey 字形编号。 | `latexCore.ts` |
| `hershey.ts` | `HERSHEY()` | 读取 Hershey 字形条目。 | `symbols.ts`、`latexCore.ts` |
| `LaTexUtils.ts` | `LaTexUtils` | 对外封装 LaTeX 到 SVG 的转换能力。 | `LaTexParticle.ts` |
