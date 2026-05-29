# Dataset 目录索引

`src/editor/dataset/` 存放枚举、常量和默认数据。

| 目录 | 职责 |
| --- | --- |
| `enum/` | Editor、Element、Control、Row、List、Table 等枚举 |
| `constant/` | 默认常量、正则、菜单 key、页面配置等 |

## 维护规则

- 业务分支判断优先使用枚举，避免散落字符串。
- 固定 key、默认值和正则优先放入 `constant/`。
- 新增对外枚举后，确认是否需要从 `src/editor/index.ts` 导出。

## 位置说明

- 所属层级：编辑器数据定义层
- 上游调用：core、interface、utils、外部导出
- 下游依赖：无运行时业务依赖

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `constant/` | 默认配置、尺寸、正则、快捷键、菜单等常量。 |
| `enum/` | 编辑器模式、元素类型、事件、表格等枚举。 |

## 函数说明

| 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `constant/` | 常量导出 | 提供默认配置和固定值。 | core、utils、外部导出 |
| `enum/` | enum 导出 | 提供稳定枚举类型和值。 | core、interface、外部导出 |
