# 渲染引擎接入与 OffscreenCanvas Worker 收口

### 14.6 第五阶段：渲染引擎接入

目标：把现有 capability / engine 占位推进到可灰度的渲染后端，而不是继续只停留在接口层。

状态：调度基座已完成，OffscreenCanvas worker 已从普通文本页 P0 垂直切片推进到核心静态 base 覆盖，并完成当前 scope 收口。当前真实 worker 可覆盖非当前、非交互 base 页的页面背景色 / 背景图片、正文普通文本、TAB 占位、分散 / 两端对齐文本、编辑态换行标记、分页符辅助标记、正文高亮 / 下划线 / 删除线、上标 / 下标、超链接、日期、自定义字宽 / 字间距、静态 area 背景 / 边框、隐藏 area / 隐藏元素 / 隐藏控件的非设计态跳过、非活动与活动 group 行内装饰、group / area / control 包裹的非文本元素、空文档占位符、简单页眉页脚文本、页码、非重复与重复文字水印、非重复与重复图片水印、行号、页边框、编辑态页边距标记、简单分隔线、列表标记、基础 checkbox / radio、控件文本边框、普通图片、浮动图片、文档签章 / badge、LaTeX SVG path、基础表格背景 / 边框 / 单元格文本、跨页 fragment 单元格裁剪、复杂表格外框加粗、虚线边框、单元格斜线和显式单元格边框。搜索态、复杂控件编辑态、当前页交互 overlay、非法 / 未测量表格结构和外部交互 block 仍主动回退 Canvas2D 或独立 DOM 管线。

## 子专题

1. [14.6 渲染引擎实施细节](./canvas-pool-render-backend-render-engine-implementation.md)
2. [14.6 Worker Snapshot 覆盖范围与验收](./canvas-pool-render-backend-render-engine-acceptance.md)
3. [14.6 Snapshot Builder 模块图](./canvas-pool-render-backend-render-engine-module-map.md)

## 当前维护边界

- OffscreenCanvas worker 静态 base 覆盖已经收口。
- `PageRenderSnapshotBuilder` 及其命令构建器已经按页面、行、行内元素、文本装饰、列表、表格和校验拆分。
- debug snapshot、默认关闭的 debug 面板、真实图片收益量化和 WebGL 显存预算策略已经补齐；后续只保留真实业务参数校准，不再作为本方案核心缺口。
