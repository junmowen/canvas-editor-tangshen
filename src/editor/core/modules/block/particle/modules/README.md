# Block Particle Modules 目录说明

`block/particle/modules/` 存放具体块级嵌入元素的 DOM 渲染实现。

## 位置说明

- 所属业务：`block`
- 所属层级：业务粒子 / 块级 DOM 宿主
- 上游调用：`modules/block/particle/BlockParticle.ts`
- 下游依赖：iframe、video、svg、html DOM

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `BaseBlock.ts` | 块级元素公共 DOM 宿主和位置同步。 |
| `IFrameBlock.ts` | iframe block 渲染和 srcdoc 同步。 |
| `VideoBlock.ts` | video block 渲染。 |
| `SvgBlock.ts` | svg block 渲染。 |
| `HtmlBlock.ts` | html block 渲染。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `BaseBlock.ts` | `render()` / `setClientRects()` / `remove()` | 创建、定位和移除 block DOM 宿主。 | `BlockParticle.ts` |
| `BaseBlock.ts` | `syncIframeSrcdocFromDom()` | 将 iframe 当前 DOM 内容同步回元素。 | 导出和取值链路 |
| `IFrameBlock.ts` | `render()` / `syncSrcdocFromDom()` | 渲染 iframe 并同步 srcdoc。 | `BaseBlock.ts` |
| `VideoBlock.ts` / `SvgBlock.ts` / `HtmlBlock.ts` | `render()` | 渲染对应块级元素 DOM。 | `BaseBlock.ts` |
