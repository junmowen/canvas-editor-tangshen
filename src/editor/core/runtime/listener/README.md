# Runtime Listener 目录索引

`listener/` 存放外部监听器容器。

## 位置说明

- 所属层级：回调监听层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Listener.ts` | contentChange / pageModeChange / controlChange 等回调容器 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Listener.ts` | `rangeStyleChange` / `contentChange` / `saved` | 保存外部注册的 range、内容和保存状态回调。 | command、draw mutation、history |
| `Listener.ts` | `visiblePageNoListChange` / `intersectionPageNoChange` / `pageSizeChange` / `pageScaleChange` | 保存页面和视口变化回调。 | viewport、page setup |
| `Listener.ts` | `controlChange` / `controlContentChange` / `pageModeChange` / `zoneChange` | 保存控件、页面模式和编辑区域变化回调。 | control、page setup、zone |
