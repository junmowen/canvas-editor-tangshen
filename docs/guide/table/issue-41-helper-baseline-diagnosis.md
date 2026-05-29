# #41 表格分页 Helper 基线失效诊断

## 1. 目的

这份文档用于回答一个更具体的问题：

> `table-pagination-input.cy.ts` 当前的失败，更多是测试 helper 基线失效，还是实现行为真的回归？

结论先说：

> 当前更像是“测试 helper 仍带有旧主链假设”，至少前半组失败点优先应先从 helper 基线漂移查起，而不是立刻判定分页实现整体回归。

---

## 2. 这次重点看的 helper

本次重点看了这些 helper：

1. `getCursorClickPoint`
2. `getTableCursorClickPoint`
3. `findCrossPageTableSelectionPoints`
4. `findPagedTableBoundaryPoints`
5. `setPagedTableCursor`

以及当前命令主链：

1. `CommandAdapt.setRange`
2. `CommandAdapt.setPositionContext`

---

## 3. 关键诊断结论

## 3.1 helper 仍然强依赖“直接 setRange 就能得到稳定 cursor 投影”

最明显的点是：

- `setPagedTableCursor`

当前实现只有一行：

```ts
editor.command.executeSetRange(index, index, tableId, 0, 0, 0, 0)
```

问题在于：

1. 它只传了 `tableId`
2. 它把 `startTdIndex/endTdIndex/startTrIndex/endTrIndex` 全部硬编码成 `0`
3. 它没有显式同步 `positionContext`

而当前真实命令主链已经不是旧的“只靠 index 就能稳定还原表格上下文”：

- `CommandAdapt.setRange`
- `CommandAdapt.setPositionContext`

当前主链会：

1. 结合 `tableId + trIndex + tdIndex + absoluteIndex`
2. 通过 snapshot 去解析逻辑 cell 和 fragment cell
3. 再回写 `positionContext`

这意味着：

> `setPagedTableCursor()` 现在很可能只是在“把 range 落到某个绝对索引”，但没有给测试提供足够稳定的表格上下文。

对失败的影响：

1. `backspace/delete/up/down/left/right` 这类边界行为测试，都可能先被错误的起始 caret 污染

---

## 3.2 helper 仍然强依赖“公开 cursor pageNo”是稳定命中点来源

`getCursorClickPoint()` 和 `getTableCursorClickPoint()` 当前是这么做的：

1. 先通过 `executeSetRange(...)` 改位置
2. 再直接读 `editor.command.getCursorPosition()`
3. 用 cursor 的 `pageNo / coordinate` 反推点击点

对应位置：

- `getCursorClickPoint`
- `getTableCursorClickPoint`

问题在于：

当前项目最近对这些链路做过大量重构：

1. public cursor
2. raw boundary
3. selection start state
4. fragment/page 迁移

这些在：

- [table-refactor-plan.md](./table-refactor-plan.md)
- [draw-refactor-plan.md](../architecture/draw-refactor-plan.md)

都有明确记录。

这意味着：

> 测试 helper 还在假设“只要 public cursor 对了，点击点就一定对”，但当前主链里 public cursor 已经是投影结果，不再天然等价于最适合作为再次命中的 click point。

对失败的影响：

1. later page 点击后 caret 不在点击页
2. 跨页选择的 start/end point 为空
3. gap point 为空

这类问题更像 click point helper 失效，而不是业务链必然回归。

---

## 3.3 helper 带有过强的页码假设

例如：

- `findCrossPageTableSelectionPoints`

它的核心判断是：

1. point 页码要大于 previousPoint
2. `previousPoint.pageNo >= 1`

这意味着它默认假设：

1. 可用跨页选择点必须从第 `1` 页之后开始
2. earlier page 的点不再被视为有效起点

这类条件非常容易随着：

1. 页面高度变化
2. layout 变化
3. fragment 起点移动

而整体失效。

也就是说：

> 一旦分页断点位置发生轻微偏移，这类 helper 会直接返回 `null`，从而制造 `expected null to not equal null` 级失败。

这更像测试构造规则过刚，而不是业务逻辑直接坏了。

---

## 3.4 helper 里硬编码 `td/tr = 0` 的假设已经过时

在这些 helper 里都能看到同类写法：

1. `startTdIndex: 0`
2. `endTdIndex: 0`
3. `startTrIndex: 0`
4. `endTrIndex: 0`

典型位置：

- `getTableCursorClickPoint`
- `setPagedTableCursor`

这在早期“单表、单 cell、单主链”时代问题不大。  
但当前项目已有大量：

1. fragment table
2. logical table
3. later fragment
4. sibling cell
5. merged cell

相关主链。

因此这类硬编码至少对下面这些测试是不稳的：

1. sibling cell 污染
2. later page fragment click
3. 同页与跨页 selection point 推导

---

## 4. 当前更像 helper 失效的测试

先从失败类型看，下面这些更像 helper 失效优先：

1. later page 点击后 caret 定位
2. later page 点击页码一致性
3. 跨页普通文本选择
4. 分页表格跨页选择
5. 跨页 gap 选择

原因：

1. 它们都先依赖 click point / selection point / gap point 构造
2. 日志里已有 `null` 断言失败

---

## 5. 当前更像真实行为回归的测试

下面这些更可能是行为链本身也有问题：

1. backspace 跨页边界
2. delete 跨页边界
3. up/down 跨页边界
4. sibling cell 文本污染

但要注意：

> 如果起始 caret 本身就不是 helper 预期的那个位置，这些行为断言也会被连带污染。

所以仍然不建议跳过 helper 层直接修行为层。

---

## 6. 推荐的下一步

### 第一步：先把 helper 变得更贴近当前主链

优先改这些 helper，而不是先改业务代码：

1. `setPagedTableCursor`
2. `getTableCursorClickPoint`
3. `findCrossPageTableSelectionPoints`
4. `findPagedTableBoundaryPoints`

改动方向：

1. 不再硬编码 `td/tr = 0`
2. 尽量直接利用 snapshot / 当前 cell slice
3. 不再把 public cursor click point 当成唯一命中入口

### 第二步：helper 稳定后再重跑 `table-pagination-input.cy.ts`

只有 helper 稳下来之后，才值得看：

1. 删除链
2. 导航链
3. 选区污染链

### 第三步：最后再决定哪些是实现回归

如果 helper 修正后，仍然失败的项，再进入真实代码修复。

---

## 7. 结论

当前 `#41` 这组失败不能直接读成“表格分页实现坏了”。  
更准确的判断是：

1. 测试 helper 明显带有旧主链假设
2. 尤其是 `setRange -> public cursor -> click point` 这条测试构造路径，和当前 snapshot / fragment 主链已经不完全对齐
3. 因此前半组失败应优先按“helper 基线失效”处理

这意味着后续最值钱的工作不是立刻改业务代码，而是：

> 先把 `table-pagination-input.cy.ts` 的 helper 体系升级到当前主链语义。
