# Pointer Actions 目录说明

`pointer/actions/` 存放鼠标交互中的动作切片。DOM handler 负责读取原生事件并按顺序调度，这里的文件负责具体动作判断和状态写入。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `KeepContextMenuSelectionAction.ts` | 右键菜单打开前保留跨行列或非闭合选区。 |
| `StartSelectedRangeDragAction.ts` | 从已有选区命中位置开始拖拽。 |
| `StartRowDragAction.ts` | 从行拖拽手柄开始段落拖拽。 |
| `StartSelectionAction.ts` | 普通鼠标按下后的选区起点处理。 |
