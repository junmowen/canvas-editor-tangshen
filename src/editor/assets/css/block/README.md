# Block CSS 目录说明

`assets/css/block/` 存放块级嵌入元素样式。

## 位置说明

- 所属层级：编辑器资源层 / block 样式
- 上游调用：`assets/css/index.css`
- 下游依赖：block DOM class

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `block.css` | block 宿主、iframe、video、html 等嵌入元素样式。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `block.css` | 无运行时函数 | 提供 block 视觉样式。 | block particle DOM |
