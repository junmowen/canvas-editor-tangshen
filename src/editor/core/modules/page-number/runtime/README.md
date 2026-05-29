# Page Number Runtime

`runtime/` 存放页码运行对象。

## 位置说明

- 所属业务：`page-number`
- 所属层级：页面框架运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/page-setup/render/PageFrameRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageNumber.ts` | 页码占位符格式化、页码文本位置计算和页码绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `PageNumber.ts` | `render(ctx, pageNo)` | 根据页码配置、页数占位符和页面尺寸绘制当前页页码。 | `page-setup/render/PageFrameRenderer.ts` |
