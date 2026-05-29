import { Command } from '../../core/command/Command'
import { EditorZone } from '../../dataset/enum/Editor'
import { DeepRequired } from '../Common'
import { IEditorOption } from '../Editor'
import { IElement } from '../Element'

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
    /** change文本，用于标识、展示或匹配当前对象。 */
    change: string
    /** saveas文本，用于标识、展示或匹配当前对象。 */
    saveAs: string
    /** 文本wrap文本，用于标识、展示或匹配当前对象。 */
    textWrap: string
    textWrapType: {
      /** embed文本，用于标识、展示或匹配当前对象。 */
      embed: string
      /** updown文本，用于标识、展示或匹配当前对象。 */
      upDown: string
    }
  }
  /** 表格数据对象，保存行、列和单元格结构。 */
  table: {
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
    /** 自动适配后的菜单宽度。 */
    autoFitWidth: string
  }
}
