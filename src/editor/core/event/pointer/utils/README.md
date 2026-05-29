# Pointer Utils 目录说明

`pointer/utils/` 存放指针链路复用的小工具，目前用于把命中位置写回 positionContext。

## 位置说明

- 所属层级：事件层 / 指针工具
- 上游调用：pointer intents 和 handlers
- 下游依赖：draw coordinate、position context

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `applyPointerPositionContext.ts` | 根据 pointer 命中结果更新 draw 的 positionContext。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `applyPointerPositionContext.ts` | `applyPointerPositionContext()` | 将指针解析出的页码、索引、表格上下文等写入 positionContext。 | `ResolvePointerHitIntent.ts`、selection / drag intents |
