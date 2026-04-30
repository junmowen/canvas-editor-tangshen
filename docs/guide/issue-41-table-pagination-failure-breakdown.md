# #41 表格分页失败点拆解

## 1. 目的

这份文档用于承接当前 `#41` 自动化验证里最明确的失败主线：

> `cypress/e2e/menus/table-pagination-input.cy.ts`

前面的自动验证已经说明：

1. 自动化脚本本身可用
2. `#94`、`#1399` 已能独立通过
3. 当前最重的真实失败主线仍然是 `#41`

因此这里不再泛泛讨论表格分页，而是把当前失败点拆成可执行问题列表。

---

## 2. 已知失败来源

从已有日志看，当前失败集中在：

- [table-pagination-input.cy.ts](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts)

当前可以明确分成三个阶段看：

### 第一轮旧结果

1. `13` 个测试
2. `4` 个通过
3. `9` 个失败

### 第一轮 helper 收口后

1. `34` 个测试
2. `23` 个通过
3. `11` 个失败

### 第二轮 later-fragment helper 收口后

1. `34` 个测试
2. `26` 个通过
3. `8` 个失败

### 第三轮公开 range 语义收口后

1. `34` 个测试
2. `32` 个通过
3. `2` 个失败

### 第四轮 later fragment 起始光标导航收口后

1. `34` 个测试
2. `34` 个通过
3. `0` 个失败

这说明：

1. 前一轮大批失败里，确实有相当一部分是 helper 基线失效
2. helper 两轮收口后，失败数从 `28` 级别收敛到了 `8`
3. 公开 range 改为逻辑单元格索引后，跨页删除、跨页左右/上下边界、反向拖选、later fragment 首字符与 CJK 首字符均已转绿
4. later fragment 起始光标的垂直往返与右箭头移动已经转绿，`table-pagination-input.cy.ts` 当前全绿

---

## 3. 本轮已收掉的最后 2 个失败点

在公开 range 断言改为逻辑单元格索引，并为表格文本拖选补充右边界命中语义后，`table-pagination-input.cy.ts` 当前剩余：

### 3.1 later fragment 起始光标上下往返

对应测试：

- `still moves up and down from the later fragment start caret position`

当前失败形态：

1. 从 later fragment 起始光标按上箭头能进入前页
2. 再按下箭头没有回到原 later fragment 页

当前状态：

1. 已修复
2. `up -> down` 能回到 later fragment 起始页与原公开 range

### 3.2 later fragment 起始光标右箭头

对应测试：

- `moves right from the later fragment start without skipping characters`

当前失败形态：

1. 起始光标按右箭头后公开 range 投影为 `0`
2. 预期应从真实点击落点前进一个逻辑字符

当前状态：

1. 已修复
2. 右箭头不再跳回公开 range `0`，会从 later fragment 起始光标前进一个逻辑字符

---

## 4. 已转绿的旧 8 个失败点

以下保留旧失败拆解，用于说明本轮收口范围。

在 helper 改成 snapshot 语义、later-fragment 点位也继续收口后，`table-pagination-input.cy.ts` 当前剩余失败点可先收束为这 `8` 条：

### 3.1 backspace 跨分页边界行为异常

对应测试：

- `still moves backspace across paged table boundaries`

关键断言位置：

- [table-pagination-input.cy.ts:861](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:861)

当前失败形态：

1. `expected 1 to equal 0`

含义：

1. backspace 后 `range.startIndex` 没有落到预期边界

### 3.2 delete 跨分页边界行为异常

对应测试：

- `still moves delete across paged table boundaries`

关键断言位置：

- [table-pagination-input.cy.ts:890](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:890)

当前失败形态：

1. `expected 0 to be above 0`

含义：

1. delete 后 range 起点没有进入预期位置

### 3.3 up/down 跨分页边界导航异常

对应测试：

- `still moves arrow keys across paged table boundaries`

关键断言位置：

- [table-pagination-input.cy.ts:930](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:930)

当前失败形态：

1. `expected 2 to be above 2`

含义：

1. `down` 没能跨到下一页 fragment

### 3.4 later page 左箭头回前页失败

对应测试：

- `still moves left arrow from a later page back to an earlier page`

关键断言位置：

- [table-pagination-input.cy.ts:1701](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:1701)

当前失败形态：

1. `expected 1 to equal 0`

### 3.5 earlier page 右箭头进后页失败

对应测试：

- `still moves right arrow from an earlier page into a later page`

关键断言位置：

- [table-pagination-input.cy.ts:1733](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:1733)

当前失败形态：

1. `expected 0 to equal 39`

### 3.6 later page 向前拖选回 earlier page 失败

对应测试：

- `still supports dragging selection from a later page back to an earlier page`

关键断言位置：

- [table-pagination-input.cy.ts:1890](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:1890)

当前失败形态：

1. `expected 0 to be above 0`

### 3.7 later fragment 首行第一个字符选区偏 1 位

对应测试：

- `selects the first character in a later paged fragment first row`

关键断言位置：

- [table-pagination-input.cy.ts:2243](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:2243)

当前失败形态：

1. `expected '6' to equal '7'`

含义：

1. first-row 首字符选择仍有 off-by-one

### 3.8 later fragment 首行第一个 CJK 字符选区偏移

对应测试：

- `selects the first CJK character in a later paged fragment first row`

关键断言位置：

- [table-pagination-input.cy.ts:2327](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts:2327)

当前失败形态：

1. `expected '热' to equal '或'`

---

## 4. 失败点分组

到了当前阶段，这 `8` 条已经更适合按“行为类型”分组，而不是按 helper/非-helper 分组。

## 4.1 跨分页边界移动与删除组

包含：

1. 3.1
2. 3.2
3. 3.3
4. 3.4
5. 3.5

共同特征：

1. 都是 collapsed caret 或边界 navigation 行为
2. 都在 later/earlier page fragment 交界附近触发
3. helper 收口后仍稳定失败

这组现在更像真实行为问题。

## 4.2 later fragment 首字符与拖选起点组

包含：

1. 3.6
2. 3.7
3. 3.8

共同特征：

1. 仍然和 fragment 首行起点的边界语义有关
2. 但 helper 继续修正后仍然未消失

这组更像“测试点位与真实边界规则之间仍有 1 格差异”，同时也可能反映真实首字符边界行为问题。

---

## 5. 这轮 helper 修正带来的直接收益

在 helper 改成 snapshot 语义，并继续收口 later-fragment 点位后，已经确认：

1. `table-pagination-input.cy.ts` 通过数先从 `6` 提升到 `23`
2. 再从 `23` 提升到 `26`
3. `null` 级失败已经大幅收缩
4. later page 点击、跨页普通选择、跨页 gap 选择、双击整 cell、later page only 选择、later fragment 基础上下移动、inner-line-start 向上、same-char 再拖选等场景都已经转绿

这进一步支持了前一份诊断结论：

> 旧 helper 基线失效，确实是这条 spec 大面积失败的重要来源。

---

## 6. 相关 spec 的额外收口

与此同时：

- [table-pagination-mock.cy.ts](/D:/canvas-editor/cypress/e2e/menus/table-pagination-mock.cy.ts)

里因为 facade 删除导致的测试壳层问题：

1. `draw.getTableTool is not a function`

也已经修复，当前该 spec 重新全绿：

1. `13` 个测试
2. `13` 个通过
3. `0` 个失败

---

## 7. 下一步建议

当前最值得做的已经不是继续大改 helper，而是分两批直攻剩余行为问题：

### 第一批：跨分页边界移动与删除

优先顺序：

1. 3.1
2. 3.2
3. 3.3
4. 3.4
5. 3.5

建议先看：

1. [BackspaceIntent.ts](/D:/canvas-editor/src/editor/core/event/keyboard/intents/BackspaceIntent.ts)
2. [DeleteIntent.ts](/D:/canvas-editor/src/editor/core/event/keyboard/intents/DeleteIntent.ts)
3. [VerticalNavigationIntent.ts](/D:/canvas-editor/src/editor/core/event/keyboard/intents/VerticalNavigationIntent.ts)
4. [KeyboardNavigationIntent.ts](/D:/canvas-editor/src/editor/core/event/keyboard/intents/KeyboardNavigationIntent.ts)
5. [horizontalMove.ts](/D:/canvas-editor/src/editor/core/event/keyboard/shared/horizontalMove.ts)

### 第二批：later fragment 首字符边界

优先顺序：

1. 3.6
2. 3.7
3. 3.8

这批更可能涉及：

1. later fragment 首字符左半区/右半区边界语义
2. selection start boundary
3. CJK 首字符命中与范围投影

---

## 8. 结论

当前 `#41` 的主结论已经很明确：

1. helper 层的大头已经收掉
2. 表格分页测试不再是“几乎全灭”，而是稳定收敛到 `8` 个核心失败
3. 后续修复重点应该正式转向真实行为问题，而不是继续把时间花在大面积测试基线漂移上
