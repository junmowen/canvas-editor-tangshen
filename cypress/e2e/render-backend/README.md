# Cypress Render Backend E2E 目录索引

这个目录存放 Canvas 池、多渲染引擎、Worker 渲染和位图缓存相关专项用例。

| 文件模式 | 职责 |
| --- | --- |
| `canvas-render-backend.cy.ts` | 渲染后端专项汇总入口 |
| `canvas-render-backend.partN.ts` | 分片后的渲染后端场景 |

## 运行示例

```sh
npx cypress run --spec cypress/e2e/render-backend/canvas-render-backend.cy.ts
```
