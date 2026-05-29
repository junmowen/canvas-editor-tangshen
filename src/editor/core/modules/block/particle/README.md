# Block Particle 目录索引

`block/particle/` 存放块级嵌入元素的绘制入口和具体 DOM 宿主实现。

## 位置说明

- 所属业务：`block`
- 所属层级：DOM 宿主粒子绘制层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/block/render/*`、`draw/Draw.ts` 导出取值链路

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `BlockParticle.ts` | block 粒子的渲染入口、缓存管理、页面清理和 iframe srcdoc 同步 |
| `modules/BaseBlock.ts` | 根据 block 类型选择具体宿主并维护页面坐标 |
| `modules/IFrameBlock.ts` | iframe block 渲染、安全 sandbox 和 srcdoc 同步 |
| `modules/VideoBlock.ts` | video block 渲染 |
| `modules/SvgBlock.ts` | svg block 渲染 |
| `modules/HtmlBlock.ts` | html block 渲染 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `BlockParticle.ts` | `getDraw()` / `getBlockContainer()` | 向 block 宿主暴露 Draw 实例和 block DOM 容器。 | `modules/BaseBlock.ts` |
| `BlockParticle.ts` | `render(pageNo, element, x, y)` | 创建或复用 block 宿主，并按页码和坐标渲染。 | `block/render/BlockPageHostRenderer.ts` |
| `BlockParticle.ts` | `clear()` / `clearPage(pageNo)` | 清理全部或指定页 block DOM 宿主。 | `block/render/BlockRenderLifecycle.ts`、`draw/dom/PageCanvasHost.ts` |
| `BlockParticle.ts` | `syncIframeSrcdocFromDom()` | 从 iframe DOM 回写 `srcdoc`，保证导出 / getValue 读取最新内容。 | `draw/Draw.ts` 的 `getOriginValue()`、`getValue()` |
| `modules/BaseBlock.ts` | `render()` / `setClientRects(pageNo, x, y)` / `remove()` | 根据 block 类型渲染宿主、同步坐标并清理 DOM。 | `BlockParticle.ts` |
| `modules/BaseBlock.ts` | `syncIframeSrcdocFromDom()` | iframe 类型 block 回写 DOM 中的 srcdoc。 | `BlockParticle.syncIframeSrcdocFromDom()` |
| `modules/IFrameBlock.ts` | `render(container)` / `syncSrcdocFromDom()` | 渲染 iframe 并回写 srcdoc。 | `modules/BaseBlock.ts` |
| `modules/VideoBlock.ts` / `modules/SvgBlock.ts` / `modules/HtmlBlock.ts` | `render(container)` | 渲染对应 block 类型 DOM。 | `modules/BaseBlock.ts` |

## 维护规则

- 新增 block 类型时先放入本目录，并保持 `BlockParticle` 作为对 Draw 层的单一入口。
- 不把 block 业务绘制重新放回 `core/draw/particle/block/`。
