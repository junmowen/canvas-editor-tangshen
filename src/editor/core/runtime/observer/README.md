# Runtime Observer 目录索引

`observer/` 存放运行时观察者。

## 位置说明

- 所属层级：资源和交互观察层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ImageObserver.ts` | 图片预加载和异步资源等待 |
| `MouseObserver.ts` | 鼠标观察 |
| `ScrollObserver.ts` | 滚动观察 |
| `SelectionObserver.ts` | 选区观察 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ImageObserver.ts` | `add()` / `clearAll()` / `allSettled()` | 收集图片加载 promise 并等待完成。 | image、background、export |
| `ScrollObserver.ts` | `getScrollContainer()` / `removeEvent()` | 管理滚动容器和解绑滚动监听。 | viewport、lifecycle |
| `ScrollObserver.ts` | `getElementVisibleInfo()` / `getPageVisibleInfo()` | 计算元素和页面可见状态。 | lazy render、visible page |
| `SelectionObserver.ts` | `removeEvent()` | 解绑浏览器 selection 监听。 | lifecycle |
| `MouseObserver.ts` | `constructor` | 初始化鼠标状态观察。 | `DrawComponentRegistry` |
