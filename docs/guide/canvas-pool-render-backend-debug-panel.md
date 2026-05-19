# Canvas 渲染后端调试面板

这份文档说明如何打开渲染后端性能统计面板，以及如何读取完整调试快照。

## 开启方式

在初始化编辑器时打开 `renderBackend.debugPanel.enabled`：

```ts
const editor = new Editor(container, data, {
  renderBackend: {
    debugPanel: {
      enabled: true
    }
  }
})
```

## 页面上怎么看

开启后，面板会显示在编辑器视口右下角，位于底部工具栏上方。

当前显示的是压缩后的摘要，包含：

- 页面数
- backend 渲染统计
- worker 统计
- bitmap cache 统计
- 总内存估算
- `documentTextStore` mirror 健康度

## 控制台怎么看完整数据

在浏览器控制台执行：

```js
window.editor.getRenderBackendDebugSnapshot()
```

返回内容会包含：

- `backend`
- `worker`
- `baseRenderSource`
- `typingPreview`
- `image`
- `memory`
- `documentTextStore`

## 重置统计

```js
window.editor.resetRenderBackendStats()
```

会清空计数和高水位基线，但不会释放当前页面资源。

## 常见看不到面板的原因

1. `renderBackend.debugPanel.enabled` 没有打开。
2. 页面没有刷新到最新构建。
3. 底部工具栏遮挡了旧位置。当前实现已经固定到视口右下角，正常情况下不会再被遮住。
4. 如果你在自己的业务容器里集成，容器样式把编辑器根节点裁掉了，可以检查外层 `overflow` 和高度设置。

## 相关入口

- [Canvas 池与多引擎渲染后端](./canvas-pool-render-backend-plan.md)
- [渲染引擎收口](./canvas-pool-render-backend-render-engine.md)
