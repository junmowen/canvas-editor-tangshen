# Control Command

`command/` 存放控件命令适配中的业务定位规则。

## 位置说明

- 上游调用：`src/editor/core/command/CommandAdaptDomain.ts`
- 下游依赖：`LocationPosition`、`ControlComponent`
- 迁移目的：命令适配层只遍历控件和设置 range/context，不直接判断控件 component 的内外定位语义。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ControlLocationPolicy.ts` | 控件内外定位命令的光标落点解析 |

## 函数说明

| 函数 | 作用 | 调用地方 |
| --- | --- | --- |
| `resolveControlLocationCursorIndex(payload)` | 按 `OUTER_AFTER`、`OUTER_BEFORE`、`AFTER` 或默认内部最前位置解析控件光标索引，不可定位时返回 `null` | `CommandAdaptDomain.locationControl()` |

## 维护规则

- 控件 component 到定位语义的映射留在本目录。
- `core/command` 只负责遍历、设置 range/context 和触发渲染。
