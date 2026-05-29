# Signature 目录说明

`demo/components/signature/` 存放 demo 手写签名组件。

## 位置说明

- 所属层级：demo 组件层 / 签名
- 上游调用：demo 插入菜单
- 下游依赖：Canvas、`signature.css`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Signature.ts` | 签名弹窗、画布绘制、撤销、清空和确认。 |
| `signature.css` | 签名弹窗和操作按钮样式。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Signature.ts` | `Signature` | 创建签名面板并输出签名图片数据。 | demo 插入签名菜单 |
