# 14.6 图片、Block 与收口 Roadmap

实施顺序（续）：

20. 已完成核心九第一批：worker snapshot 补空文档占位符、非重复 / 重复图片水印，图片水印使用 worker 侧 `drawImage` transform 和 pattern 命令绘制。
21. 已完成核心九第二批：WebGL 图片任务补纹理缓存、同图复用、上限淘汰和 capability 统计，不再每个图片任务重新创建 / 销毁纹理资源。
22. 已完成核心十第一批：文档签章 / badge 通过 `Badge.getRenderableBadgeList()` 快照化为 worker `drawImage` 命令，非当前页可命中真实 worker，无 回退 / miss。
23. 已完成核心十第二批：正文高亮、下划线和删除线改为 worker 可序列化命令，非当前页基础样式不再触发 Canvas2D 回退。
24. 已完成核心十第三批：上标 / 下标、超链接、日期、自定义字宽 / 字间距进入 worker 文本命令化路径，按元素 position 独立绘制，非当前页高级文本不再触发 Canvas2D 回退。
25. 已完成核心十第四批：静态 area 背景 / 边框与非活动 group 行内装饰进入 worker 命令化路径。
26. 已完成核心十第五批：WebGL 图片任务从纹理拷贝推进到滤镜 / 降采样 shader，灰度、亮度、对比度和高分辨率源图缩放输出均走独立 `image-webgl` 任务，失败或关闭时回退同语义 Canvas2D 输出。
27. 已完成核心十第六批：复杂表格装饰进入 worker 命令化路径，覆盖外框加粗、虚线边框、正 / 反斜线和显式单元格边框；非当前页真实 worker 成功后无 回退 / miss。
28. 已完成核心十第七批：隐藏 area、隐藏元素和隐藏控件在非设计态按主线程语义跳过正文绘制，不再触发 worker 整页 回退；设计态仍留在同步 Canvas2D。
29. 已完成核心十第八批：活动 group 样式进入 worker 命令化路径，非当前页同组内容按 active group 背景 / 透明度绘制，不再触发 `active group` 回退；当前页仍保持同步交互路径。
30. 已完成核心十一第一批：DOM / SVG block 扩展 inline SVG host 和导出 rasterize，运行时命中 `svg-dom` 挂载真实 SVG，导出时不挂可视 DOM，而是通过 Canvas2D 固化 SVG 位图。
31. 已完成核心十一第二批：WebGL 图片任务扩展裁剪 / 旋转预览，运行时由 shader 消费 `webglCrop` / `webglRotation`，导出与 回退 使用 Canvas2D 同语义固化。
32. 已完成核心十一第三批：DOM / SVG block 扩展 HTML block host，运行时挂载真实 DOM fragment，导出不依赖可视 DOM host，而是用 Canvas2D 稳定文本摘要 回退 固化。
33. 已完成核心十一第四批：WebGL 图片预览结果进入 bitmap 固化缓存，同源同尺寸同 DPR 且滤镜 / 降采样 / 裁剪 / 旋转参数一致时，二次可视重绘直接复用处理后 bitmap，跳过 `image-webgl` 后端派发；统计入口暴露 `imagePreview` 命中、写入、淘汰和内存估算。
34. 已完成核心十二第一批：worker snapshot 移除 group / area / control 包裹非文本元素的过度拒绝，图片、分隔线、基础控件和表格可复用已有装饰命令进入真实 worker。
35. 已完成核心十二第二批：LaTeX SVG 通过 `strokeSvgPath` 向量命令进入 worker，避免 OffscreenCanvas 侧 data SVG 图片解码失败导致整页 回退。
36. 已完成核心十二第三批：OffscreenCanvas worker 当前 scope 收口，剩余 回退 只保留交互态、DOM / SVG block、缺失资源和非法 / 未测量结构边界。
37. 已完成核心十三第一批：补 `getRenderBackendDebugSnapshot()` 和默认关闭的 debug 面板，避免业务侧直接消费完整 stats 大对象。
38. 已完成核心十三第二批：补 WebGL 高分辨率图片收益量化和显存预算，按数量与字节双预算淘汰纹理缓存。
39. 已完成核心十三第三批：补预览 bitmap 缓存命中率、峰值内存和节省重绘像素统计，二次重绘收益可直接从 stats 判断。
