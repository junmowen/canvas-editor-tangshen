# 推荐排期、暂停条件与结束定义

### 14.7 推荐排期

1. **已完成**：dirty range planner 旁路统计、stats 和 debug 日志。
2. **已完成**：planner 接管异步传播起点，补表格推动下移和跨页 overflow / gap refill 回归。
3. **已完成**：大粘贴事务指标、状态机文档和 undo / redo / 搜索 / 保存 / 导出相关用例。
4. **已完成**：接入真实门诊病历模板压测，建立 20 / 100 / 500 页三档基线。
5. **已完成**：扩展 OffscreenCanvas worker 覆盖范围，从普通文本页推进到 TAB 占位、分散 / 两端对齐文本、编辑态换行标记、分页符辅助标记、页码、文字 / 图片水印、占位符、行号、列表、基础控件、普通表格、复杂表格装饰、普通图片、浮动图片、文档签章、LaTeX SVG path、正文高亮 / 下划线 / 删除线、上标 / 下标、超链接、日期、自定义字宽 / 字间距、静态 area 背景 / 边框、隐藏 area 非设计态跳过、非活动 group / 活动 group 行内装饰和 group / area / control 包裹的非文本元素。
6. **已完成**：完善 worker 结果的 bitmap cache 来源统计，区分 `canvas-2d render`、`worker render`、`bitmap cache compose` 三类 base 来源。
7. **已完成**：补 worker 调度器，包括每页最新 job、并发上限、滚动方向优先级、输入取消、超时、熔断和过期结果丢弃。
8. **已完成第三批**：补 WebGL 图片任务，只接图片预览 / 绘制垂直切片，不碰正文文字，并补纹理缓存、预览 bitmap 固化缓存、LRU 淘汰、滤镜 / 降采样 / 裁剪 / 旋转 shader、context lost 后 Canvas2D 回退；导出路径已显式禁用 WebGL 并按同语义固化 Canvas2D。
9. **已完成第二批**：补 DOM / SVG block 任务，只接外部 block host 生命周期垂直切片，并补页面卸载、重挂、bitmap cache 命中重放、导出 回退、inline SVG rasterize 和 HTML block 文本 回退。
10. **已完成**：补默认关闭的可视化 debug 面板入口和 `getRenderBackendDebugSnapshot()` 聚合快照，业务侧可直接读取 backend、worker、base 来源、图片收益、内存和正文 store mirror 健康度。
11. **已完成**：补真实高分辨率图片收益量化和显存预算统计，WebGL capability 暴露源图 / 输出像素、降采样节省像素、纹理复用节省上传像素、纹理缓存字节数、预算上限和预算淘汰次数。
12. **已完成**：piece-table / rope 前置试点收口为 `documentTextStore.mirrorMode = shadow-write`，当前仍不切换主链路，只通过 mirror replay 健康度作为后续替换底层结构的准入信号。

### 14.8 暂停条件

出现以下任一情况，应暂停扩大能力边界，优先修正确性：

1. 任意表格专项出现重复 fragment、旧边框残留、文字越过 td bounds 或光标页码错误。
2. 后台大粘贴事务在取消后仍能写入新文档。
3. `getValue()`、保存、导出、打印读取到半提交数据。
4. planner 输出 range 小于实际影响页集合，导致可见页残留旧内容。
5. bitmap cache 命中后覆盖新输入内容。
6. worker 返回旧 job、旧 layoutVersion、旧 baseVisualVersion、旧 resourceVersion、错误 DPR 或错误尺寸后仍覆盖当前页。
7. worker 回退 失败后出现 backend miss 或页面空白。
8. WebGL context lost 后图片预览无法回退 Canvas2D。
9. DOM / SVG block 在页面卸载、滚动重挂或导出时丢失内容。

### 14.9 本方案结束定义

第一阶段 dirty range planner 接管、第二阶段后台大粘贴事务指标闭环和第三阶段真实业务模板三档压测已经完成。若继续推进 14.6 渲染引擎专题，本专题新的结束定义是：

1. OffscreenCanvas worker 真实绘制链路完成，非当前页 base 能后台绘制并以 `ImageBitmap` 合成。
2. 当前页、光标页、选区边界页、搜索页、控件编辑态和 overlay 永远不被 worker 抢占。
3. worker job 具备取消、过期丢弃、超时 回退、熔断和版本校验。
4. 已完成第三批：WebGL 图片任务和 DOM / SVG block 任务各有一个垂直切片，并且通过独立 reason 和默认关闭开关保持明确 回退；WebGL 纹理缓存、预览 bitmap 固化缓存、滤镜 / 降采样 / 裁剪 / 旋转 shader、context lost、DOM / SVG block 卸载重挂、cache 命中重放、导出 回退、inline SVG rasterize 和 HTML block 文本 回退 已有专项回归。
5. 100 / 500 页门诊模板在新 engine 开启后通过专项和基线压测，关闭开关后完全回到 Canvas2D 原链路。

6. 可视化 debug snapshot、图片收益量化、WebGL 显存预算和正文 store `shadow-write` mirror 健康度均已具备代码入口和回归约束。

截至本轮推进，本方案结束定义已闭合。后续工作应作为新的专题处理，例如把 `shadow-write` mirror 替换成真实 piece-table / rope mirror、把 debug snapshot 接入线上采样系统、按真实图片集重新校准 WebGL 默认显存预算。
