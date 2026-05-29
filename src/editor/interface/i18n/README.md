# I18n Interface 目录说明

`interface/i18n/` 存放国际化语言包接口。

## 位置说明

- 所属层级：编辑器接口层 / i18n
- 上游调用：i18n runtime、register API、外部类型导出
- 下游依赖：无运行时状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `I18n.ts` | 语言包结构和语言 key 类型。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `I18n.ts` | interface / type 导出 | 提供语言包类型约束，无运行时函数。 | `extension/i18n`、register |
