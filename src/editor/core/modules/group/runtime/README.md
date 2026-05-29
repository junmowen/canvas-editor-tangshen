# Group Runtime

`runtime/` 存放 `Group` 运行对象。

## 位置说明

- 所属业务：`group`
- 所属层级：分组运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`command/CommandAdaptDomain.ts`、`modules/group/render/RowGroupRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Group.ts` | 分组创建、删除、上下文查询和分组高亮 fill rect 渲染 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Group.ts` | `setGroup()` | 为当前选择内容创建分组并返回分组 id。 | `command/CommandAdaptDomain.ts` |
| `Group.ts` | `getElementListByGroupId(groupId)` | 按分组 id 收集对应元素列表。 | 分组查询和上下文解析链路 |
| `Group.ts` | `deleteGroup(groupId)` | 删除指定分组标记。 | `command/CommandAdaptDomain.ts` |
| `Group.ts` | `getContextByGroupId(groupId)` | 解析指定分组的上下文范围和矩形信息。 | `command/CommandAdaptDomain.ts` |
| `Group.ts` | `clearFillInfo()` / `recordFillInfo(...)` / `render(ctx)` | 管理并绘制当前渲染轮次的分组高亮矩形。 | `modules/group/render/RowGroupRenderer.ts` |

## 维护规则

- 只放需要持有运行态缓存或访问 `Draw` 门面的分组对象。
- 可复用的无状态元素树遍历继续放在 `core/shared/traversal/`。
