# Runtime Actuator Handlers 目录说明

`actuator/handlers/` 存放运行时执行器的具体事件处理函数。

## 位置说明

- 所属层级：通用运行时层 / actuator handler
- 上游调用：`Actuator.ts`
- 下游依赖：draw、position context

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `positionContextChange.ts` | positionContext 变化后的联动处理。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `positionContextChange.ts` | `positionContextChange()` | 在 positionContext 变化后触发运行时状态同步。 | `Actuator.ts` |
