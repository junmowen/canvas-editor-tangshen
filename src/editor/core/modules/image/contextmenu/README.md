# Image ContextMenu 目录索引

`contextmenu/` 存放图片右键菜单配置和图片菜单回调。

## 位置说明

- 所属业务：`image`
- 所属层级：右键菜单配置层
- 上游调度：`runtime/contextmenu/ContextMenu.ts`
- 下游依赖：图片命令适配和图片显示方式枚举

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `imageMenus.ts` | 图片替换、保存和显示方式切换菜单配置 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `imageMenus.ts` | `imageMenus` | 定义图片右键菜单项、菜单可见状态和执行回调。 | `runtime/contextmenu/ContextMenu.ts` |

## 维护规则

- 图片替换、保存和环绕方式切换菜单放在这里。
- 通用 contextmenu 只负责聚合菜单，不直接维护图片菜单项。
