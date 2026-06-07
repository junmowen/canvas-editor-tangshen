# 获取数据命令

## 使用方式

```javascript
import Editor from "@hufe921/canvas-editor"

const instance = new Editor(container, <IElement[]>data, options)
const value = instance.command.commandName()
```

## getValue

功能：获取当前文档信息

用法：

```javascript
const {
  version: string
  data: IEditorData
  options: IEditorOption
} = instance.command.getValue(options?: IGetValueOption)
```

## getValueAsync

功能：获取当前文档信息（异步）

用法：

```javascript
const {
  version: string
  data: IEditorData
  options: IEditorOption
} = await instance.command.getValueAsync(options?: IGetValueOption)
```

## getImage

功能：获取当前页面图片 base64 字符串

用法：

```javascript
const base64StringList = await instance.command.getImage(option?: IGetImageOption)
```

## getOptions

功能：获取编辑器配置

用法：

```javascript
const editorOption = await instance.command.getOptions()
```

## getWordCount

功能：获取文档字数

用法：

```javascript
const wordCount = await instance.command.getWordCount()
```

## getCursorPosition

功能: 获取光标位置坐标

用法:

```javascript
const range = instance.command.getCursorPosition()
```

## getRange

功能：获取选区

用法：

```javascript
const range = instance.command.getRange()
```

## getRangeText

功能：获取选区文本

用法：

```javascript
const rangeText = instance.command.getRangeText()
```

## getRangeContext

功能：获取选区上下文

用法：

```javascript
const rangeContext = instance.command.getRangeContext()
```

## getRangeRow

功能：获取选区所在行元素列表

用法：

```javascript
const rowElementList = instance.command.getRangeRow()
```

## getKeywordRangeList

功能：获取关键词所在选区列表

用法：

```javascript
const rangeList = instance.command.getKeywordRangeList()
```

## getKeywordContext

功能：获取关键词所在上下文本信息

用法：

```javascript
const keywordContextList = instance.command.getKeywordContext(payload: string)
```

## getRangeParagraph

功能：获取选区所在段落元素列表

用法：

```javascript
const paragraphElementList = instance.command.getRangeParagraph()
```

## getPaperMargin

功能：获取页边距

用法：

```javascript
const [top: number, right: number, bottom: number, left: number] =
  instance.command.getPaperMargin()
```

## getSearchNavigateInfo

功能：获取搜索导航信息

用法：

```javascript
const {
  index: number;
  count: number;
} = instance.command.getSearchNavigateInfo()
```

## getCatalog

功能：获取目录

用法：

```javascript
const catalog = await instance.command.getCatalog()
```

## getHTML

功能：获取 HTML

用法：

```javascript
const {
  header: string
  main: string
  footer: string
} = await instance.command.getHTML()
```

## getText

功能：获取文本

用法：

```javascript
const {
  header: string
  main: string
  footer: string
} = await instance.command.getText()
```

## getLocale

功能：获取当前语言

用法：

```javascript
const locale = await instance.command.getLocale()
```

## getOoxmlPackageParts

功能：获取当前文档的 OOXML package 部件集合，可用于调试 DOCX XML、接入自定义打包或对比导出结果。

用法：

```javascript
const parts = instance.command.getOoxmlPackageParts()
```

返回值：

```typescript
interface IOoxmlPackageParts {
  '[Content_Types].xml': string
  '_rels/.rels': string
  'word/document.xml': string
  'word/_rels/document.xml.rels': string
  'word/styles.xml': string
  'word/fontTable.xml': string
  'word/numbering.xml': string
  'word/settings.xml': string
  'docProps/core.xml': string
  'docProps/app.xml': string
  [path: string]: string | Uint8Array
}
```

- `word/header*.xml`、`word/footer*.xml`：存在页眉页脚作用域时生成。
- `word/media/*`：存在图片、签章等媒体资源时生成，值为二进制字节。
- 调用前会刷新当前异步插入事务，返回的是当前编辑器状态对应的 package 快照。

## getOoxmlDocxBlob

功能：获取当前文档的 DOCX Blob。

用法：

```javascript
const blob = instance.command.getOoxmlDocxBlob()
```

返回值：

```typescript
Blob
```

返回的 Blob 类型为 DOCX MIME，可用于下载、上传或后续打印链路。

## getPdfBlob

功能：获取当前文档的 PDF Blob。内部复用 SVG 打印页面并转换为矢量 PDF，不弹出浏览器打印框。

用法：

```javascript
const blob = await instance.command.getPdfBlob(options?: IPrintPdfDocumentOption)
```

返回值：

```typescript
Blob
```

返回的 Blob 类型为 PDF，可用于下载或上传。当前链路按页面 SVG 转 PDF，优先保证文字、线条和常规矢量对象清晰；图片资源仍按原始图片数据嵌入。

选项：

```typescript
interface IPrintPdfDocumentOption {
  /** 是否压缩 PDF 内容流，默认 true。 */
  compress?: boolean
  /** PDF 使用的 TTF 字体列表；包含中文时必须传入至少一个支持中文的字体。 */
  fonts?: IPrintPdfFontFace[]
  /** 包含非 ASCII 文本但未提供字体时是否抛错，默认 true。 */
  requireFontsForUnicodeText?: boolean
}

interface IPrintPdfFontFace {
  /** 字体族名称，需要和 SVG font-family 或 aliases 匹配。 */
  name: string
  /** 字体文件名，注册 VFS 时使用。未传时根据 name 自动生成。 */
  fileName?: string
  /** 字体二进制、base64 或 data URL。 */
  source?: ArrayBuffer | Uint8Array | string
  /** 字体文件地址，适合把字体放在静态资源目录后按需加载。 */
  url?: string
  /** 额外匹配的 SVG font-family 名称，可包含中文；不会直接注册为 PDF 内部字体名。 */
  aliases?: string[]
  /** 需要注册的字体样式。默认注册 normal/bold/italic/bolditalic。 */
  styles?: string[]
}
```

包含中文、日文、韩文等 Unicode 文本时，必须传入支持对应字符的 TTF 字体，否则 PDF 阅读器会因为 jsPDF 默认字体不支持这些字符而出现乱码。
PDF 内部字体名只能使用 ASCII；`aliases` 只用于把 SVG 中的 `font-family` 映射到已注册字体，业务侧可以放心传入 `微软雅黑`、`宋体` 等中文字体名。
当 SVG 文本使用未命中的字体族但文本本身包含 Unicode 字符时，导出会自动落到 `fonts[0]` 注册的字体，避免局部文本静默回退到 jsPDF 默认字体。

```javascript
const blob = await instance.command.getPdfBlob({
  fonts: [
    {
      name: 'Microsoft YaHei',
      fileName: 'CJK-Regular.ttf',
      url: '/fonts/CJK-Regular.ttf',
      styles: ['normal', 'italic'],
      aliases: ['微软雅黑', 'SimSun', '宋体']
    },
    {
      name: 'Microsoft YaHei',
      fileName: 'CJK-Bold.ttf',
      url: '/fonts/CJK-Bold.ttf',
      styles: ['bold', 'bolditalic'],
      aliases: ['微软雅黑', 'SimSun', '宋体']
    }
  ]
})
```

demo 默认从 `public/fonts` 读取本机提取的微软雅黑 Regular/Bold TTF。Windows 本地手动测试前先执行：

```bash
npm run demo:pdf-fonts
```

生成的字体文件仅用于本机 demo 验证，已被 git 忽略；生产项目需要传入自有授权字体文件。

## getGroupIds

功能：获取所有成组 id

用法：

```javascript
const groupIds = await instance.command.getGroupIds()
```

## getControlValue

功能：获取控件值

用法：

```javascript
const {
  value: string | null
  innerText: string | null
  zone: EditorZone
  elementList?: IElement[]
}[] = await instance.command.getControlValue(payload: IGetControlValueOption)
```

## getControlList

功能：获取所有控件

用法：

```javascript
const controlList = await instance.command.getControlList()
```

## getContainer

功能：获取编辑器容器

用法：

```javascript
const container = await instance.command.getContainer()
```

## getTitleValue

功能：获取标题值

用法：

```javascript
const {
  value: string | null
  elementList: IElement[]
  zone: EditorZone
}[] = await instance.command.getTitleValue(payload: IGetTitleValueOption)
```

## getPositionContextByEvent

功能：获取位置上下文信息通过鼠标事件

用法：

```javascript
const {
  pageNo: number
  element: IElement | null
  rangeRect: RangeRect | null
  tableInfo: ITableInfoByEvent | null
}[] = await instance.command.getPositionContextByEvent(evt: MouseEvent, options?: IPositionContextByEventOption)
```

示例：

```javascript
instance.eventBus.on(
  'mousemove',
  debounce(evt => {
    const positionContext = instance.command.getPositionContextByEvent(evt)
    console.log(positionContext)
  }, 200)
)``
```

## getElementById

功能：根据 id 获取元素

用法：

```javascript
const elementList = await instance.command.getElementById(payload: IGetElementByIdOption)
```

## getTrackChangeList

功能：获取当前文档中的修订留痕批次列表。

用法：

```javascript
const trackChangeList = instance.command.getTrackChangeList()
```

返回值：

```typescript
interface ITrackChangeRecord {
  id: string // 同一次修订操作的唯一标识
  type: 'insert' | 'delete' // 修订类型
  author?: string // 修订作者
  timestamp: number // 修订发生时间戳
  elementList: IElement[] // 当前修订批次包含的元素快照
  rectList: ITrackChangeRect[] // 当前修订批次在文档中的可视矩形
}

interface ITrackChangeRect {
  pageNo: number // 页码，从 0 开始
  x: number // 相对编辑器页面容器左上角的横坐标
  y: number // 相对编辑器页面容器左上角的纵坐标
  width: number // 矩形宽度
  height: number // 矩形高度
}
```

## getGroupRectList

功能：获取指定批注分组在当前文档中的可视矩形，常用于绘制批注卡片与正文的关联线。

用法：

```javascript
const rectList = instance.command.getGroupRectList(groupId: string)
```

返回值：

```typescript
interface ITrackChangeRect {
  pageNo: number
  x: number
  y: number
  width: number
  height: number
}
```

## getAreaValue

功能: 获取区域数据
用法：

```js
const {
  id?: string
  area: IArea
  value: IElement[]
  startPageNo: number
  endPageNo: number
} = instance.command.getAreaValue(options: IGetAreaValueOption)
```
