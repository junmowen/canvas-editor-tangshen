# 14.6 Worker 基础 Roadmap

实施顺序：

1. 已完成：OffscreenCanvas 灰度入口先只允许非当前页 base 进入 worker 优先级，当前页、光标页、选区边界页和 overlay 仍留在主线程同步路径。
2. 已完成：WebGL 只接独立图片任务，不接管正文文本；运行时开关动态生效，默认关闭。
3. 已完成：DOM / SVG 只接外部 block host 任务，不和正文 canvas 共用生命周期，也不参与 base bitmap cache；运行时开关动态生效，默认关闭。
4. 已完成：`RenderBackendManager` 增加 engine 耗时、失败次数、回退次数、最大单任务耗时统计。
5. 已完成基础统计：`Draw.getRenderBackendStats()` 已暴露每页 engine、capability、bitmap 命中、chunk dirty、异步队列和后台粘贴进度；后续 debug 面板只需读取该统计结构。
6. 已完成 P0 垂直切片：`PageRenderSnapshotBuilder` 覆盖普通文本页背景和正文文本；不能序列化的内容显式回退 Canvas2D。
7. 已完成 P0 垂直切片：新增 worker 消息协议和 `offscreenRender.worker.ts`，worker 消费纯快照并返回 `ImageBitmap`。
8. 已完成 P0 垂直切片：新增 `WorkerRenderScheduler`，实现每页最新 job、超时、过期丢弃和 Canvas2D fallback。
9. 已完成 P0 垂直切片：新增 worker bitmap 合成路径，校验 layoutVersion、baseVisualVersion、DPR 和尺寸后再合成，否则丢弃。
10. 已完成核心五第一批：snapshot 覆盖简单页眉页脚文本、页码、非重复文字水印、行号、页边框、页边距标记和简单分隔线。
11. 已完成核心五第二批：snapshot 覆盖普通表格背景 / 边框 / 单元格文本、普通图片、列表标记、基础 checkbox / radio 和控件文本边框。
12. 已完成核心六第一批：补 worker 单并发上限、同页主动取消、队列上限、队列丢弃 fallback 和连续失败熔断。
13. 已完成核心六第二批：补滚动方向优先级，并区分 cache compose、worker compose 和 Canvas2D render 三种 base 来源。
14. 已完成核心七第一批：为 WebGL 增加独立图片任务，不碰正文文本；为 DOM / SVG 增加 block host 任务，不参与 base bitmap cache。
15. 已完成核心七第二批：补 WebGL context lost 后 Canvas2D fallback 回归，补 DOM / SVG block 页面卸载清理、重挂和 bitmap cache 命中后的 host 重放。
16. 已完成核心八第一批：搜索活动态和激活控件页在调度前即归为交互页，base 保持 `sync` + `canvas-2d-render`，不进入 worker，也不会被 worker bitmap 覆盖。
17. 已完成核心八第二批：补 worker 不支持命令、超时、队列丢弃和连续失败熔断的浏览器回归；fallback 后不产生 backend miss，熔断后 OffscreenCanvas 不再匹配任务。
18. 已完成核心八第三批：补 WebGL 图片导出和 DOM / SVG block 导出 fallback，导出期间不命中 `webgl` / `svg-dom`，统一通过 Canvas2D export surface 固化输出。
19. 已完成核心八第四批：补真实门诊模板 100 / 500 页 worker 观测，验证 worker 命中率、bitmap 写入来源、fallback 原因、熔断状态和队列清空均可观测。
