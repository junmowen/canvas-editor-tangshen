# Command 目录索引

`command/` 存放对外命令门面和命令适配入口。

## 位置说明

- 所属层级：命令适配公共层
- 主要下钻：`CommandAdaptBase.ts`、`CommandAdaptCore.ts`、`CommandAdaptDomain.ts`、`CommandAdaptMedia.ts`、`CommandAdaptQuery.ts`、`CommandAdaptRichText.ts`、`CommandAdaptSearch.ts`、`CommandAdaptTable.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Command.ts` | 对外命令门面 |
| `CommandAdapt*.ts` | 按能力拆分的命令实现 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Command.ts` | 构造和对外 `execute*` / `get*` 方法 | 将命令门面绑定到具体 adapt 实现。 | 外部 API |
| `CommandAdaptDomain.ts` | 分组、区域和页面结构相关命令 | 处理 group / area / page element。 | `Command` 门面 |
| `CommandAdaptMedia.ts` | 图片、超链接、分页符和水印命令 | 处理媒体类命令。 | `Command` 门面 |
| `CommandAdaptRichText.ts` | 富文本装饰、列表和页码命令 | 处理 richtext 命令。 | `Command` 门面 |
| `CommandAdaptTable.ts` | 表格插入、编辑和格式命令 | 处理表格命令。 | `Command` 门面 |

