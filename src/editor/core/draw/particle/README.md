# Draw Particle 目录说明

`particle/` 存放 draw 公共层的基础绘制粒子，当前主要负责文字测量和换行符绘制。

## 位置说明

- 所属层级：公共绘制层 / 基础粒子层
- 上游调用：`draw/layout/**`、`draw/render/**`
- 下游依赖：Canvas 2D context

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TextParticle.ts` | 文本、单词、标点宽度测量和测量缓存。 |
| `LineBreakParticle.ts` | 换行符可视标记绘制。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TextParticle.ts` | `measureBasisWord()` / `measureWord()` / `measureText()` | 计算文本和单词宽度。 | `RowLayoutEngine.ts`、render 文本绘制 |
| `TextParticle.ts` | `measurePunctuationWidth()` | 单独测量标点宽度。 | 行布局和断行计算 |
| `TextParticle.ts` | `complete()` / `record()` | 维护文字测量缓存和统计。 | layout 和性能统计 |
| `LineBreakParticle.ts` | `render()` | 绘制换行符标记。 | `RowRenderer.ts` |
