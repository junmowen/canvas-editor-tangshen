# Canvas Editor 性能优化方案

## 1. 目标

本文档用于把当前仓库的性能问题、优化方向、实施顺序和验收标准收束成一份可执行方案。

当前目标不是再做一轮大而泛的“架构重构”，而是基于现有主链，优先把以下问题压下去：

1. 高频交互下的掉帧和抖动
2. 大表格、多页文档下的命中与渲染放大成本
3. 搜索、局部命令、局部编辑仍然误走全量链路的问题
4. 主链热点方法过厚，导致局部优化收益吃不满

---

## 2. 当前判断

从当前代码结构看，项目路线本身没有问题，核心优化基础已经具备：

1. 已有 `visible-only` 渲染路径
2. 已有 `overlay-only` 刷新路径
3. 已有 `snapshot hit-test` 主链
4. 已有 `RAF` 合并调度
5. 已有 `RenderInvalidationManager` 作为失效管理入口

对应核心文件：

- `src/editor/core/modules/table/render/RenderInvalidationManager.ts`
- `src/editor/core/draw/render/DrawRenderFacadeService.ts`
- `src/editor/core/draw/viewport/DrawViewportService.ts`
- `src/editor/core/modules/table/hittest/TableHitTestService.ts`

真正的问题不在于“有没有优化设施”，而在于“这些设施还没有成为唯一主链规则”。

也就是说，当前性能瓶颈主要来自以下几类残留：

1. 仍有不少入口直接触发 `draw.render()`
2. overlay 和 base canvas 的职责边界还不够硬
3. 命中测试虽然已经切到 snapshot，但局部仍有线性扫描
4. 行渲染链和表格递归链仍然过厚
5. 搜索绘制已优化，但匹配计算仍然是全局同步

---

## 3. 热点模块判断

当前最值得关注的热点文件：

- `src/editor/core/draw/render/RowRenderer.ts`
- `src/editor/core/position/Position.ts`
- `src/editor/core/modules/table/hittest/TableHitTestService.ts`
- `src/editor/core/modules/search/runtime/Search.ts`
- `src/editor/core/event/handlers/mousemove.ts`
- `src/editor/core/draw/render/PageRenderer.ts`
- `src/editor/core/command/CommandAdapt.ts`

热点原因分别如下：

### 3.1 `RowRenderer`

当前 `RowRenderer` 同时承担：

1. highlight 绘制
2. selection 绘制
3. 正文逐元素绘制
4. 表格 cell 递归展开
5. fragment top border 补画
6. table range queue 收尾

这意味着一次局部刷新很容易被放大成一整串复合成本。

### 3.2 `Position` / `TableHitTestService`

虽然命中主链已经明显优于旧链路，但热点上仍有这些问题：

1. `floatPositionList` 线性扫描
2. `pageFragmentPositions` 线性扫描
3. `cellBoundsList` 线性扫描
4. cell 内部 `fragmentPositionList` 继续扫描

在大表格、多页文档场景下，这类线性链路会直接吞掉鼠标移动和拖选帧预算。

### 3.3 `Search`

当前搜索链路已经把高亮绘制切到了 overlay，但仍然有两个主问题：

1. 匹配计算是同步全量扫描
2. 导航滚动仍通过创建临时 DOM anchor 再 `scrollIntoView`

也就是说，绘制层已经收口，但计算层和滚动层还不够轻。

### 3.4 `CommandAdapt`

`CommandAdapt` 中仍有大量直接 `draw.render()` 调用，说明不少命令入口还没有严格区分：

1. 需要重算布局
2. 只需刷新 base canvas
3. 只需刷新 overlay

这是当前最典型的“优化基础已有，但没彻底吃满”的问题。

---

## 4. 性能问题分层

为避免后续继续混在一起讨论，建议把性能问题固定分成以下四层：

### 4.1 布局层

关注：

1. `rowList` 计算
2. `pageRowList` 分页
3. `positionList` 重建
4. table snapshot 重建

典型症状：

1. 输入一个字符却触发整篇重算
2. 局部表格修改却导致全表甚至全文布局重算

### 4.2 基础渲染层

关注：

1. base canvas 清理
2. 页级重绘
3. 行级正文绘制

典型症状：

1. 局部选区变化却重绘整页正文
2. search / selection 变化拖着正文一起重画

### 4.3 装饰层

关注：

1. selection overlay
2. search overlay
3. control highlight overlay
4. table tool / cursor / previewer overlay

典型症状：

1. 装饰层变化不能独立刷新
2. overlay 变化错误回退到 base render

### 4.4 交互命中层

关注：

1. 鼠标命中
2. 拖选边界解析
3. table hit-test
4. 光标定位

典型症状：

1. 大表格里鼠标移动明显发涩
2. 跨页表格拖选出现帧抖动

---

## 5. 总体优化原则

后续所有改造建议统一遵守以下原则：

### 5.1 高频交互默认不能直接全量 render

像以下行为默认都不应直接进入整页或整篇 render：

1. 鼠标拖选
2. 光标移动
3. 搜索导航
4. 控件高亮变化
5. table tool / cursor 可视态变化

除非明确出现 `layoutDirty`，否则应优先走 visible-only 或 overlay-only。

### 5.2 overlay 与 base canvas 必须职责硬分层

建议固定规则：

1. 正文、静态框架走 base canvas
2. selection / search / control highlight / table tool / cursor 走 overlay

不要让同一类视觉状态同时在 base 和 overlay 双写长期共存。

### 5.3 hit-test 必须继续从“线性扫描”走向“局部索引”

当前 snapshot 化已经完成第一步，下一步必须把：

1. page fragment 查找
2. cell bounds 查找
3. float element 查找

进一步缩成 page-local 索引，而不是每次事件都从数组头部扫到尾部。

### 5.4 优先做热点路径压缩，而不是继续泛化重构

当前阶段不需要再先做一轮抽象层重构。

更合理的顺序是：

1. 先压高频路径
2. 再补局部索引
3. 最后做增量 layout

---

## 6. 分阶段实施方案

## 6.1 第一阶段：高频交互止损

目标：先把拖选、移动、导航、局部命令这批最常见卡顿压下去。

### 任务 A：统一渲染调度边界

重点文件：

- `src/editor/core/modules/table/render/RenderInvalidationManager.ts`
- `src/editor/core/draw/render/DrawRenderFacadeService.ts`
- `src/editor/core/command/CommandAdapt.ts`
- `src/editor/core/event/handlers/mousemove.ts`

实施内容：

1. 全量统计仓库中所有直接 `draw.render()` 调用
2. 给每个调用点标注类型：
   - `layout`
   - `base-visible`
   - `overlay-visible`
   - `full-render`
3. 高频调用点优先改走：
   - `refreshVisibleOverlay()`
   - `scheduleFrameRender()`
4. 建立统一规则：
   - 未标记 `layoutDirty` 的路径，不允许直接回全量链

验收标准：

1. 拖选主链不再频繁命中全量 render
2. 搜索导航不再因为高亮变化触发 base canvas 重绘
3. 光标移动主链只刷新必要页和必要层

### 任务 B：overlay 成为权威装饰层

重点文件：

- `src/editor/core/draw/render/PageRenderer.ts`
- `src/editor/core/draw/render/RowRenderer.ts`
- `src/editor/core/modules/table/render/TableOverlayRenderer.ts`

实施内容：

1. 清点 selection / search / control highlight 是否仍有 base canvas 残留绘制
2. 将装饰层绘制全部上收为 overlay 权威输出
3. 保证 base canvas 不再为纯装饰态变化负责

验收标准：

1. 选区变化只刷新 overlay 时视觉正确
2. 搜索高亮变化不触发正文重绘
3. 控件高亮变化不触发整页正文重绘

### 任务 C：压缩热路径对象分配

重点文件：

- `src/editor/core/draw/render/RowRenderer.ts`
- `src/editor/core/draw/render/PageRenderer.ts`
- `src/editor/core/position/Position.ts`

实施内容：

1. 减少高频路径中的 `slice()`
2. 尽量避免每帧创建新的 `Set`、`Map`、临时数组
3. 对 page-local 遍历引入复用缓冲区或游标范围

验收标准：

1. 长时间拖选过程中 GC 抖动减少
2. 大页多行局部刷新帧稳定性提升

---

## 6.2 第二阶段：命中与搜索降本

目标：把大文档、大表格场景下的线性成本继续打薄。

### 任务 D：为 hit-test 建页级索引

重点文件：

- `src/editor/core/position/Position.ts`
- `src/editor/core/modules/table/hittest/TableHitTestService.ts`

实施内容：

1. `floatPositionList` 按页分桶
2. `pageFragmentPositions` 按页内纵向区段分桶
3. `cellBoundsList` 按 row band 或 y-band 分桶
4. 命中时先缩小候选集合，再做精确字符盒判断

验收标准：

1. 多页大表格下 `mousemove` 命中更稳定
2. 跨页拖选时命中链耗时明显下降

### 任务 E：搜索异步化

重点文件：

- `src/editor/core/modules/search/runtime/Search.ts`
- `src/editor/core/runtime/worker/WorkerManager.ts`

实施内容：

1. 把 `getMatchList()` 迁到 worker
2. 搜索输入增加 debounce
3. 搜索导航滚动改成基于 page host 和坐标计算，不再创建临时 anchor DOM

验收标准：

1. 大文档搜索输入不阻塞主线程
2. 搜索导航不会引入明显滚动抖动

---

## 6.3 第三阶段：增量 layout

目标：解决“局部变化仍然整篇重算”的根问题。

### 任务 F：布局失效粒度细化

重点文件：

- `src/editor/core/draw/layout/DrawLayoutPipeline.ts`
- `src/editor/core/draw/layout/PagePartitioner.ts`
- `src/editor/core/modules/table/layout/TableLayoutSnapshotBuilder.ts`

实施内容：

1. 区分以下改动类型：
   - 文本内容改动
   - 样式改动
   - 表格结构改动
   - 纯装饰态改动
2. 非结构性改动尽量不重建整份 snapshot
3. 局部改动尽量限制到受影响页或受影响 fragment

验收标准：

1. 局部输入不再轻易触发全量布局
2. 表格局部编辑不再整表重算

---

## 7. 按优先级排序的任务列表

建议按以下顺序执行：

1. 统计并收口所有直接 `draw.render()` 调用
2. 清理 overlay/base 职责重叠
3. 压 `RowRenderer` 高热路径的切片和递归开销
4. 给 `TableHitTestService` 增加 page-local 索引
5. 把搜索匹配迁到 worker
6. 最后推进增量 layout

原因很简单：

1. 前三项风险低、收益快
2. 中两项解决大文档与大表格的主线程成本
3. 最后一项收益最大，但改动面和回归风险也最高

---

## 8. 建议增加的性能观测项

如果后续要稳定迭代性能，建议补最小可用埋点，而不是只靠体感。

### 8.1 渲染计时

建议记录：

1. layout 时间
2. visible page render 时间
3. overlay render 时间
4. 单次 `draw.render()` 总耗时

### 8.2 命中计时

建议记录：

1. `mousemove` 命中耗时
2. `mousedown` 命中耗时
3. table hit-test 耗时
4. selection drag range 解析耗时

### 8.3 搜索计时

建议记录：

1. search match 计算耗时
2. page map 重建耗时
3. 搜索导航滚动耗时

### 8.4 验证样本

建议固定三类文档：

1. 普通多页正文文档
2. 多列表格分页文档
3. 混合图片、搜索、高亮、控件的复杂文档

后续每次性能改造都以这三类样本回归。

---

## 9. 风险点

### 9.1 overlay 上收的回归风险

主要风险：

1. 选区绘制顺序变化
2. 搜索高亮与 selection 高亮叠加关系变化
3. table range / border / tool 的图层先后顺序变化

### 9.2 命中索引化的回归风险

主要风险：

1. later fragment 命中不准
2. 跨页拖选边界回归
3. cell 内部行首半区裁决回归

### 9.3 增量 layout 的回归风险

主要风险：

1. 局部更新与全局 snapshot 版本不一致
2. 某些命令依赖旧的全量刷新副作用
3. 表格结构修改后的 fragment / page 映射失配

因此增量 layout 必须晚于前两阶段，不能一开始就上。

---

## 10. 结论

当前项目的性能优化重点，不是“再证明一次架构方向正确”，而是把已经存在的优化基础真正落到唯一主链。

最核心的收口目标只有三条：

1. 高频交互不再误走全量 render
2. 命中测试不再依赖大范围线性扫描
3. 局部变化最终要从全量 layout 走向增量 layout

建议先做第一阶段，再逐步推进第二、第三阶段。  
如果按这个顺序执行，收益会明显更快，也更容易控制回归面。
