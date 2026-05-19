# 14.6 当前核心边界

核心欠缺：

1. OffscreenCanvas worker 已覆盖普通文本、TAB 占位、分散 / 两端对齐文本、编辑态换行标记、分页符辅助标记、正文高亮 / 下划线 / 删除线、上标 / 下标、超链接、日期、自定义字宽 / 字间距、静态 area 背景 / 边框、隐藏 area / 隐藏元素 / 隐藏控件的非设计态跳过、非活动与活动 group 行内装饰、group / area / control 包裹的非文本元素、空文档占位符、基础 frame、列表、基础控件、普通图片、浮动图片、文档签章 / badge、LaTeX SVG path、基础表格、复杂表格外框加粗 / 虚线 / 斜线 / 显式单元格边框、页面背景图片、文字水印和图片水印。
2. 页渲染逻辑大部分仍强依赖主线程 `Draw` 和 Canvas2D 上下文，目前只有可结构化的基础绘制命令完成了 worker 快照化。
3. worker job 已有单并发队列、滚动方向优先级、同页主动取消、队列上限、超时、过期丢弃、版本校验和连续失败熔断；后续仍需要更贴近真实滚动的批量预取策略和长任务收益评估。
4. worker 合成、Canvas2D render 和 bitmap cache compose 的 base 来源区分已完成；后续需要把这些统计接入可视化 debug 面板，并用于 100 / 500 页真实模板对比。
5. WebGL 已有图片任务垂直切片、纹理缓存、预览 bitmap 固化缓存、LRU 淘汰、滤镜 / 降采样 / 裁剪 / 旋转 shader、context lost fallback 和导出 Canvas2D 固化回归；后续若继续扩大图片管线，应单独评估真实高分辨率图片收益和更大图片集的显存上限策略。
6. SVG / DOM 已有 block host 任务垂直切片、页面卸载清理、重挂、cache 命中重放、导出 fallback、inline SVG rasterize 和 HTML block 文本 fallback 回归；后续若扩展更复杂外部 block，应继续按“可视 DOM host + 导出稳定序列化 / rasterize fallback”拆分，并单独评估 HTML 安全策略和复杂 DOM rasterize 成本。
