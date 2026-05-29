# Pointer Coordinates 目录说明

`pointer/coordinates/` 负责把原生事件坐标转换为视口、容器和页面内坐标。

## 位置说明

- 所属层级：事件层 / 指针坐标
- 上游调用：`DrawViewportService`、pointer handlers
- 下游依赖：页面 DOM、page wrapper、DPR 和页面缩放

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PointerCoordinateService.ts` | 指针坐标解析服务。 |
| `PointerCoordinateTypes.ts` | viewport、container、page 坐标类型。 |
| `PagePointTypes.ts` | 页面坐标基础类型。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `PointerCoordinateService.ts` | `resolve()` | 一次性解析指针事件的完整坐标信息。 | `DrawViewportService.ts`、pointer handlers |
| `PointerCoordinateService.ts` | `resolveViewportPoint()` | 读取事件在视口中的坐标。 | `resolve()` |
| `PointerCoordinateService.ts` | `resolveContainerPoint()` | 转换为编辑器容器坐标。 | `resolve()` |
| `PointerCoordinateService.ts` | `resolvePagePoint()` | 转换为具体页内坐标。 | `resolve()`、命中链路 |
| `PointerCoordinateService.ts` | `resolveDelta()` | 计算两个指针事件之间的位移。 | 拖拽和 selection drag |
