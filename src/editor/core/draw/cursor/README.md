# Draw Cursor 目录说明

`cursor/` 存放 draw 层的光标定位适配服务，用于把外部传入的逻辑索引落到编辑器光标状态。

## 位置说明

- 所属层级：公共绘制层 / 光标适配层
- 上游调用：`Draw.ts`、键盘和输入链路
- 下游依赖：`runtime/Cursor`、`Position`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawCursorService.ts` | 封装 `Draw.setCursor()` 的实际光标定位逻辑。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawCursorService.ts` | `setCursor(curIndex)` | 根据逻辑索引刷新光标位置，索引为空时按当前上下文处理。 | `Draw.ts`、输入提交和渲染完成链路 |
