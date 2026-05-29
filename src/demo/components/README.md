# Demo Components 目录说明

`demo/components/` 存放 demo 专用 UI 组件。

## 位置说明

- 所属层级：demo 组件层
- 上游调用：demo 菜单和示例交互
- 下游依赖：demo 样式和浏览器 DOM

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `signature/` | 手写签名组件。 |

## 函数说明

| 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `signature/Signature.ts` | `Signature` | 提供手写签名弹窗、绘制和确认结果。 | demo 插入签名菜单 |
