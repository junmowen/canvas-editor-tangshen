# Shared Utils 目录索引

`shared/utils/` 存放 core 内部共享工具。

## 位置说明

- 所属层级：公共 shared 层 / core 内部工具
- 上游调用：event、command、modules
- 下游依赖：draw 状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `editorState.ts` | 编辑器禁用状态判断。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `editorState.ts` | `isEditorDisabled(draw)` | 统一判断编辑器是否处于禁用态。 | event、command、业务模块 |

## 维护规则

- 只服务 core 内部的 helper 可以放这里。
- 元素树遍历归属 `shared/traversal/`，不要继续放在泛化 utils 目录。
- 跨 editor 全局复用的纯工具优先放到 `src/editor/utils/`。
