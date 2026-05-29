# Table Navigation 目录索引

`navigation/` 存放表格内横向、纵向、片段跨越和退格导航规则。

## 位置说明

- 所属业务：`table`
- 所属层级：键盘导航策略层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`event/keyboard/shared/horizontalMove.ts`、`event/keyboard/intents/VerticalNavigationIntent.ts`、`BackspaceIntent.ts`、`DeleteIntent.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableNavigationService.ts` | 表格导航服务门面，封装 target resolver 依赖 |
| `TableNavigationAlgorithms.ts` | 表格导航通用算法 |
| `TableNavigationHorizontal.ts` / `resolveTableHorizontalKeyboardMove.ts` | 表格横向边界和键盘移动 |
| `TableNavigationVertical.ts` / `resolveTableVerticalKeyboardMove.ts` | 表格纵向导航、跨单元格和入口跳转 |
| `TableNavigationFragment.ts` / `TableNavigationVerticalFragment.ts` | 分页 fragment 跨越 |
| `TableNavigationBackspace.ts` / `resolveTableBackspaceAtStart.ts` / `resolveTableDeleteFragmentTransition.ts` | 退格、删除和 fragment 边界跳转 |
| `TableNavigationEntry.ts` / `TableNavigationTypes.ts` | 表格入口导航和类型定义 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `resolveTableHorizontalKeyboardMove.ts` | `resolveTableHorizontalKeyboardMove(payload)` | 处理表格内左右键移动，并同步表格工具条状态。 | `event/keyboard/shared/horizontalMove.ts` |
| `resolveTableVerticalKeyboardMove.ts` | `resolveTableVerticalKeyboardMove(payload)` | 处理表格内上下键移动。 | `event/keyboard/intents/VerticalNavigationIntent.ts` |
| `resolveTableVerticalKeyboardMove.ts` | `resolveTableVerticalKeyboardFragmentTransition(payload)` | 处理上下键跨分页 fragment 的跳转。 | `VerticalNavigationIntent.ts` |
| `resolveTableVerticalKeyboardMove.ts` | `resolveTableVerticalKeyboardEntry(payload)` | 处理从正文进入表格的纵向入口。 | `VerticalNavigationIntent.ts` |
| `resolveTableBackspaceAtStart.ts` | `resolveTableBackspaceAtStart(payload)` | 光标位于表格片段起点时解析退格跳转。 | `event/keyboard/intents/BackspaceIntent.ts` |
| `resolveTableDeleteFragmentTransition.ts` | `resolveTableDeleteFragmentTransition(payload)` | Delete 跨 fragment 边界时解析跳转。 | `event/keyboard/intents/DeleteIntent.ts` |
| `TableNavigationService.ts` | `resolveFragmentTransitionIndex()` / `resolveHorizontalBoundaryNavigation()` / `resolveVerticalNavigation()` / `resolveBackspaceNavigation()` | 面向组件注册表的表格导航服务入口。 | `draw/runtime/DrawComponentRegistry.ts` 持有，键盘链路按需调用 |
| `TableNavigationAlgorithms.ts` | `createTablePositionContext()` / `resolveVerticalTargetSlice()` / `resolveHorizontalSiblingCell()` / `resolveVerticalSiblingCell()` | 创建表格 positionContext 并解析相邻单元格 / 目标 slice。 | 各导航策略文件 |
| `TableNavigationFragment.ts` / `TableNavigationVerticalFragment.ts` | `resolveFragmentTransitionIndex()` / `resolveVerticalFragmentTransition()` | 根据 fragment 和逻辑单元格关系解析跨页跳转索引。 | `TableNavigationService.ts` |

## 维护规则

- keyboard intent 只传入当前光标、range 和方向，不直接读取表格片段结构。
- 表格跨分页、跨单元格和表格入口跳转统一通过这里的服务或语义函数处理。
- Delete/Backspace 等键盘删除入口涉及的表格片段跳转也集中在这里。
