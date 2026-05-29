# Watermark 目录索引

`watermark/` 存放文档水印相关业务规则和运行期渲染对象。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 水印命令、配置归一化和删除规则 |
| `runtime/` | 水印文本 / 图片渲染、图片缓存和渲染触发 |

## 维护规则

- 水印命令、配置归一化和删除规则放在这里。
- 水印运行对象放在 `runtime/`，不要重新散回 `draw/frame/Watermark.ts`。
- command 适配层只负责只读校验、调用水印规则和触发渲染。

## 位置说明

- 所属层级：业务模块层 / 水印
- 上游调用：command、page setup render
- 下游依赖：`command/`、`runtime/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 水印命令、配置归一化和删除规则。 |
| `runtime/` | 水印文本 / 图片渲染、图片缓存和触发。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `command/` | watermark command helper | 设置、归一化和删除水印配置。 | command |
| `runtime/Watermark.ts` | watermark runtime 方法 | 绘制文本或图片水印。 | page frame render |
