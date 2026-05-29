# Placeholder Runtime

`runtime/` 存放占位内容运行对象。

## 位置说明

- 所属业务：`placeholder`
- 所属层级：占位内容运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/placeholder/render/PagePlaceholderRenderer.ts`、`modules/area/runtime/Area.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Placeholder.ts` | 构造占位元素、计算临时行和 position，并绘制占位提示 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Placeholder.ts` | `_compute(options)` | 基于占位配置构造临时元素、行和 position。 | `Placeholder.render()` |
| `Placeholder.ts` | `render(ctx, options)` | 计算并绘制空文档或区域占位提示。 | `placeholder/render/PagePlaceholderRenderer.ts`、`area/runtime/Area.ts` |
