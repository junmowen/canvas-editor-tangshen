# Draw Query 目录说明

`query/` 存放 draw 层的状态查询服务，用于隔离运行时模式判断。

## 位置说明

- 所属层级：公共绘制层 / 状态查询层
- 上游调用：`Draw.ts`、事件、业务模块
- 下游依赖：`DrawRuntime`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawStateQueryService.ts` | 查询只读、禁用、设计模式和打印模式。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawStateQueryService.ts` | `isReadonly()` / `isDisabled()` | 判断编辑器是否允许编辑。 | event、command、业务模块 |
| `DrawStateQueryService.ts` | `isDesignMode()` / `isPrintMode()` | 判断当前运行时模式。 | 渲染、导出和交互链路 |
