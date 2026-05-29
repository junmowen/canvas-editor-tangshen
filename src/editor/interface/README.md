# Interface 目录索引

`src/editor/interface/` 存放编辑器对外和内部共用的 TypeScript 接口。

## 维护规则

- 对外可见的数据结构、命令参数、监听器参数优先放在这里。
- 新增对外类型后，确认是否需要从 `src/editor/index.ts` 导出。
- 只在模块内部使用的局部类型优先留在对应模块内，避免扩大公开边界。

## 位置说明

- 所属层级：编辑器类型接口层
- 上游调用：core、utils、demo、外部类型导出
- 下游依赖：dataset enum 和其它接口类型

## 文件说明

| 目录 / 文件 | 职责 |
| --- | --- |
| `*.ts` | 编辑器主体、元素、事件、命令、绘制、range 等接口。 |
| `contextmenu/` | 右键菜单接口。 |
| `i18n/` | 语言包接口。 |
| `shortcut/` | 快捷键接口。 |
| `table/` | 表格结构接口。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `*.ts` | interface / type 导出 | 提供 TypeScript 结构约束，无运行时函数。 | core、utils、外部导出 |
| `table/` | 表格接口导出 | 约束 table、tr、td、colgroup 和 fragment 数据结构。 | table 模块、layout |
