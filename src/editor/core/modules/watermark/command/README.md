# Watermark Command 目录索引

`command/` 存放水印命令复用规则。

## 位置说明

- 所属业务：`watermark`
- 所属层级：命令适配业务规则层
- 上游调度：`command/CommandAdaptMedia.ts`
- 下游依赖：默认水印配置和编辑器 options

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `WatermarkCommandPolicy.ts` | 添加 / 更新水印配置和删除水印重置策略 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `WatermarkCommandPolicy.ts` | `applyWatermarkOptions(options, payload)` | 将传入水印配置合并默认值后写入编辑器 options。 | `command/CommandAdaptMedia.ts` 的 `executeWatermark()` |
| `WatermarkCommandPolicy.ts` | `resetWatermarkOptions(options)` | 存在水印数据时重置为默认水印配置，并返回是否发生变更。 | `command/CommandAdaptMedia.ts` 的 `deleteWatermark()` |

## 维护规则

- 添加/更新水印时的默认值合并放在这里。
- 删除水印时的重置规则放在这里。
