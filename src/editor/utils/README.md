# Utils 目录索引

`src/editor/utils/` 存放编辑器核心可复用工具函数。

## 维护规则

- 工具函数应保持无 demo 依赖。
- 跨 core 多模块复用的纯函数可以放这里。
- 只服务单一模块的 helper 优先放在对应模块目录，避免 utils 膨胀。

## 位置说明

- 所属层级：编辑器工具层
- 上游调用：core、demo、导入导出、剪贴板
- 下游依赖：dataset、interface、浏览器 DOM

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 通用 debounce、clone、对象、字符串、DOM 和比较工具。 |
| `option.ts` | 编辑器配置合并和默认值补齐。 |
| `element*.ts` | 元素格式化、上下文、DOM 转换、布局、文本和控件工具。 |
| `clipboard.ts` | 剪贴板相关工具。 |
| `hotkey.ts` | 快捷键平台键判断。 |
| `print.ts` | 图片打印工具。 |
| `ua.ts` | 用户代理判断。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `index.ts` | `debounce()` / `throttle()` / `deepClone()` / `getUUID()` / `splitText()` | 通用节流、克隆、id 和文本拆分。 | core、demo |
| `option.ts` | `mergeOption()` | 合并编辑器配置并补齐默认值。 | `Editor`、`DrawRuntime` |
| `elementFormat.ts` | `formatElementList()` / `unzipElementList()` | 格式化元素列表和拆分文本元素。 | setValue、粘贴、导入 |
| `elementDom.ts` | `createDomFromElementList()` / `getElementListByHTML()` | 编辑器元素与 HTML DOM 互转。 | copy、paste、导出 |
| `elementText.ts` | `getTextFromElementList()` / `getSlimCloneElementList()` | 提取纯文本和轻量克隆元素。 | copy、search、worker |
| `elementLayout.ts` | `isTextLikeElement()` / `getIsBlockElement()` / `getNonHideElementIndex()` | 判断元素布局类型和可见索引。 | layout、range、event |
| `elementControl.ts` | `getControlInlineText()` / `appendControlValueSetText()` | 处理控件内联文本和值集合。 | control runtime、format |
| `print.ts` | `printImageBase64()` | 将页面图片放入 iframe 并触发打印。 | command print |
