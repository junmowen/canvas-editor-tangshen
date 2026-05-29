# 目录位置容错回归失败

## 关联

- Spec：`cypress/e2e/issues/issue-catalog-position-miss.cy.ts`
- Test：`does not crash catalog worker after chunk typing`

## 失败现象

复跑失败：

```txt
AssertionError: expected 0 to be above 0
at cypress/e2e/issues/issue-catalog-position-miss.cy.ts:45:60
```

截图：

```txt
cypress/screenshots/issue-catalog-position-miss.cy.ts/目录位置容错 -- does not crash catalog worker after chunk typing (failed).png
```

## 初步判断

断言期望目录/标题相关位置或 worker 结果非空，但当前结果为 0。可能是 chunk typing 后 title/catalog 位置索引未重建，或测试依赖的目录数据生成入口已经变化。

优先检查：

- chunk typing patch 后是否调用 title/catalog 相关重建
- `Position` 中标题元素的 pageNo / rowIndex 是否仍可被目录 worker 读取
- 失败断言读取的具体数组是否已迁移到新字段

## 下一步

1. 输出失败点涉及的 catalog/title 数据结构。
2. 确认当前目录 worker 的权威读取入口。
3. 修复 chunk patch 后的目录位置同步，或更新测试到新入口。

