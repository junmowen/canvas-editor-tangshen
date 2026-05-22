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

保存时留痕数据不会单独生成顶层数组，而是保存在具体元素上。`command.getValue()`、`command.getValueAsync()` 和 `Ctrl + S` 触发的保存结果都会在 `data.header`、`data.main`、`data.footer` 中携带该字段；表格单元格内的内容保存在 `trList[].tdList[].value[]` 中，同样可以携带 `trackChange`。

```typescript
const saveData: IEditorData = {
  header: [],
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
  footer: []
}
```
