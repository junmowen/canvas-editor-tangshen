# Runtime Zone 目录索引

`zone/` 存放编辑区域运行对象。

## 位置说明

- 所属层级：区域状态运行层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Zone.ts` | header / main / footer 区域判断和切换 |
| `ZoneTip.ts` | 区域提示 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Zone.ts` | `isHeaderActive()` / `isMainActive()` / `isFooterActive()` | 判断当前编辑区域。 | event、keyboard、command |
| `Zone.ts` | `getZone()` / `replaceZone()` / `setZone()` | 读取、替换或切换编辑区域。 | pointer、header/footer 模块 |
| `Zone.ts` | `getZoneByY(y, pageNo)` | 根据 y 坐标判断所在区域。 | pointer hit test |
| `Zone.ts` | `drawZoneIndicator()` | 绘制编辑区域提示。 | zone 切换和渲染收尾 |
| `ZoneTip.ts` | `constructor` | 创建区域提示 DOM。 | `Zone.ts` |
