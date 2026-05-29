# Demo Utils 目录说明

`demo/utils/` 存放 demo 专用工具函数。

## 位置说明

- 所属层级：demo 工具层
- 上游调用：demo 菜单、面板和代码块示例
- 下游依赖：浏览器 DOM、Prism token

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `index.ts` | demo debounce、滚动定位和 nextTick。 |
| `prism.ts` | Prism token 到编辑器元素样式的转换。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `index.ts` | `debounce()` / `scrollIntoView()` / `nextTick()` | demo 交互节流、滚动选中项和异步调度。 | demo 菜单和面板 |
| `prism.ts` | `getPrismKindStyle()` / `formatPrismToken()` | 将代码高亮 token 转成编辑器元素样式。 | `setupInsertMenus.ts` 代码块插入 |
