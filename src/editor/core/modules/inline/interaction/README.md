# Inline Interaction 目录说明

`inline/interaction/` 存放超链接、日期等内联元素的指针副作用和全局清理。

## 位置说明

- 所属业务：`inline`
- 所属层级：业务交互层
- 上游调用：pointer intents、`GlobalEvent`
- 下游依赖：inline particle、draw、range

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `applyInlinePointerEffects.ts` | 根据指针命中触发内联元素弹层、跳转等副作用。 |
| `GlobalInlineEffects.ts` | 清理全局内联元素副作用。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `applyInlinePointerEffects.ts` | `applyInlinePointerEffects()` | 对命中的超链接、日期等内联元素应用指针副作用。 | `SelectionStartIntent.ts` |
| `GlobalInlineEffects.ts` | `clearGlobalInlineEffects(draw)` | 清理内联弹层和 hover 状态。 | `GlobalEvent.clearSideEffect()` |
