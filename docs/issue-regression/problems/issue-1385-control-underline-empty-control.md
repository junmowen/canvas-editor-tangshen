# Issue 1385 空控件继承下划线

## 关联

- GitHub issue：https://github.com/Hufe921/canvas-editor/issues/1385
- Spec：`cypress/e2e/issues/issue-1385-control-underline.cy.ts`
- Test：`inherits pending underline style when inserting an empty control`

## 失败现象

复跑失败：

```txt
TypeError: Cannot read properties of undefined (reading 'coordinate')
at cypress/e2e/issues/issue-1385-control-underline.cy.ts:289:23
```

截图：

```txt
cypress/screenshots/issue-1385-control-underline.cy.ts/issue #1385 - control underline rendering -- inherits pending underline style when inserting an empty control (failed).png
```

## 初步判断

测试在插入空控件后读取目标 position，但该 position 不存在。可能是插入后的控件没有生成布局位置、索引预期变化、或测试假设的 position index 已不匹配当前数据结构。

优先检查：

- 空控件插入后的 elementList 和 positionList 长度
- `Control` 插入逻辑是否保留 pending underline 样式
- `Position.computePageRowPosition` 对空控件、隐藏控件、控制组件的坐标生成
- 测试是否应先按 controlId 查 position，而不是固定索引

## 下一步

1. 在测试失败点输出插入后的 elementList / positionList 摘要。
2. 确认产品语义：空控件是否必须产生可命中的 position。
3. 若语义成立，修复布局；若只是测试索引脆弱，改为按控件标识查找。

