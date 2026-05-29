# Area Runtime 目录索引

`area/runtime/` 存放区域元素运行实现。

## 位置说明

- 所属业务：`area`
- 所属层级：区域运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`command/CommandAdaptDomain.ts`、`modules/area/render/PageAreaRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Area.ts` | 区域插入、删除、定位、渲染、取值、属性更新和只读判断入口 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Area.ts` | `getAreaInfo()` / `getActiveAreaId()` / `getActiveAreaInfo()` | 读取区域缓存、当前激活区域和激活区域信息。 | `draw/Draw.ts`、区域命令和渲染链路 |
| `Area.ts` | `isReadonly()` | 判断当前激活区域是否只读。 | 输入、键盘和命令状态判断链路 |
| `Area.ts` | `insertArea(payload)` | 在当前文档上下文中插入区域并返回区域 id。 | `command/CommandAdaptDomain.ts` |
| `Area.ts` | `render(ctx, pageNo)` | 绘制区域背景、边框和区域占位提示。 | `area/render/PageAreaRenderer.ts` |
| `Area.ts` | `compute()` | 重新扫描文档区域元素并维护区域坐标信息。 | 布局计算和区域数据变更链路 |
| `Area.ts` | `getAreaValue(options)` | 读取指定区域内容或上下文值。 | `command/CommandAdaptQuery.ts` |
| `Area.ts` | `getContextByAreaId(areaId, options)` | 解析指定区域的上下文范围。 | `command/CommandAdaptDomain.ts` |
| `Area.ts` | `setAreaProperties(payload)` | 更新区域配置属性。 | `command/CommandAdaptDomain.ts` |
| `Area.ts` | `deleteArea(payload)` | 删除指定区域结构并返回是否成功。 | `command/CommandAdaptDomain.ts` |
| `Area.ts` | `setAreaValue(payload)` | 替换指定区域内容。 | `command/CommandAdaptDomain.ts` |

## 维护规则

- 区域业务能力统一归属 `modules/area/`。
- `draw/interactive/` 不再承载区域元素运行实现。
