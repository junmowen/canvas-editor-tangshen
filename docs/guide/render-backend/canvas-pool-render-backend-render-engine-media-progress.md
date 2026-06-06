# 14.6 WebGL 图片与 DOM / SVG block 进展

当前进度（续）：

17. WebGL 图片任务已走独立 `image-webgl` reason，并通过 transient surface 承接图片预览 / 绘制输出；默认关闭，开启后命中 `webgl` engine，WebGL 不参与正文文字排版。
18. DOM / SVG block 任务已走独立 `svg-dom-block` reason，仍由 block host 挂载 / 更新 DOM，不进入 base bitmap cache；默认关闭，开启后命中 `svg-dom` engine；当前可承载 iframe、video、inline SVG 和 HTML block host。
19. `Draw.getRenderBackendStats().baseRenderSource` 已区分 `canvas-2d-render`、`worker-render` 和 `bitmap-cache-compose` 三类 base 来源；bitmap cache 也已按 `canvas-2d-render` / `worker-render` 拆分写入、命中和合成来源。
20. WebGL 图片任务已增加 context lost 灰度 / 测试开关，context lost 后 capability 关闭，图片任务自动回退 Canvas2D execute，不产生 backend miss。
21. DOM / SVG block 已补页面卸载清理和重挂路径；base bitmap cache 命中时会重放 block host 管线，避免只恢复 canvas bitmap 后丢失 iframe / video host。
22. `WorkerRenderScheduler` 已增加调试配置入口，可在浏览器回归中稳定注入超时、队列上限和熔断阈值；真实调度仍默认 1500ms 超时、单并发和队列上限 8。
23. 导出链路已显式隔离运行时引擎：图片导出禁用 WebGL 任务并固化到 Canvas2D transient surface，DOM / SVG block 导出不创建可视 DOM host；iframe / video 使用稳定占位 回退，inline SVG block 通过预加载 raster image 固化到导出 canvas。
24. 真实门诊模板 100 / 500 页已补 OffscreenCanvas worker 观测回归：开启 worker 后非当前页可命中 `offscreen-canvas`、写入 `worker-render` bitmap cache、队列最终清空、miss 为 0 且未熔断。
25. WebGL 图片任务已补真实纹理缓存：`webglImage.cacheKey` 由图片源传入，engine 复用 shader program、顶点 buffer 和同源纹理，并按 `maxTextureCacheSize` 做 LRU 淘汰。
26. WebGL capability 已暴露 `textureCacheSize`、`textureUploadCount`、`textureReuseCount` 和 `textureEvictCount`，浏览器回归验证同图复用、异图上传和上限淘汰均可观测。
27. WebGL 图片任务已补滤镜 / 降采样 / 裁剪 / 旋转 shader：`webglImage.filter` 支持灰度、亮度和对比度 uniform，`webglImage.downsample` 标记高分辨率源图缩放输出，`webglImage.crop` 和 `webglImage.rotation` 可承载图片裁剪预览与中心旋转预览；Canvas2D 回退 与导出路径使用同一语义固化结果，capability 暴露 `filterApplyCount`、`downsampleRenderCount`、`cropRenderCount` 和 `rotationRenderCount`。
28. worker 表格快照已补复杂装饰命令：`borderExternalWidth` 会为右 / 下外框输出独立加粗线段，`TableBorder.DASH` 继承虚线边框，`td.slashTypes` 输出正 / 反斜线，`td.borderTypes`、`td.borderColor` 和 `td.borderWidth` 输出显式单元格边框。
29. worker 快照已对齐主线程非设计态隐藏语义：`element.hide`、`element.control.hide` 和 `element.area.hide` 不再导致整页 回退，而是在命令构建阶段跳过正文绘制；设计模式仍保留同步 Canvas2D 边界。
30. worker group 快照已补活动态样式：根据当前编辑锚点的 `groupIds` 序列化 active group 集合，非当前页同组矩形使用 `activeBackgroundColor` 和 `activeOpacity`，当前页仍因光标 / 选区交互保持同步 base。
31. SVG block 管线已补 `BlockType.SVG`、`svgBlock.svg` host 和导出 rasterize：可视路径挂载真实 SVG DOM，导出路径不挂 host，而是通过预加载 `HTMLImageElement` 同步 `drawImage` 到 Canvas2D。
32. WebGL 图片管线已补裁剪 / 旋转预览闭环：图片元素新增 `webglCrop` 和 `webglRotation`，运行时命中 WebGL shader，关闭 WebGL 或导出时回退 Canvas2D 同语义绘制，避免可视预览和导出结果分叉。
33. HTML block 管线已补 `BlockType.HTML` 和 `htmlBlock.html` host：运行时挂载真实 DOM fragment，复制 / HTML 反解析保留 block 数据；导出路径不挂可视 DOM，而是通过 Canvas2D 稳定文本摘要 回退 固化到导出图片。
34. WebGL 图片预览已补 bitmap 固化缓存：`ImageParticle` 按源图、输出尺寸、DPR、滤镜、降采样、裁剪和旋转生成稳定缓存键，首轮 WebGL / Canvas2D 回退 处理后的预览 canvas 会进入 LRU 缓存；同参数二次可视重绘直接合成缓存 bitmap，不再重复派发 `image-webgl`，导出路径仍显式绕过缓存并使用 Canvas2D 固化。
35. worker snapshot 已移除非文本元素的过度拒绝：分隔线、图片、基础控件和表格被 group / area / control 包裹时，复用已有装饰命令进入 worker，不再因外层元数据整页 回退。
36. worker LaTeX 已从 SVG 图片解码改为向量命令：主线程从 `laTexSVG` 提取 path，序列化为 `strokeSvgPath`，worker 侧用 `Path2D` 绘制，避免 OffscreenCanvas 对 data SVG 解码支持差导致 回退。
37. OffscreenCanvas worker 当前 scope 已收口：剩余硬 回退 均为交互态、非法 / 未测量表格结构、缺失资源或 DOM / SVG / iframe / video block 管线边界，不再归入 worker 静态 base 核心缺口。
38. WebGL 图片收益量化已补齐：capability 暴露源图像素、输出像素、降采样节省像素、纹理复用节省上传像素、当前纹理缓存字节数和 MB。
39. WebGL 显存预算已补齐：`renderBackend.webgl.maxTextureCacheBytes` 和 `maxTextureCacheSize` 同时约束纹理缓存，预算淘汰通过 `textureBudgetEvictCount` 可观测。
40. `ImageParticle` 预览 bitmap 固化缓存已补命中率、峰值内存和节省重绘像素统计，用于量化二次重绘是否真正跳过 `image-webgl` 派发。
41. 渲染后端 debug snapshot 和默认关闭 debug 面板已补齐，业务方可通过 `getRenderBackendDebugSnapshot()` 或 `renderBackend.debugPanel.enabled` 读取收口后的关键状态。
