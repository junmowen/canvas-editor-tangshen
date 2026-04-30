# Canvas Editor 上游 Issues 使用清单

## 1. 你的定位

你是使用者，不是维护者。

因此你的目标不是：

1. 管理对方仓库 labels
2. 推动对方 issue 排期
3. 修改对方模板

你的目标是：

1. 用上游 issue 判断风险
2. 约束自己的接入方式
3. 决定是否升级

---

## 2. 每次接入新能力前

先做：

1. 查对应关键字 issue
2. 看是否涉及 table / pagination / cursor / render / image
3. 判断有没有明显未解决边界问题

如果是高风险能力：

1. 不要直接放进核心业务
2. 先做本地隔离封装
3. 先做最小回归样例

---

## 3. 每次升级前

固定做四件事：

1. 看最近 open issues
2. 看和你使用模块相关的 issue
3. 跑自己的最小回归
4. 确认是否存在绕不过去的已知问题

---

## 4. 你自己的风险表至少要有

1. 能力名
2. 是否在用
3. 上游 issue
4. 风险等级
5. 规避方式
6. 升级前是否必测

---

## 5. 当前优先关注方向

1. 表格与分页
2. 光标与选区
3. 控件删除与输入边界
4. 图片环绕与渲染
5. 性能

---

## 6. 实际决策规则

可以直接采用：

1. 高风险能力没有业务强需求时，先不用
2. 高风险能力必须用时，先包适配层
3. 上游主链正在重构时，不抢最新版本
4. 已知 bug 命中你的业务场景时，先规避再等待修复

---

## 7. 关联文档

- [upstream-issues-usage-plan.md](/D:/canvas-editor/docs/guide/upstream-issues-usage-plan.md)
- [performance-optimization-plan.md](/D:/canvas-editor/docs/guide/performance-optimization-plan.md)
