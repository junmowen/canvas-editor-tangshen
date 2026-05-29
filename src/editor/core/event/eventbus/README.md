# Event Bus 目录说明

`eventbus/` 提供编辑器内部事件发布订阅能力，用于解耦运行时模块之间的通知。

## 位置说明

- 所属层级：事件层 / 内部事件总线
- 上游调用：`Draw.ts`、runtime、modules
- 下游依赖：无业务依赖

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `EventBus.ts` | 泛型事件总线，支持订阅、发布、取消订阅和订阅检查。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `EventBus.ts` | `on(eventName, callback)` | 注册事件监听。 | runtime、modules、command |
| `EventBus.ts` | `emit(eventName, ...payload)` | 发布事件并传递参数。 | draw、event、modules |
| `EventBus.ts` | `off(eventName, callback)` | 移除指定事件监听。 | 生命周期清理和模块卸载 |
| `EventBus.ts` | `isSubscribe(eventName)` | 判断事件是否已有订阅者。 | 事件分发前检查 |
