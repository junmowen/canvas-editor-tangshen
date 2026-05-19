# Dirty Range、事务指标与真实模板压测推进方案

## 14. 下一阶段推进方案：dirty range、事务指标与真实模板压测

上一阶段已经把高风险功能从大文件中拆开，并用表格专项和 1000 页性能用例守住基本正确性。下一阶段不再继续做零散修补，改为按“可观测 -> 可计划 -> 可扩展”的顺序推进。

## 子专题

1. [14.1-14.2 Dirty Page Range Planner](./canvas-pool-render-backend-dirty-range.md)
2. [14.3 大粘贴事务指标和用例补齐](./canvas-pool-render-backend-async-insert.md)
3. [14.4 真实业务模板压测](./canvas-pool-render-backend-clinic-template.md)
4. [14.5 正文数据结构预研](./canvas-pool-render-backend-text-store.md)

## 阶段状态

1. dirty range planner 已接管普通页级 rebalance 的异步传播起点，并保留漏页回退统计。
2. 大粘贴事务状态机、读取前 flush、取消、失败恢复和嵌套域同步回退已经闭环。
3. 真实门诊模板压测覆盖 20 / 100 / 500 页、输入、大粘贴、表格单元格和导出像素。
4. 正文数据结构阶段只完成数组 store 适配和只读 mirror replay，不切换 piece-table / rope 主链路。
