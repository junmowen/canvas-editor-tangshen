# Footer 模块

`footer/` 承接页脚业务运行对象，负责页脚元素、布局、position 和渲染。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 页脚运行对象、页脚布局和页脚渲染 |

## 维护规则

- 页脚运行对象留在本模块，不再放回 `draw/frame/Footer.ts`。
- 页脚边界用于页面边框计算的 helper 归属 `modules/page-setup/runtime/`。

## 位置说明

- 所属层级：业务模块层 / 页脚
- 上游调用：zone、page setup、render
- 下游依赖：`runtime/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 页脚元素、布局、position 和渲染运行对象。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/Footer.ts` | footer runtime 方法 | 管理页脚数据、布局、position 和绘制。 | zone、page render、command |
