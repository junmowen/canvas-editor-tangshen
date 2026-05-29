# Paragraph 目录索引

`paragraph/` 存放段落边界、段落选区和段落派生范围规则。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `clipboard/` | 段落粘贴清洗、换行和上下文继承规则 |
| `interaction/` | 段落选择、拖拽和键盘交互规则 |
| `layout/` | Tab 等段落基础元素的行内测量规则 |
| `render/` | 段落级格式标记和行内辅助绘制 |

## 维护规则

- 段落边界判断统一放在这里，包括零宽换段、列表连续性和标题连续性。
- 标题/列表锚点下的粘贴虚拟元素清洗放在 `clipboard/`。
- 段落级键盘副作用和上下文继承放在 `interaction/`。
- 段落格式标记绘制留在 `render/`，不要内联回 `draw/render/RowRenderer.ts`。
- 段落基础元素测量留在 `layout/`，不要内联回 `draw/layout/InlineElementLayout.ts`。
- event / range 可以调用这里的语义函数，不直接散写 `listId`、`listWrap`、`titleId` 边界规则。
- 段落内容的具体元素读取仍由调用方按自身上下文完成。

## 位置说明

- 所属层级：业务模块层 / 段落
- 上游调用：keyboard、range、clipboard、row render
- 下游依赖：`selection/`、`interaction/`、`clipboard/`、`layout/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `selection/` | 段落边界和段落选区解析。 |
| `interaction/` | 段落键盘、拖拽和上下文继承规则。 |
| `clipboard/` | 段落粘贴清洗。 |
| `layout/` | 段落基础元素测量。 |
| `render/` | 段落格式标记绘制。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `selection/ParagraphBoundaryPolicy.ts` | `isParagraphStartBoundary()` / `isParagraphEndBoundary()` | 判断段落边界。 | range、keyboard |
| `selection/resolveParagraphSelectionRange.ts` | `resolveParagraphSelectionRange()` | 解析三击段落选区。 | pointer selection |
| `clipboard/` / `interaction/` | paragraph helper | 粘贴清洗和键盘上下文规则。 | clipboard、keyboard |
| `render/` | paragraph render helper | 绘制段落格式标记。 | `RowRenderer` |
