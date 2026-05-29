# Table Enum 目录说明

`dataset/enum/table/` 存放表格相关枚举。

## 位置说明

- 所属层级：编辑器数据定义层 / 表格枚举
- 上游调用：table 模块、interface
- 下游依赖：无运行时状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Table.ts` | 表格结构、边框、布局等枚举。 |
| `TableTool.ts` | 表格工具条操作枚举。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Table.ts` / `TableTool.ts` | enum 导出 | 提供表格相关稳定枚举值。 | table 模块、command |
