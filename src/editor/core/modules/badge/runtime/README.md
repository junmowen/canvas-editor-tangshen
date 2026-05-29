# Badge Runtime

`runtime/` 存放签章运行对象。

## 位置说明

- 所属业务：`badge`
- 所属层级：页面装饰运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`command/CommandAdaptPageElement.ts`、`modules/page-setup/render/PageFrameRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Badge.ts` | 文档签章和区域签章缓存、渲染坐标解析、图片加载和绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Badge.ts` | `setMainBadge(payload)` | 设置或清空主文档签章配置。 | `command/CommandAdaptPageElement.ts` |
| `Badge.ts` | `setAreaBadgeMap(payload)` | 设置区域签章配置列表。 | `command/CommandAdaptPageElement.ts` |
| `Badge.ts` | `hasRenderableBadge()` | 判断当前是否存在可渲染签章。 | 签章渲染和状态判断链路 |
| `Badge.ts` | `getRenderableBadgeList(pageNo)` | 汇总当前页主签章和区域签章的渲染项。 | `Badge.render()` |
| `Badge.ts` | `render(ctx, pageNo)` | 加载签章图片并按页绘制。 | `page-setup/render/PageFrameRenderer.ts` |
