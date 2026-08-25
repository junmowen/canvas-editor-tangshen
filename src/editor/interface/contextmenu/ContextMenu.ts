import { Command } from '../../core/command/Command'
import { EditorZone } from '../../dataset/enum/Editor'
import { DeepRequired } from '../Common'
import { IEditorOption } from '../Editor'
import { IElement } from '../Element'
import {
  IChartGraphicHitQueryPayload,
  IChartGraphicHitQueryResult
} from '../../core/modules/chart-graphics/model/ChartGraphic'

/** 上下文menu上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IContextMenuContext {
  /** 起始元素，用于标记范围左边界对应的文档元素。 */
  startElement: IElement | null
  /** 结束元素，用于标记范围右边界对应的文档元素。 */
  endElement: IElement | null
  /** 是否只读，用于阻止内容修改。 */
  isReadonly: boolean
  /** 编辑器has选区开关，用于控制当前流程的判断分支。 */
  editorHasSelection: boolean
  /** 编辑器文本focus开关，用于控制当前流程的判断分支。 */
  editorTextFocus: boolean
  /** 是否位于表格内，用于启用表格菜单和表格编辑逻辑。 */
  isInTable: boolean
  /** 是否跨行列选择，用于判断表格选区形态。 */
  isCrossRowCol: boolean
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone: EditorZone
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number | null
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number | null
  /** 表格元素对象，作为表格遍历和渲染的入口。 */
  tableElement: IElement | null
  /** 操作配置项，用于调整当前流程的可选行为。 */
  options: DeepRequired<IEditorOption>
  /** 图表内部命中结果，供图表菜单按牙位 / 牙面上下文决定行为。 */
  chartGraphicHit?: IChartGraphicHitQueryResult | null
  /** 图表命中的原始页内坐标载荷，供桥接命令复用。 */
  chartGraphicHitPayload?: IChartGraphicHitQueryPayload | null
}

/** register上下文menu契约，用于约束公开 API中传递的数据结构。 */
export interface IRegisterContextMenu {
  /** key文本，用于标识、展示或匹配当前对象。 */
  key?: string
  /** i18npath文本，用于标识、展示或匹配当前对象。 */
  i18nPath?: string
  /** 是否分割线菜单项，用于渲染菜单分组间隔。 */
  isDivider?: boolean
  /** icon文本，用于标识、展示或匹配当前对象。 */
  icon?: string
  /** 显示名称或注册名称，用于界面展示和模块查找。 */
  name?: string
  /** shortcut文本，用于标识、展示或匹配当前对象。 */
  shortCut?: string
  /** 禁用动作或禁用状态配置，用于关闭对应能力。 */
  disable?: boolean
  /** when函数，用于封装当前对象暴露的行为。 */
  when?: (payload: IContextMenuContext) => boolean
  /** 回调函数，用于在当前异步流程完成后通知调用方。 */
  callback?: (command: Command, context: IContextMenuContext) => any
  /** childmenus列表，保存同类数据的有序集合。 */
  childMenus?: IRegisterContextMenu[]
}

/** contextmenu语言包结构，约束界面文案的本地化键。 */
export interface IContextmenuLang {
  global: {
    /** cut文本，用于标识、展示或匹配当前对象。 */
    cut: string
    /** copy文本，用于标识、展示或匹配当前对象。 */
    copy: string
    /** paste文本，用于标识、展示或匹配当前对象。 */
    paste: string
    /** selectall文本，用于标识、展示或匹配当前对象。 */
    selectAll: string
    /** 打印文本，用于标识、展示或匹配当前对象。 */
    print: string
  }
  /** 控件配置对象，描述当前控件的行为和取值规则。 */
  control: {
    /** 删除动作配置，用于触发或描述内容移除行为。 */
    delete: string
  }
  hyperlink: {
    /** 删除动作配置，用于触发或描述内容移除行为。 */
    delete: string
    /** cancel文本，用于标识、展示或匹配当前对象。 */
    cancel: string
    /** edit文本，用于标识、展示或匹配当前对象。 */
    edit: string
  }
  image: {
    /** 图片属性入口，用于打开图片属性配置弹窗。 */
    property: string
    /** change文本，用于标识、展示或匹配当前对象。 */
    change: string
    /** saveas文本，用于标识、展示或匹配当前对象。 */
    saveAs: string
    /** 文本wrap文本，用于标识、展示或匹配当前对象。 */
    textWrap: string
    /** 图片显示方式文本。 */
    display: string
    /** 图片宽度文本。 */
    width: string
    /** 图片高度文本。 */
    height: string
    /** 是否锁定宽高比文本。 */
    lockAspectRatio: string
    /** 是否锁定尺寸文本。 */
    sizeLocked: string
    /** 浮动横坐标文本。 */
    floatX: string
    /** 浮动纵坐标文本。 */
    floatY: string
    /** 边框颜色文本。 */
    borderColor: string
    /** 边框宽度文本。 */
    borderWidth: string
    /** 边框圆角文本。 */
    borderRadius: string
    /** 阴影颜色文本。 */
    shadowColor: string
    /** 阴影模糊文本。 */
    shadowBlur: string
    /** 肯定选项文本。 */
    yes: string
    /** 否定选项文本。 */
    no: string
    textWrapType: {
      /** embed文本，用于标识、展示或匹配当前对象。 */
      embed: string
      /** updown文本，用于标识、展示或匹配当前对象。 */
      upDown: string
      /** surround文本，用于标识、展示或匹配当前对象。 */
      surround: string
      /** tight文本，用于标识、展示或匹配当前对象。 */
      tight: string
      /** floatTop文本，用于标识、展示或匹配当前对象。 */
      floatTop: string
      /** floatBottom文本，用于标识、展示或匹配当前对象。 */
      floatBottom: string
    }
  }
  chart: {
    /** 刷新图表数据菜单文案。 */
    refreshSource: string
    /** 清除牙位状态菜单文案。 */
    clearDentalStatus: string
    /** 编辑牙位备注菜单文案。 */
    editDentalNote: string
    /** 插入标记菜单文案。 */
    insertMark: string
    /** 插入标注菜单文案。 */
    insertAnnotation: string
    /** 插入点位菜单文案。 */
    insertPoint: string
    /** 编辑点位菜单文案。 */
    editPoint: string
    /** 编辑标记菜单文案。 */
    editMark: string
    /** 编辑区间菜单文案。 */
    editRegion: string
    /** 编辑标注菜单文案。 */
    editAnnotation: string
    /** 删除点位菜单文案。 */
    deletePoint: string
    /** 删除标记菜单文案。 */
    deleteMark: string
    /** 删除区间菜单文案。 */
    deleteRegion: string
    /** 删除标注文案。 */
    deleteAnnotation: string
    /** 牙位状态菜单标题。 */
    dentalStatus: string
    /** 缺失状态文案。 */
    missing: string
    /** 龋坏状态文案。 */
    caries: string
    /** 充填状态文案。 */
    filled: string
    /** 根管状态文案。 */
    rootCanal: string
    /** 冠修复状态文案。 */
    crown: string
    /** 种植状态文案。 */
    implant: string
  }
  /** 表格数据对象，保存行、列和单元格结构。 */
  table: {
    /** 表格属性入口，用于打开表格属性配置弹窗。 */
    property: string
    /** 表格边框类型文本，用于配置表格级边框范围。 */
    borderType: string
    /** 外侧边框宽度文本，用于配置表格外框线宽。 */
    borderExternalWidth: string
    /** 行最小高度文本，用于配置当前行高策略。 */
    rowMinHeight: string
    /** 重复标题行文本，用于配置当前行是否作为跨页表头。 */
    repeatHeaderRow: string
    /** 重复标题行否定文本。 */
    repeatHeaderNo: string
    /** 重复标题行肯定文本。 */
    repeatHeaderYes: string
    /** 单元格背景色文本，用于配置当前单元格底色。 */
    cellBackgroundColor: string
    /** 插入行col文本，用于标识、展示或匹配当前对象。 */
    insertRowCol: string
    /** 插入上侧行，用于保存或定位表格行结构。 */
    insertTopRow: string
    /** 插入下侧行，用于保存或定位表格行结构。 */
    insertBottomRow: string
    /** 插入左侧col文本，用于标识、展示或匹配当前对象。 */
    insertLeftCol: string
    /** 插入右侧col文本，用于标识、展示或匹配当前对象。 */
    insertRightCol: string
    /** 删除行col文本，用于标识、展示或匹配当前对象。 */
    deleteRowCol: string
    /** 删除行，用于保存或定位表格行结构。 */
    deleteRow: string
    /** 删除col文本，用于标识、展示或匹配当前对象。 */
    deleteCol: string
    /** 删除表格，用于保存或定位表格结构。 */
    deleteTable: string
    /** merge单元格，用于保存或定位表格单元格结构。 */
    mergeCell: string
    /** mergecancel单元格，用于保存或定位表格单元格结构。 */
    mergeCancelCell: string
    /** 垂直对齐文本，用于配置单元格内容纵向位置。 */
    verticalAlign: string
    /** 顶端对齐文本。 */
    verticalAlignTop: string
    /** 垂直居中文本。 */
    verticalAlignMiddle: string
    /** 底端对齐文本。 */
    verticalAlignBottom: string
    /** 表格边框文本，用于打开表格边框子菜单。 */
    border: string
    /** 所有框线文本。 */
    borderAll: string
    /** 无框线文本。 */
    borderEmpty: string
    /** 虚框线文本。 */
    borderDash: string
    /** 外侧框线文本。 */
    borderExternal: string
    /** 内侧框线文本。 */
    borderInternal: string
    /** 表格边框颜色文本。 */
    borderColor: string
    /** 表格边框宽度文本。 */
    borderWidth: string
    /** 自动适配后的菜单宽度。 */
    autoFitWidth: string
    /** 单元格边框文本。 */
    borderTd: string
    /** 单元格上边框文本。 */
    borderTdTop: string
    /** 单元格右边框文本。 */
    borderTdRight: string
    /** 单元格下边框文本。 */
    borderTdBottom: string
    /** 单元格左边框文本。 */
    borderTdLeft: string
    /** 单元格边框颜色文本。 */
    borderTdColor: string
    /** 单元格边框宽度文本。 */
    borderTdWidth: string
    /** 单元格正斜线文本。 */
    borderTdForward: string
    /** 单元格反斜线文本。 */
    borderTdBack: string
  }
}
