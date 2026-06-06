# 迁移风险、指标与落地约束

## 8. 关键风险

### 8.1 canvas 状态污染

canvas 复用后，`ctx` 状态如果没有完整重置，会出现字体、透明度、clip、transform 串页问题。

处理方式：

1. `CanvasPool.release()` 统一 reset。
2. `RenderEngine.render()` 开始前再次设置必要状态。
3. 禁止业务渲染器假设 ctx 初始状态。

### 8.2 DPR 和缩放变化

缩放、纸张尺寸、DPR 变化会导致 backing store 失效。

处理方式：

1. surface 记录 `width` / `height` / `dpr`。
2. 只有尺寸变化时才 resize。
3. resize 后必须重新初始化 ctx。
4. 旧 bitmap cache 全部失效。

### 8.3 导出一致性

导出不能依赖当前可视页挂载状态。

处理方式：

1. export 使用独立 `EXPORT` layer。
2. 导出时按页申请 export surface。
3. 导出结束立即 release export surface。
4. 不再替换主编辑态的 page / ctx 数组。

### 8.4 多引擎输出差异

不同引擎的字体度量、抗锯齿、图片插值可能不同。

处理方式：

1. 正文主链先保持 Canvas2D。
2. OffscreenCanvas 只用于同等 2D API 的后台绘制。
3. WebGL 优先用于图片类能力，不直接替代正文文字。
4. 快照测试覆盖导出和可视渲染差异。

## 9. 性能指标

建议新增以下指标：

| 指标 | 目标 |
| --- | --- |
| 活跃 canvas 数量 | 接近可视页数量 x layer 数 |
| canvas 池命中率 | 滚动场景稳定后大于 80% |
| 单次滚动长任务 | 明显少于当前基线 |
| overlay 刷新耗时 | 高频交互稳定在单帧预算内 |
| base 重绘次数 | 静态页反复进出视口时下降 |
| 导出峰值内存 | 不随可视页 canvas 池无限增长 |

## 10. 建议落地顺序

推荐先做最小闭环：

1. 新建 `CanvasPool`，复制当前 `PageCanvasHost.canvasPool` 能力。
2. 新建 `RenderSurfaceManager`，承接 `mountCanvas()` / `unmountCanvas()`。
3. `PageCanvasHost` 只保留 DOM host 与 page wrapper 管理。
4. 保留过渡 getter，避免一次性改动所有渲染器。
5. 再把 `PageRenderer`、`TableOverlayRenderer`、`DrawExportService` 迁到 surface API。
6. 最后接入 `RenderBackendManager` 和引擎选择。

这样可以先得到 canvas 池独立化收益，同时把大规模多引擎改造拆成可验证的小步。

## 11. 代码注释约束

后续按本方案生成或修改代码时，必须满足中文注释约束：

1. 类必须有中文注释，说明职责和边界。
2. 函数必须有中文注释，说明入参、返回值和副作用。
3. 属性必须有中文注释，说明保存的数据、生命周期和是否为过渡字段。
4. 关键代码块必须有中文注释，说明为什么这样处理，而不只描述代码表面行为。
5. 多引擎、池化、导出、DPR、canvas 状态重置相关代码必须优先补注释。
