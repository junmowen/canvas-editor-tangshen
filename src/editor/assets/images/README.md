# Editor Images 目录说明

`editor/assets/images/` 存放编辑器核心运行时图标。

## 位置说明

- 所属层级：编辑器资源层 / 图标
- 上游调用：contextmenu、image previewer、table tool
- 下游依赖：无

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `*.svg` | 表格、图片、打印、缩放和菜单操作图标。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `*.svg` | 无运行时函数 | 作为核心编辑器 UI 图标被引用。 | contextmenu、table、previewer |
