# Image LaTeX Particle 目录说明

`image/particle/latex/` 存放 LaTeX 转 SVG 粒子，主要服务公式菜单预览和 LaTeX 序列化渲染。

## 位置说明

- 所属业务：`image`
- 所属层级：图片粒子 / LaTeX
- 上游调用：公式菜单预览、历史图片化渲染链路
- 下游依赖：LaTeX 解析工具和 Canvas

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `LaTexParticle.ts` | 将 LaTeX 转成 SVG，供预览和历史图片化渲染使用。 |
| `utils/` | LaTeX token、parse、layout、render 和符号工具。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `LaTexParticle.ts` | `convertLaTextToSVG(laTex)` | 将 LaTeX 字符串转换为 SVG 数据。 | 公式菜单预览 |
| `LaTexParticle.ts` | `render()` | 按图片粒子方式绘制 LaTeX 结果。 | 历史图片化渲染链路 |
