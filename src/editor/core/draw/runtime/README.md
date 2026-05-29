# Draw Runtime 目录说明

`runtime/` 存放 draw 层的运行时容器和注册表，集中持有组件、服务、状态和生命周期。

## 位置说明

- 所属层级：公共绘制层 / 运行时装配层
- 上游调用：`Draw.ts`
- 下游依赖：`modules/**`、`event/**`、`range/**`、`render-backend/**`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawRuntime.ts` | 保存模式、选项、正文、布局状态、表格快照、画笔和打印态。 |
| `DrawServiceRegistry.ts` | 创建并持有 draw 公共服务实例。 |
| `DrawComponentRegistry.ts` | 创建并持有业务模块和运行时组件实例。 |
| `DrawLifecycleService.ts` | 销毁 draw 相关副作用和资源。 |
| `DrawPainterService.ts` | 画笔样式读取、写入和默认 range 设置。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawRuntime.ts` | `getMode()` / `replaceMode()` / `getOptions()` | 读取和替换运行时模式与配置。 | `Draw.ts`、状态查询 |
| `DrawRuntime.ts` | `getDocumentTextStore()` / `replaceMainElementList()` / `syncEditor2DocumentTree()` | 管理正文数据和 document tree 同步。 | data、mutation、外部 API |
| `DrawRuntime.ts` | `replaceLayoutState()` / `replaceTableLayoutSnapshot()` | 写入布局结果和表格快照。 | `DrawLayoutPipeline.ts` |
| `DrawRuntime.ts` | `replacePainterState()` / `replacePrintModeData()` | 保存画笔和打印态。 | painter、export |
| `DrawServiceRegistry.ts` | `constructor` | 装配 layout、render、data、viewport、coordinate 等公共服务。 | `Draw.ts` 初始化 |
| `DrawComponentRegistry.ts` | `constructor` | 装配模块、粒子、事件、观察器和业务组件。 | `Draw.ts` 初始化 |
| `DrawLifecycleService.ts` | `destroy()` / `clearSideEffect()` | 清理事件、观察器、canvas、模块副作用。 | `Draw.destroy()`、`Draw.clearSideEffect()` |
| `DrawPainterService.ts` | `getPainterStyle()` / `setPainterStyle()` / `setDefaultRange()` | 管理格式刷样式和默认选区。 | `Draw.ts`、事件链路 |
