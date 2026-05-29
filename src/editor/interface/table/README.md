# Table Interface 目录说明

`interface/table/` 存放表格数据结构接口。

## 位置说明

- 所属层级：编辑器接口层 / table
- 上游调用：table 模块、draw layout、外部类型导出
- 下游依赖：元素接口和表格枚举

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Table.ts` | 表格整体配置和结构接口。 |
| `Tr.ts` | 表格行接口。 |
| `Td.ts` | 表格单元格接口。 |
| `Colgroup.ts` | 表格列宽接口。 |
| `TableFragment.ts` | 跨页表格 fragment 接口。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `*.ts` | interface / type 导出 | 提供表格结构类型约束，无运行时函数。 | table layout、render、command |
