# Area Interaction 目录说明

`area/interaction/` 存放区域元素在键盘和输入过程中的上下文处理规则。

## 位置说明

- 所属业务：`area`
- 所属层级：业务交互策略层
- 上游调用：键盘 Enter / 输入链路
- 下游依赖：area 上下文和元素样式

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `AreaEnterPolicy.ts` | 处理回车时区域上下文继承和清理。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `AreaEnterPolicy.ts` | `normalizeAreaContextForEnter()` | 根据回车位置规范化区域上下文，避免跨区域错误继承。 | keyboard Enter 链路 |
