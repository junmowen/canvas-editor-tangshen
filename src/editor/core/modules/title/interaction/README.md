# Title Interaction 目录说明

`title/interaction/` 存放标题元素在输入和回车时的上下文规则。

## 位置说明

- 所属业务：`title`
- 所属层级：业务交互策略层
- 上游调用：keyboard Enter / 输入链路
- 下游依赖：标题锚点和段落边界

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TitleEnterPolicy.ts` | 判断回车时标题锚点是否跨标题边界继承。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TitleEnterPolicy.ts` | `shouldCopyEnterAnchorAcrossTitleBoundary()` | 判断标题上下文回车后是否复制 enter anchor。 | `EnterIntent.ts`、段落规则 |
