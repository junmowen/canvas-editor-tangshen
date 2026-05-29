# Runtime Actuator 目录索引

`actuator/` 存放运行时执行器。

## 位置说明

- 所属层级：通用运行执行层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Actuator.ts` | 运行时动作执行入口 |
| `handlers/` | actuator 事件处理函数 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Actuator.ts` | `constructor` | 注册运行时执行器需要监听的事件。 | `DrawComponentRegistry` |
| `handlers/positionContextChange.ts` | `positionContextChange()` | 响应 positionContext 变化并同步相关状态。 | `Actuator.ts` |
