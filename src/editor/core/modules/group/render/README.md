# Group Render

`render/` 存放分组业务在正文绘制链路中的渲染辅助。

## 位置说明

- 所属业务：`group`
- 所属层级：正文行级渲染层
- 上游调度：`draw/render/RowRenderer.ts`
- 下游依赖：`draw.getGroup()` 暴露的分组高亮记录和绘制能力

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RowGroupRenderer.ts` | 行级分组 fill rect 记录、输出和缓存清理编排 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `RowGroupRenderer.ts` | `constructor(draw)` | 注入 `Draw` 运行时，用于访问分组运行对象。 | `draw/render/RowRenderer.ts` 构造函数 |
| `RowGroupRenderer.ts` | `record(payload)` | 在非禁用分组且元素存在 `groupIds` 时，记录当前行内元素的分组高亮矩形。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |
| `RowGroupRenderer.ts` | `flush(ctx)` | 将本轮已记录的分组高亮输出到 Canvas，并交给分组运行对象完成缓存清理。 | `draw/render/RowRenderer.ts` 的 `drawRow()` 行尾收尾 |

## 维护规则

- 分组高亮的记录和 flush 留在本目录，`draw/render/RowRenderer.ts` 只调度分组渲染入口。
- 持有分组状态和范围维护能力的运行对象继续放在 `runtime/`。
