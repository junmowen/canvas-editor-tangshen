# Draw Track Change 目录说明

`track-change/` 存放修订记录服务，负责标记插入、删除并支持接受或拒绝修订。

## 位置说明

- 所属层级：公共绘制层 / 修订状态层
- 上游调用：`DrawMutationService`、删除和输入链路
- 下游依赖：正文元素列表和修订配置

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TrackChangeService.ts` | 维护修订记录、插入标记、删除应用和接受 / 拒绝操作。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TrackChangeService.ts` | `isEnabled()` / `setOptions()` | 判断和更新修订配置。 | `Draw.ts`、外部配置链路 |
| `TrackChangeService.ts` | `markInsertList()` / `applyDelete()` | 为插入或删除元素生成修订记录。 | mutation、键盘删除 |
| `TrackChangeService.ts` | `acceptChange()` / `rejectChange()` / `acceptAll()` / `rejectAll()` | 接受或拒绝指定 / 全部修订。 | command、外部 API |
| `TrackChangeService.ts` | `getRecordList()` / `endEditSession()` | 读取修订记录并结束编辑会话。 | 状态查询、提交链路 |
