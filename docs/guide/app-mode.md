# 开箱即用模式

开箱即用模式提供完整编辑器外壳，包含顶部菜单、底部状态栏、右键菜单、默认样式和业务扩展入口。只需要传入容器和文档数据即可初始化；如果需要隐藏、替换或追加菜单，可以通过 `ui` 配置完成。

## 基础使用

```ts
import { createCanvasEditorApp } from '@hufe921/canvas-editor/app'
import '@hufe921/canvas-editor/app.css'

const app = createCanvasEditorApp({
  container: document.querySelector('#editor')!,
  value: {
    main: [{ value: 'Hello World' }]
  }
})
```

返回值 `app` 包含核心编辑器实例：

```ts
app.editor.command.executeSelectAll()
const value = app.getValue()
app.destroy()
```

## 配置结构

```ts
createCanvasEditorApp({
  container,
  value,

  // 传给核心 Editor 的配置，例如纸张、字体、字号、缩放
  editor: {},

  // 配置顶部菜单、底部状态栏、右键菜单、主题和布局
  ui: {
    toolbar: {},
    footer: {},
    contextMenu: {}
  },

  // 业务副作用，例如保存、上传、打印、导出
  handlers: {},

  // 监听核心事件
  listeners: {},

  // 注册右键菜单、快捷键或初始化逻辑
  register: {}
})
```

## 菜单配置 ui.toolbar

`ui.toolbar` 支持白名单显示、排除、替换和追加。

| 配置项 | 类型 | 作用 |
| --- | --- | --- |
| `include` | `string[]` | 白名单，只显示列出的菜单。没有配置时显示默认菜单。 |
| `exclude` | `string[]` | 从当前菜单里隐藏指定菜单。 |
| `replace` | `Record<string, ToolbarItem>` | 用业务菜单替换指定内置菜单。key 是内置菜单 id。 |
| `append` | `ToolbarItem[]` | 在默认菜单后追加业务菜单。 |

显示规则：

- 不配置 `toolbar`：显示开箱即用默认菜单。
- 配置 `include`：只显示 `include` 里列出的菜单，其他菜单不显示。
- 配置 `exclude`：在默认菜单或 `include` 结果中继续隐藏指定菜单。
- 配置 `replace`：保留菜单位置，但把内置菜单行为替换成业务行为。
- 配置 `append`：额外增加业务菜单。

只显示少量菜单：

```ts
ui: {
  toolbar: {
    include: ['undo', 'redo', 'bold', 'italic', 'table', 'save']
  }
}
```

从默认菜单里隐藏部分菜单：

```ts
ui: {
  toolbar: {
    exclude: ['track-change', 'watermark', 'control-business']
  }
}
```

```ts
ui: {
  toolbar: {
    // include 是白名单：只显示列出的菜单。未配置 include 时显示默认菜单。
    include: ['undo', 'redo', 'font', 'size', 'bold', 'italic', 'table', 'pdf'],

    // exclude 从当前菜单中排除指定项
    exclude: ['track-change', 'watermark'],

    // replace 替换内置菜单
    replace: {
      pdf: {
        id: 'pdf',
        type: 'button',
        title: '导出 PDF',
        className: 'menu-item__pdf',
        run: async ctx => {
          const blob = await ctx.editor.command.getPdfBlob()
          console.log(blob)
        }
      }
    },

    // append 追加业务菜单
    append: [
      {
        id: 'business-save',
        type: 'button',
        title: '业务保存',
        className: 'menu-item__save',
        run: ctx => {
          console.log(ctx.editor.command.getValue())
        }
      }
    ]
  }
}
```

### ToolbarItem

```ts
interface ToolbarItem {
  id: string
  type: 'button' | 'select' | 'color' | 'divider'
  title?: string
  label?: string
  className?: string
  value?: string | number
  options?: Array<{ label: string; value: string | number }>
  when?: (ctx: CanvasEditorAppContext) => boolean
  active?: (ctx: CanvasEditorAppContext) => boolean
  disabled?: (ctx: CanvasEditorAppContext) => boolean
  run?: (
    ctx: CanvasEditorAppContext,
    payload?: string | number
  ) => void | Promise<void>
}
```

### 内置顶部菜单 ID

| 分类 | ID |
| --- | --- |
| 历史 | `undo`、`redo`、`painter`、`format`、`format-marker` |
| 字体 | `font`、`size`、`size-add`、`size-minus` |
| 文本样式 | `bold`、`italic`、`underline`、`underline-style`、`strikeout`、`superscript`、`subscript`、`color`、`highlight` |
| 段落 | `title`、`align-left`、`align-center`、`align-right`、`align-justify`、`align-distributed`、`row-margin`、`page-columns`、`tab-stops`、`row-indent`、`list` |
| 插入 | `table`、`image`、`hyperlink`、`separator`、`watermark`、`codeblock`、`page-break` |
| 控件和元素 | `control`、`control-business`、`checkbox`、`radio`、`latex`、`date`、`block` |
| 文档 | `search`、`print`、`docx`、`pdf`、`track-change`、`save` |

## 底部配置 ui.footer

`ui.footer` 和顶部菜单一样支持白名单、排除、替换和追加。

| 配置项 | 类型 | 作用 |
| --- | --- | --- |
| `include` | `string[]` | 白名单，只显示列出的底部项。没有配置时显示默认底栏。 |
| `exclude` | `string[]` | 从当前底栏里隐藏指定项。 |
| `replace` | `Record<string, FooterItem>` | 用业务底栏项替换指定内置底栏项。key 是内置底栏 id。 |
| `append` | `FooterItem[]` | 追加业务底栏项。 |

显示规则：

- 不配置 `footer`：显示开箱即用默认底栏。
- 配置 `include`：只显示 `include` 里列出的底部项。
- 配置 `exclude`：继续隐藏指定底部项。
- 配置 `replace`：替换某个内置底部项。
- 配置 `append`：追加业务状态或业务按钮。

只显示页码和缩放：

```ts
ui: {
  footer: {
    include: ['page-no', 'scale']
  }
}
```

从默认底栏隐藏设置入口：

```ts
ui: {
  footer: {
    exclude: ['editor-option', 'page-number-range']
  }
}
```

```ts
ui: {
  footer: {
    // 只显示页码、缩放、纸张类型和一个业务状态
    include: ['page-no', 'scale', 'paper-size', 'custom-status'],

    // 替换内置纸张类型入口
    replace: {
      'paper-size': {
        id: 'paper-size',
        label: 'A4固定',
        className: 'custom-paper-size',
        run: ctx => {
          ctx.editor.command.executePaperSize(794, 1123)
        }
      }
    },

    // 追加业务状态
    append: [
      {
        id: 'custom-status',
        align: 'left',
        label: '已同步'
      }
    ]
  }
}
```

### FooterItem

```ts
interface FooterItem {
  id: string
  align?: 'left' | 'center' | 'right'
  title?: string
  label?: string | number | ((ctx: CanvasEditorAppContext) => string | number)
  className?: string
  when?: (ctx: CanvasEditorAppContext) => boolean
  disabled?: (ctx: CanvasEditorAppContext) => boolean
  render?: (ctx: CanvasEditorAppContext) => HTMLElement
  run?: (ctx: CanvasEditorAppContext) => void | Promise<void>
}
```

### 内置底部状态栏 ID

| ID | 说明 |
| --- | --- |
| `catalog` | 目录入口 |
| `page-mode` | 分页/连页模式 |
| `visible-page-no` | 当前可见页码 |
| `page-no` | 当前页码/总页数 |
| `word-count` | 字数 |
| `cursor-position` | 当前行列 |
| `editor-mode` | 编辑/清洁/只读/表单/打印/设计模式 |
| `scale` | 缩放控制 |
| `paper-size` | 纸张类型 |
| `paper-direction` | 纸张方向 |
| `paper-margin` | 页边距入口 |
| `page-number-range` | 页码范围入口 |
| `fullscreen` | 全屏入口 |
| `editor-option` | 编辑器设置入口 |

## 右键菜单

`ui.contextMenu` 控制内置右键菜单和自定义菜单。

```ts
ui: {
  contextMenu: {
    // default：保留内置右键菜单，并追加自定义菜单
    // custom：隐藏内置右键菜单，只显示自定义菜单
    // none：禁用 app 层右键菜单
    mode: 'custom',

    // 禁用指定内置菜单 key
    disableKeys: ['globalCopy'],

    // 注册自定义右键菜单
    menus: [
      {
        name: '查看文档数据',
        when: () => true,
        callback: command => {
          console.log(command.getValue())
        }
      }
    ]
  }
}
```

如果只想关闭所有 app 右键菜单：

```ts
ui: {
  contextMenu: {
    mode: 'none'
  }
}
```

## 业务处理函数

顶部菜单中的保存、上传、导出等副作用建议通过 `handlers` 注入。

```ts
createCanvasEditorApp({
  container,
  value,
  handlers: {
    save: ctx => {
      const value = ctx.editor.command.getValue()
      console.log(value)
    },
    uploadImage: async file => {
      const url = await uploadFile(file)
      return { url }
    },
    exportPdf: async ctx => {
      const blob = await ctx.editor.command.getPdfBlob({
        fonts: [
          // 中文或 Unicode 文本建议传入 TTF 字体
        ]
      })
      download(blob)
    }
  }
})
```

## 监听和注册

创建时配置：

```ts
createCanvasEditorApp({
  container,
  value,
  listeners: {
    contentChange: () => {
      console.log('内容变化')
    },
    pageScaleChange: scale => {
      console.log(scale)
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

运行时追加：

```ts
const off = app.on({
  contentChange: () => {
    console.log('内容变化')
  }
})

app.register({
  contextMenus: [
    {
      name: '运行时菜单',
      when: () => true,
      callback: command => {
        console.log(command.getValue())
      }
    }
  ]
})

off()
```

## 完整示例

```ts
const app = createCanvasEditorApp({
  container: document.querySelector('#editor')!,
  value,
  editor: {
    width: 794,
    height: 1123,
    defaultFont: 'Microsoft YaHei',
    defaultSize: 16,
    scale: 1
  },
  ui: {
    toolbar: {
      include: ['undo', 'redo', 'font', 'size', 'bold', 'italic', 'table', 'pdf', 'save']
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
          name: '查看文档数据',
          when: () => true,
          callback: command => {
            console.log(command.getValue())
          }
        }
      ]
    }
  },
  handlers: {
    save: ctx => {
      console.log(ctx.editor.command.getValue())
    }
  }
})
```
