# Page Number 模块

`page-number/` 承接页码业务运行对象和渲染策略，负责页码格式化、页码渲染和 worker 快照对齐。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `render/` | 页码参与页面绘制和 worker 快照的业务策略 |
| `runtime/` | 页码运行对象、页码占位符替换和页码绘制 |

## 维护规则

- 页码运行对象留在本模块，不再放回 `draw/frame/PageNumber.ts`。
- 页码 worker 快照对齐策略留在 `render/`，不要内联回 `render-backend/worker`。
- 页面边距和页面边框等页面设置对象归属 `modules/page-setup/runtime/`。

## 位置说明

- 所属层级：业务模块层 / 页码
- 上游调用：page render、worker snapshot
- 下游依赖：`runtime/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 页码格式化、占位符替换和绘制。 |
| `render/` | 页码页面绘制和 worker 快照策略。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/PageNumber.ts` | page number runtime 方法 | 格式化并绘制页码。 | page frame render |
| `render/` | page number render helper | 调度页面和 worker 快照中的页码绘制。 | render、worker |
