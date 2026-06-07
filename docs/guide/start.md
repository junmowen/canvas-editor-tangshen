# 入门

> 所见即所得的富文本编辑器。

得益于光标及文字排版的完全自行实现。绘制底层也可由 svg 渲染，详见代码：[feature/svg](https://github.com/Hufe921/canvas-editor/tree/feature/svg)；或借助 pdfjs 可以完成 pdf 的绘制，详见代码：[feature/pdf](https://github.com/Hufe921/canvas-editor/tree/feature/pdf)。

::: warning
官方 npm 包提供两种入口：开箱即用模式内置常用工具栏、页脚和布局；纯编辑器模式只暴露核心 `Editor`，菜单栏或其他外部工具可自行参考文档扩展。
:::

## 功能点

- 富文本操作（撤销、重做、字体、字号、加粗、斜体、下划线、删除线、上下标、对齐方式、标题、列表.....）
- 插入元素（表格、图片、链接、代码块、分页符、Math 公式、日期选择器、内容块......）
- 打印（基于 canvas 转图片、pdf 绘制）
- 控件（单选、文本、日期、单选框组、复选框组）
- 右键菜单（内部、自定义）
- 快捷键（内部、自定义）
- 拖拽（文字、元素、控件）
- 页眉、页脚、页码
- 页边距
- 分页
- 水印
- 批注
- 目录
- [插件](https://github.com/Hufe921/canvas-editor-plugin)

## 待开发

- 计算性能
- 控件规则
- 表格分页
- vue、react 等框架组件封装

## Step. 1: 下载 npm 包

```sh
npm i @hufe921/canvas-editor --save
```

## Step. 2: 准备一个容器

```html
<div class="canvas-editor"></div>
```

## Step. 3: 实例化编辑器

- 开箱即用模式

```javascript
import { createCanvasEditorApp } from '@hufe921/canvas-editor/app'
import '@hufe921/canvas-editor/app.css'

createCanvasEditorApp({
  container: document.querySelector('.canvas-editor'),
  value: {
    main: [
      {
        value: 'Hello World'
      }
    ]
  }
})
```

开箱即用模式的菜单、底栏、右键菜单、监听器和注册入口都可以配置。`include` 表示只显示配置过的项，没配置的项不显示；`exclude` 表示在默认项中排除指定项。

完整配置说明见：[开箱即用模式](./app-mode.md)。

```javascript
createCanvasEditorApp({
  container: document.querySelector('.canvas-editor'),
  value,
  ui: {
    toolbar: {
      include: ['undo', 'redo', 'bold', 'italic', 'table', 'save']
    },
    footer: {
      include: ['page-no', 'scale', 'paper-size', 'custom-status'],
      append: [
        {
          id: 'custom-status',
          align: 'left',
          label: '已同步'
        }
      ]
    },
    contextMenu: {
      mode: 'custom',
      menus: [
        {
          name: '业务操作',
          when: () => true,
          callback: command => {
            console.log(command.getValue())
          }
        }
      ]
    }
  },
  listeners: {
    contentChange: () => {
      console.log('content changed')
    }
  },
  register: {
    shortcuts: [
      {
        key: 'S',
        mod: true,
        callback: command => {
          console.log(command.getValue())
        }
      }
    ],
    setup: ctx => {
      console.log(ctx.editor)
    }
  }
})
```

也可以在实例创建后继续注册业务入口：

```javascript
const app = createCanvasEditorApp({ container, value })

const off = app.on({
  contentChange: () => {
    console.log('content changed')
  }
})

app.register({
  contextMenus: [
    {
      name: '业务操作',
      when: () => true,
      callback: command => {
        console.log(command.getValue())
      }
    }
  ]
})
```

- 仅包含正文内容

```javascript
import Editor from '@hufe921/canvas-editor'

new Editor(
  document.querySelector('.canvas-editor'),
  [
    {
      value: 'Hello World'
    }
  ],
  {}
)
```

- 包含正文、页眉、页脚内容

```javascript
import Editor from '@hufe921/canvas-editor'

new Editor(
  document.querySelector('.canvas-editor'),
  {
    headerPageScopes: [
      {
        pageScope: 'all',
        elementList: [
          {
            value: 'Header',
            rowFlex: RowFlex.CENTER
          }
        ]
      }
    ],
    main: [
      {
        value: 'Hello World'
      }
    ],
    footerPageScopes: [
      {
        pageScope: 'all',
        elementList: [
          {
            value: 'canvas-editor',
            size: 12
          }
        ]
      }
    ]
  },
  {}
)
```

## Step. 4: 配置编辑器

详见下一节
