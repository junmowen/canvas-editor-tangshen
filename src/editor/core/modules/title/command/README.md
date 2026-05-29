# Title Command

`command/` 存放标题命令查询和适配中的业务规则。

## 位置说明

- 上游调用：`src/editor/core/command/CommandAdaptPageElement.ts`
- 下游依赖：`ElementType.TITLE`
- 迁移目的：元素查询命令只负责遍历和返回结果，不直接判断标题类型是否保留上下文字段。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TitleElementQueryPolicy.ts` | 按元素 ID 查询时是否保留标题上下文字段 |

## 函数说明

| 函数 | 作用 | 调用地方 |
| --- | --- | --- |
| `shouldKeepTitleContextForElement(element)` | 判断按 ID 查询元素时是否保留 `TITLE_CONTEXT_ATTR` | `CommandAdaptPageElement.getElementById()` |

## 维护规则

- 标题元素类型判断留在本目录。
- `core/command` 只负责遍历、复制和返回查询结果。
