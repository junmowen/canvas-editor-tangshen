# 14.6 Worker Snapshot 覆盖范围与验收

第一轮 worker snapshot 覆盖范围：

1. 已覆盖：页面背景色、页面背景图片、普通文本、TAB 占位、分散 / 两端对齐文本、编辑态换行标记、分页符辅助标记、正文高亮 / 下划线 / 删除线、上标 / 下标、超链接、日期、自定义字宽 / 字间距、静态 area 背景 / 边框、隐藏 area / 隐藏元素 / 隐藏控件的非设计态跳过、非活动与活动 group 行内装饰、group / area / control 包裹的非文本元素、普通段落、空文档占位符、简单页眉页脚文本、页码、非重复与重复文字水印、非重复与重复图片水印、行号、页边框、页边距标记、简单分隔线、列表标记、基础 checkbox / radio、控件文本边框、普通图片、浮动图片、文档签章 / badge、LaTeX SVG path、基础表格背景 / 边框 / 单元格文本、fragment 单元格裁剪、复杂表格外框加粗 / 虚线 / 斜线 / 显式单元格边框。
2. 暂不覆盖：活动选区、光标、搜索高亮、控件高亮、表格工具、复杂控件编辑态、iframe / video / 外部交互 block 的 base worker 绘制、缺失资源、非法 / 未测量表格结构和嵌套表格。
3. 遇到暂不覆盖内容时，如果该内容影响 base，整页回退 Canvas2D；如果只影响 overlay，base 仍可走 worker。
4. worker 绘制结果只负责 base，overlay 永远主线程绘制。

验收标准：

1. 已验收：关闭新 engine 开关后，行为完全回到当前 Canvas2D 路径，render-backend 专项默认路径 failure / 回退 均为 0。
2. 已验收基础闭环：实验 engine 绘制失败会自动回退主线程 Canvas2D，不影响页面正确性；后续 OffscreenCanvas worker 接入时复用同一 回退 机制。
3. 已验收：非当前页 base 在 OffscreenCanvas 灰度开关开启后可进入 `worker` 优先级并命中 worker probe；当前页 base 仍是 `sync` + `canvas-2d`。
4. 已验收：overlay 仍保持 `sync` + `overlay-2d`，不会被 worker probe 或实验 base engine 抢占。
5. 已验收：capability list 中 OffscreenCanvas / WebGL / SVG-DOM 默认关闭，可通过统计确认灰度状态。
6. 已验收 P0：关闭复杂装饰后的普通文本非当前页 base 可命中真实 `offscreen-canvas`，worker 成功后页面像素非空。
7. 已验收 P0：当前页 base 仍是 `sync` + `canvas-2d`，overlay 仍是 `sync` + `overlay-2d`。
8. 已验收 P0：复杂装饰页开启 OffscreenCanvas 后会回退 Canvas2D，不产生 backend miss 或空白页。
9. 已验收 P0 扩展：默认示例装饰页包含简单页眉、页脚、页码和非重复文字水印时，非当前页 base 可命中真实 `offscreen-canvas` 并合成非空页面。
10. 已验收 P0 扩展：重复文字水印由 worker 侧 pattern 命令绘制，非当前页 base 可命中真实 `offscreen-canvas`，不再回退 Canvas2D。
11. 已验收调度核心：同页重复 worker 调度会取消旧任务并只保留最新任务，pending / active / queue 最终清空，不覆盖新页面。
12. 已验收核心：列表、基础控件、普通图片和基础表格可进入真实 worker 快照，worker 成功后无 回退、无 backend miss。
13. 已验收核心：WebGL 图片任务和 DOM / SVG block 任务通过独立 reason 命中各自 engine，默认关闭且不抢占正文 canvas。
14. 已验收核心：worker 队列按滚动方向优先处理前方可视页，统计暴露 `priorityReorderCount`。
15. 已验收核心：base 来源统计可区分 `canvas-2d-render`、`worker-render` 和 `bitmap-cache-compose`，bitmap cache 也能拆分同步 Canvas2D 与 worker 结果来源。
16. 已验收核心：当前页输入、选区边界页、搜索高亮和控件编辑页不会进入 worker；搜索态整页保持同步 base，激活控件所在页来源为 `canvas-2d-render`，不会被 worker bitmap 覆盖。
17. 已验收核心：WebGL context lost 后自动回退 Canvas2D，DOM / SVG block 页面卸载、重挂和 bitmap cache 命中后均能恢复 host。
18. 已验收核心：worker 不支持命令、超时、队列丢弃时回退 Canvas2D 且 miss 为 0；连续失败熔断后 OffscreenCanvas engine 不再匹配任务。
19. 已验收核心：100 / 500 页门诊模板开启 OffscreenCanvas 后，非当前页 worker 命中、worker bitmap 写入来源、回退 原因、熔断状态和队列清空均可观察；当前专项先验证稳定命中和无 miss，主线程长任务收益继续交给后续压测面板量化。
20. 已验收核心：DOM / SVG block 导出 回退 明确，WebGL 图片导出显式不走 WebGL，导出结果通过 Canvas2D transient surface 固化。
21. 已验收核心：图片水印和空文档占位符页可进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
22. 已验收核心：WebGL 图片任务会复用同源纹理缓存，并按 `maxTextureCacheSize` 淘汰旧纹理；`textureUploadCount`、`textureReuseCount`、`textureEvictCount` 均可从 capability 观测。
23. 已验收核心：文档签章 / badge 可进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
24. 已验收核心：正文高亮、下划线和删除线可进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
25. 已验收核心：上标 / 下标、超链接、日期、自定义字宽 / 字间距可进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
26. 已验收核心：静态 area 背景 / 边框和非活动 group 行内装饰可进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
27. 已验收核心：WebGL 图片滤镜 / 降采样任务可通过真实 shader 输出，`filterApplyCount`、`downsampleRenderCount` 可观测，任务无 backend miss / failure。
28. 已验收核心：复杂表格外框加粗、虚线边框、单元格斜线和显式单元格边框可进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
29. 已验收核心：隐藏 area、隐藏元素和隐藏控件在非设计态可跳过并进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
30. 已验收核心：活动 group 交互态可在非当前页进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss；当前页仍保持同步 base。
31. 已验收核心：SVG block 可命中 DOM / SVG host，导出时通过 Canvas2D rasterize 固化，不依赖可视 DOM host，不产生 backend miss。
32. 已验收核心：WebGL 图片裁剪 / 旋转预览可通过真实 shader 输出，`cropRenderCount`、`rotationRenderCount` 可观测，导出不命中 WebGL 但按同语义 Canvas2D 固化，任务无 backend miss / failure。
33. 已验收核心：HTML block 可命中 DOM/SVG host 挂载真实 DOM fragment，导出时通过 Canvas2D 文本 回退 固化，不依赖可视 DOM host，不产生 backend miss。
34. 已验收核心：WebGL 图片预览 bitmap 缓存首轮写入处理结果，二次同参数可视重绘命中 `imagePreview.hitCount`，且 `dispatchCountByReason['image-webgl']` 和 WebGL backend 命中保持为 0，页面像素仍非空，不产生 backend miss。
35. 已验收核心：页面背景图片进入真实 OffscreenCanvas worker 快照，worker 按 `cover` / `contain` 与 `repeat` 语义绘制背景图，不再因为 `background.image` 回退 Canvas2D。
36. 已验收核心：浮动图片从 `floatPositionList` 生成独立 worker `drawImage` 命令，按 `FLOAT_BOTTOM` / `FLOAT_TOP` / `SURROUND` 分层顺序合成，不再因为浮动图片整页回退 Canvas2D。
37. 已验收核心：编辑态换行标记和分页符辅助标记可由 worker `strokePath` / `fillText` 命令绘制，非当前页不再因为 `lineBreak.disabled = false` 或 `pageBreak` 整页回退 Canvas2D。
38. 已验收核心：TAB 占位可参与 worker 行布局并跳过绘制，分散 / 两端对齐文本按元素 position 独立绘制，非当前页不再因为 `ElementType.TAB`、`RowFlex.ALIGNMENT` 或 `RowFlex.JUSTIFY` 整页回退 Canvas2D。
39. 已验收核心：group / area / control 包裹的图片、分隔线、基础控件和表格可进入真实 OffscreenCanvas worker 快照，worker 成功后无 回退、无 backend miss。
40. 已验收核心：LaTeX SVG path 通过 worker `strokeSvgPath` 向量命令绘制，非当前页不再依赖 data SVG 图片解码，worker 成功后无 回退、无 backend miss。
41. 已验收收口：OffscreenCanvas worker 静态 base 覆盖已闭合；后续只保留交互 overlay、DOM / SVG block、缺失资源、非法 / 未测量表格结构和更大规模性能量化作为独立专题。
