# Group 模块

`group/` 承接批注组 / 分组业务，负责把范围内元素写入 `groupIds`，并在渲染阶段维护分组高亮区域。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `render/` | 正文行级分组高亮 fill rect 记录和 flush |
| `runtime/` | Group 运行对象、分组范围解析、标记维护和 fill rect 高亮缓存 |

## 维护规则

- 分组相关状态和渲染副作用留在本模块，不再放回 `draw/interactive/`。
- 公共绘制管线通过 `render/` 入口记录和输出分组高亮，不直接操作 `Group` 的 fill rect 运行缓存。

## 位置说明

- 所属层级：业务模块层 / 分组
- 上游调用：command、row render
- 下游依赖：`runtime/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 分组范围解析、标记维护和高亮缓存。 |
| `render/` | 行级分组高亮记录和输出。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/Group.ts` | group runtime 方法 | 维护 groupIds 和高亮矩形缓存。 | command、render |
| `render/` | group render helper | 记录并绘制分组高亮。 | `RowRenderer` |
