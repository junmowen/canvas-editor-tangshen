# Editor CSS 目录说明

`editor/assets/css/` 存放编辑器核心样式入口和分模块样式。

## 位置说明

- 所属层级：编辑器资源层 / CSS
- 上游调用：`src/editor/index.ts`
- 下游依赖：编辑器 DOM class

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `index.css` | 核心样式入口。 |
| `block/`、`contextmenu/`、`control/`、`date/`、`hyperlink/`、`previewer/`、`resizer/`、`table/`、`zone/` | 各运行时 UI 样式。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `*.css` | 无运行时函数 | 提供编辑器核心 DOM 样式。 | `src/editor/index.ts` |
