# 数据结构

```typescript
interface IElement {
  // 基础
  id?: string;
  type?: {
    TEXT = 'text',
    IMAGE = 'image',
    TABLE = 'table',
    HYPERLINK = 'hyperlink',
    SUPERSCRIPT = 'superscript',
    SUBSCRIPT = 'subscript',
    SEPARATOR = 'separator',
    PAGE_BREAK = 'pageBreak',
    CONTROL = 'control',
    CHECKBOX = 'checkbox',
    RADIO = 'radio',
    LATEX = 'latex',
    TAB = 'tab',
    DATE = 'date',
    BLOCK = 'block'
  };
  value: string;
  valueList?: IElement[]; // 复合元素（超链接、标题、列表等）使用
  extension?: unknown;
  externalId?: string;
  hide?: boolean;
  trackChange?: {
    id: string; // 同一次修订操作的唯一标识
    type: 'insert' | 'delete'; // 修订类型：插入或删除
    author?: string; // 修订作者
    timestamp: number; // 修订发生时间戳
    color?: string; // 当前痕迹显示颜色
  };
  // 样式
  font?: string;
  size?: number;
  width?: number;
  height?: number;
  bold?: boolean;
  color?: string;
  highlight?: string;
  italic?: boolean;
  underline?: boolean;
  strikeout?: boolean;
  rowFlex?: {
    LEFT = 'left',
    CENTER = 'center',
    RIGHT = 'right',
    ALIGNMENT = 'alignment',
    JUSTIFY = 'justify'
  };
  rowMargin?: number;
  letterSpacing?: number;
  textDecoration?: {
    style?: TextDecorationStyle;
  };
  // 组信息-可用于批注等其他成组使用场景
  groupIds?: string[];
  // 表格
  conceptId?: string;
  colgroup?: {
    width: number;
  }[];
  trList?: {
    height: number;
    pagingRepeat?: boolean;
    extension?: unknown;
    externalId?: string;
    tdList: {
      colspan: number;
      rowspan: number;
      conceptId?: string;
      verticalAlign?: VerticalAlign;
      backgroundColor?: string;
      borderTypes?: TdBorder[];
      borderColor?: string;
      borderWidth?: number;
      slashTypes?: TdSlash[];
      value: IElement[];
      extension?: unknown;
      externalId?: string;
      disabled?: boolean;
      deletable?: boolean;
    }[];
  }[];
  borderType?: TableBorder;
  borderColor?: string;
  borderWidth?: number;
  borderExternalWidth?: number;
  tableToolDisabled?: boolean;
  // 超链接
  url?: string;
  // 上下标
  actualSize?: number;
  // 分割线
  dashArray?: number[];
  // 控件
  control?: {
    type: {
      TEXT = 'text',
      SELECT = 'select',
      CHECKBOX = 'checkbox',
      RADIO = 'radio'
      DATE = 'date',
      NUMBER = 'number'
    };
    value: IElement[] | null;
    placeholder?: string;
    conceptId?: string;
    prefix?: string;
    postfix?: string;
    preText?: string;
    postText?: string;
    minWidth?: number;
    underline?: boolean;
    border?: boolean;
    extension?: unknown;
    indentation?: ControlIndentation;
    rowFlex?: RowFlex
    deletable?: boolean;
    disabled?: boolean;
    pasteDisabled?: boolean;
    hide?: boolean;
    code: string | null;
    min?: number;
    max?: number;
    flexDirection: FlexDirection;
    valueSets: {
      value: string;
      code: string;
    }[];
    isMultiSelect?: boolean;
    multiSelectDelimiter?: string;
    dateFormat?: string;
    font?: string;
    size?: number;
    bold?: boolean;
    color?: string;
    highlight?: string;
    italic?: boolean;
    strikeout?: boolean;
    selectExclusiveOptions?: {
      inputAble?: boolean;
    }
  };
  controlComponent?: {
    PREFIX = 'prefix',
    POSTFIX = 'postfix',
    PLACEHOLDER = 'placeholder',
    VALUE = 'value',
    CHECKBOX = 'checkbox',
    RADIO = 'radio'
  };
  // 复选框
  checkbox?: {
    value: boolean | null;
  };
  // 单选框
  radio?: {
    value: boolean | null;
  };
  // LaTeX
  laTexSVG?: string;
  // 日期
  dateFormat?: string;
  // 图片
  imgDisplay?: {
    INLINE = 'inline',
    BLOCK = 'block'
  }
  imgFloatPosition?: {
    x: number;
    y: number;
    pageNo?: number;
  }
  imgToolDisabled?: boolean;
  // 内容块
  block?: {
    type: {
      IFRAME = 'iframe',
      VIDEO = 'video'
    };
    iframeBlock?: {
      src?: string;
      srcdoc?: string;
    };
    videoBlock?: {
      src: string;
    };
  };
  // 标题
  level?: TitleLevel;
  title?: {
    conceptId?: string;
    deletable?: boolean;
    disabled?: boolean;
  };
  // 列表
  listType?: ListType;
  listStyle?: ListStyle;
  listLevel?: number; // 列表层级，0 或 undefined 表示一级列表，1 表示二级列表
  listWrap?: boolean;
  // 区域
  areaId?: string;
  area?: {
    extension?: unknown;
    top?: number;
    hide?: boolean;
    borderColor?: string;
    backgroundColor?: string;
    mode?: AreaMode;
    deletable?: boolean;
    placeholder?: IPlaceholder;
  };
}
```

## 修订留痕数据

当开启 `trackChange.enabled` 后，编辑产生的修订会保存在元素的 `trackChange` 字段上。

```typescript
interface ITrackChange {
  id: string
  type: 'insert' | 'delete'
  author?: string
  timestamp: number
  color?: string
}
```

- `insert`：表示该元素是新增内容。接受修订时会移除 `trackChange` 标记，拒绝修订时会移除该元素。
- `delete`：表示该元素是被删除内容。接受修订时会移除该元素，拒绝修订时会移除 `trackChange` 标记并保留原文。
- 同一次插入或删除产生的多个元素会使用相同的 `id`，便于按批次接受或拒绝。

保存时留痕数据不会单独生成顶层数组，而是保存在具体元素上。`command.getValue()`、`command.getValueAsync()` 和 `Ctrl + S` 触发的保存结果会在 `data.headerPageScopes[].elementList`、`data.main`、`data.footerPageScopes[].elementList` 中携带该字段；表格单元格内的内容保存在 `trList[].tdList[].value[]` 中，同样可以携带 `trackChange`。

```typescript
const saveData: IEditorData = {
  headerPageScopes: [],
  main: [
    {
      value: '新增内容',
      trackChange: {
        id: 'change-insert-001', // 同一次修订操作的唯一标识，多个元素可共用同一个 id
        type: 'insert', // 插入留痕：该元素为新增内容
        author: '张三', // 修订作者
        timestamp: 1716172800000, // 修订发生时间戳，单位毫秒
        color: '#047857' // 留痕显示颜色
      }
    },
    {
      value: '',
      type: 'table',
      trList: [
        {
          height: 42,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              value: [
                {
                  value: '表格内新增',
                  trackChange: {
                    id: 'change-table-001', // 表格单元格内元素同样保存留痕信息
                    type: 'insert', // 插入留痕
                    author: '张三', // 修订作者
                    timestamp: 1716172800000, // 修订发生时间戳，单位毫秒
                    color: '#047857' // 留痕显示颜色
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      value: '删除内容',
      trackChange: {
        id: 'change-delete-001', // 同一次删除操作的唯一标识
        type: 'delete', // 删除留痕：该元素仍保留在数据中，接受修订后才会移除
        author: '李四', // 修订作者
        timestamp: 1716172900000, // 修订发生时间戳，单位毫秒
        color: '#DC2626' // 留痕显示颜色
      }
    }
  ],
  footerPageScopes: []
}
```

## 控件值集与远程选项数据

选择类控件、复选框和单选框的候选项统一使用 `IValueSet`。`code` 是业务保存值，`value` 是显示文本。

```typescript
interface IValueSet {
  value: string
  code: string | number
}

interface IControlRemoteOptions {
  loading?: boolean
  error?: string | null
  source?: string
  requestId?: string
}

interface IControlRemoteOptionLoadOption extends IGetControlValueOption {
  source?: string
  requestId?: string
  params?: unknown
  isSubmitHistory?: boolean
}

interface IControlRemoteOptionLoadContext {
  option: IControlRemoteOptionLoadOption
  controlId?: string
  control: IControl
  value: string | null
  zone: EditorZone
}

interface IControlRemoteOptionLoadResult {
  valueSets: IValueSet[]
  remote?: IControlRemoteOptions
}

type IControlRemoteOptionLoader = (
  payload: IControlRemoteOptionLoadContext
) => IControlRemoteOptionLoadResult | Promise<IControlRemoteOptionLoadResult>

type ControlRemoteOptionLoadFailureReason =
  | 'not_found'
  | 'unsupported'
  | 'load_failed'

interface IControlRemoteOptionLoadFailure {
  option: IControlRemoteOptionLoadOption
  reason: ControlRemoteOptionLoadFailureReason
  message: string
  controlId?: string
}

interface IControlRemoteOptionLoadBatchResult {
  successCount: number
  failureList: IControlRemoteOptionLoadFailure[]
}
```

编辑器初始化时可以通过 `options.controlInitialProperties` 写入外部候选项，也可以通过 `options.controlRemoteOptionLoader` 接入异步加载。

```typescript
interface IEditorOption {
  controlInitialProperties?: ISetControlProperties[]
  controlInitialValues?: ISetControlValueOption[]
  controlRemoteOptionLoader?: IControlRemoteOptionLoader
}

type ISetControlProperties = {
  id?: string
  conceptId?: string
  areaId?: string
  externalId?: string
  code?: string | number
  properties: Partial<Omit<IControl, 'value'>>
  isSubmitHistory?: boolean
}
```

示例：

```javascript
const instance = new Editor(container, data, {
  controlInitialProperties: [
    {
      externalId: 'patient.city',
      properties: {
        valueSets: [
          { code: 'gz', value: '广州' },
          { code: 'sz', value: '深圳' }
        ]
      }
    }
  ],
  controlRemoteOptionLoader: async ({ option }) => {
    const response = await fetch(`/dict/${option.source}`)
    const valueSets = await response.json()
    return {
      valueSets,
      remote: {
        loading: false,
        source: option.source,
        requestId: option.requestId
      }
    }
  }
})
```

## OOXML 导入导出数据

`command.getOoxmlPackageParts()` 返回当前文档的 OOXML package 部件集合。固定部件是字符串 XML，`word/media/*` 等媒体部件是二进制字节。

```typescript
type OoxmlZipPartContent = string | Uint8Array

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
  [path: string]: OoxmlZipPartContent
}
```

高层 DOCX 导入结果用于把 DOCX 字节恢复成编辑器数据和页面设置子集。该结构由 OOXML 导入层返回，业务侧可用它做导入调试或自定义导入流程。

```typescript
interface IOoxmlImportedDocxPackage {
  parts: Record<string, Uint8Array>
  textParts: Record<string, string>
  documentXml: string
}

interface IOoxmlImportedEditorDataResult extends IOoxmlImportedDocxPackage {
  data: IEditorData
  options: Partial<IEditorOption>
}

interface IOoxmlDocumentImportResult {
  elementList: IElement[]
  data: IEditorData
}

interface IOoxmlDocumentImportOption {
  relationships?: Record<string, unknown>
  packageParts?: Record<string, Uint8Array>
  imageDataUrlCache?: Map<string, string>
  trackChange?: ITrackChange
}

interface IOoxmlHeaderFooterImportOption extends IOoxmlDocumentImportOption {
  rootLocalName: 'hdr' | 'ftr'
}

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

常用 API 对应关系：

```typescript
const parts: IOoxmlPackageParts = instance.command.getOoxmlPackageParts()
const blob: Blob = instance.command.getOoxmlDocxBlob()
const pdfBlob: Blob = await instance.command.getPdfBlob()
const uncompressedPdfBlob: Blob = await instance.command.getPdfBlob({
  compress: false,
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

PDF 导出包含 CJK 等 Unicode 文本时需要显式传入 TTF 字体。`aliases` 负责把编辑器/SVG 中的 `微软雅黑`、`宋体` 等字体名映射到 jsPDF 可接受的 ASCII 内部字体名；如果文本包含 Unicode 但字体族没有命中任何 alias，会使用 `fonts[0]` 作为默认 CJK 字体。
