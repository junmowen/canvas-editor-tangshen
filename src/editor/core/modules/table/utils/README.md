# Table Utils 目录说明

`table/utils/` 存放表格通用遍历和单元格索引工具。

## 位置说明

- 所属业务：`table`
- 所属层级：业务工具层
- 上游调用：shared traversal、table layout、command 和 worker
- 下游依赖：table tr / td 数据结构

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableCellTraversal.ts` | 表格单元格遍历、方向遍历和按索引查找。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TableCellTraversal.ts` | `forEachTableCell()` | 遍历所有表格单元格。 | table layout、shared traversal |
| `TableCellTraversal.ts` | `forEachTableCellByDirection()` | 按指定方向遍历单元格。 | table navigation |
| `TableCellTraversal.ts` | `resolveTableCellByIndex()` | 根据 row / col 索引解析单元格。 | command、hittest、layout |
