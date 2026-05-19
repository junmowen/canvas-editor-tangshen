# Issue 837 大文档输入刷新合并

## 关联

- GitHub issue：https://github.com/Hufe921/canvas-editor/issues/837
- Spec：`cypress/e2e/issues/issue-837-large-document-performance.cy.ts`
- Test：`coalesces rapid typing refreshes before repainting a 30-page document`

## 失败现象

复跑失败：

```text
AssertionError: coalesced render count: expected 0 to equal 1
at cypress/e2e/issues/issue-837-large-document-performance.cy.ts:177:55
```

截图：

```text
cypress/screenshots/issue-837-large-document-performance.cy.ts/issue #837 large document performance baseline -- coalesces rapid typing refreshes before repainting a 30-page document (failed).png
```

## 初步判断

测试期望快速输入触发一次合并后的 repaint，但统计值为 0。可能是刷新合并统计入口变化、输入预览路径绕过原统计、或 render scope 已被进一步收敛导致测试断言需要更新。

优先检查：

- `DrawRenderFacadeService` 输入态刷新路径
- `TypingPreviewRenderer` 与 render backend stats 的统计字段
- 快速输入后 `draw.getRenderBackendStats()` 的实际结构
- 该测试是否应断言“没有全量刷新”而不是固定合并次数为 1

## 下一步

1. 记录快速输入前后的完整 render stats。
2. 判断当前 0 次是否代表更优路径还是漏渲染。
3. 根据真实语义调整统计或测试断言。

