# Background Export

`export/` 存放导出链路中的背景业务策略。

## 位置说明

- 上游调用：`src/editor/core/draw/data/DrawExportService.ts`
- 下游依赖：`draw.getRuntime().getOptions()`、`draw.getBackground().preloadImage()`
- 迁移目的：导出服务只编排导出流程，不直接判断背景图片和打印模式规则。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `BackgroundExportPreloadPolicy.ts` | 按导出模式判断是否需要预加载背景图片 |

## 函数说明

| 函数 | 作用 | 调用地方 |
| --- | --- | --- |
| `preloadExportBackgroundIfNeeded(draw, exportMode)` | 判断当前导出模式是否允许背景图，并在需要时预加载背景图 | `DrawExportService.getDataURL()` |

## 维护规则

- 背景导出预加载规则留在本目录。
- `draw/data` 只调用导出策略入口，不直接拼背景模式条件。
