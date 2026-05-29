# Line Number Runtime

`runtime/` 存放行号运行对象。

## 位置说明

- 所属业务：`line-number`
- 所属层级：页面框架运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/page-setup/render/PageFrameRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `LineNumber.ts` | 按页面或全文行索引计算序号，并在页面边距绘制行号 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `LineNumber.ts` | `render(ctx, pageNo)` | 按当前行号配置计算序号并绘制到页面边距。 | `page-setup/render/PageFrameRenderer.ts` |
