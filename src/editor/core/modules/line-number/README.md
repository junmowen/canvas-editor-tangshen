# Line Number 模块

`line-number/` 承接行号业务运行对象，负责按页面或全文行索引绘制行号。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 行号运行对象、行号序号计算和行号绘制 |

## 维护规则

- 行号运行对象留在本模块，不再放回 `draw/frame/LineNumber.ts`。
- 页面边距和页面边框等页面设置对象归属 `modules/page-setup/runtime/`。

## 位置说明

- 所属层级：业务模块层 / 行号
- 上游调用：page setup render
- 下游依赖：`runtime/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 行号序号计算和绘制。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/LineNumber.ts` | line number runtime 方法 | 计算并绘制页面或全文行号。 | page frame render |
