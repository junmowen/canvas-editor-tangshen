# Header 模块

`header/` 承接页眉业务运行对象，负责页眉元素、布局、position 和渲染。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 页眉运行对象、页眉布局和页眉渲染 |

## 维护规则

- 页眉运行对象留在本模块，不再放回 `draw/frame/Header.ts`。
- 页眉边界用于页面边框计算的 helper 归属 `modules/page-setup/runtime/`。

## 位置说明

- 所属层级：业务模块层 / 页眉
- 上游调用：zone、page setup、render
- 下游依赖：`runtime/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 页眉元素、布局、position 和渲染运行对象。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/Header.ts` | header runtime 方法 | 管理页眉数据、布局、position 和绘制。 | zone、page render、command |
