# Demo Menus 目录说明

`demo/menus/` 存放 demo 工具栏和面板绑定逻辑。

## 位置说明

- 所属层级：demo 交互层 / 菜单
- 上游调用：`demo/main.ts`
- 下游依赖：`Editor` command API、`Dialog`、demo DOM

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `dialogValue.ts` | 弹窗值读取和数字解析工具。 |
| `setupInsertMenus.ts` | 插入菜单绑定。 |
| `setupFooterOptions.ts` | 页脚、目录、页面设置、评论等选项绑定。 |
| `setupTrackChange.ts` | 修订留痕面板和评论连线绑定。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `dialogValue.ts` | `getDialogValue()` / `parseDialogPositiveInteger()` / `parseDialogOptionalInteger()` / `parseDialogNumberList()` | 读取和解析弹窗输入值。 | demo 菜单设置 |
| `setupInsertMenus.ts` | `setupInsertMenus(instance)` | 绑定表格、图片、超链接、水印、控件、block 等插入菜单。 | `main.ts` |
| `setupFooterOptions.ts` | `setupFooterOptions(...)` | 绑定目录、页面模式、纸张、页码、分栏、评论等底部选项。 | `main.ts` |
| `setupTrackChange.ts` | `setupTrackChange(instance, container)` | 绑定修订留痕开关、面板、接受 / 拒绝和连线。 | `main.ts` |
