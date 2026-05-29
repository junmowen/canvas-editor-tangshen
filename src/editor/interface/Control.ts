import { FlexDirection, LocationPosition } from '../dataset/enum/Common'
import {
  ControlType,
  ControlIndentation,
  ControlState
} from '../dataset/enum/Control'
import { EditorZone } from '../dataset/enum/Editor'
import { MoveDirection } from '../dataset/enum/Observer'
import { RowFlex } from '../dataset/enum/Row'
import { IDrawOption } from './Draw'
import { IElement } from './Element'
import { IPositionContext } from './Position'
import { IRange } from './Range'
import { IRow, IRowElement } from './Row'

/** 值设置契约，用于约束公开 API中传递的数据结构。 */
export interface IValueSet {
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string
  /** 业务编码，用于识别控件、命令或错误类型。 */
  code: string | number
}

/** 控件select契约，用于约束公开 API中传递的数据结构。 */
export interface IControlSelect {
  /** 业务编码，用于识别控件、命令或错误类型。 */
  code: string | number | null
  /** 值集合，用于保存可选值分组或枚举范围。 */
  valueSets: IValueSet[]
  /** 是否允许多选，用于控制选择控件的取值数量。 */
  isMultiSelect?: boolean
  /** 多选分隔符，用于拼接选择控件的多个值。 */
  multiSelectDelimiter?: string
  /** 互斥选项列表，用于限制选择控件不能同时选中的值。 */
  selectExclusiveOptions?: {
    /** 是否允许手动输入，用于控制选择控件的自由录入能力。 */
    inputAble?: boolean
  }
}

/** 控件复选框契约，用于约束公开 API中传递的数据结构。 */
export interface IControlCheckbox {
  /** 业务编码，用于识别控件、命令或错误类型。 */
  code: string | number | null
  /** 最小值，用于限制控件或数值配置的下界。 */
  min?: number
  /** 最大值，用于限制控件或数值配置的上界。 */
  max?: number
  /** 排列方向，用于控制控件选项横向或纵向布局。 */
  flexDirection: FlexDirection
  /** 值集合，用于保存可选值分组或枚举范围。 */
  valueSets: IValueSet[]
}

/** 控件单选框契约，用于约束公开 API中传递的数据结构。 */
export interface IControlRadio {
  /** 业务编码，用于识别控件、命令或错误类型。 */
  code: string | number | null
  /** 排列方向，用于控制控件选项横向或纵向布局。 */
  flexDirection: FlexDirection
  /** 值集合，用于保存可选值分组或枚举范围。 */
  valueSets: IValueSet[]
}

/** 控件date契约，用于约束公开 API中传递的数据结构。 */
export interface IControlDate {
  /** 日期格式模板，用于格式化日期控件显示值。 */
  dateFormat?: string
}

/** 控件highlight规则，控制该能力的启用条件和约束。 */
export interface IControlHighlightRule {
  /** 搜索关键字，用于匹配文档内容或控件值。 */
  keyword: string
  /** 透明度系数，用于控制绘制结果的不透明程度。 */
  alpha?: number
  /** 背景颜色，用于填充元素或区域底色。 */
  backgroundColor?: string
}

/** 控件highlight契约，用于约束公开 API中传递的数据结构。 */
export interface IControlHighlight {
  /** 规则列表，保存控件校验或匹配规则。 */
  ruleList: IControlHighlightRule[]
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
}

/** 控件规则，控制该能力的启用条件和约束。 */
export interface IControlRule {
  /** 是否允许删除，用于控制控件或元素的删除权限。 */
  deletable?: boolean
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
  /** pastedisabled开关，用于控制当前流程的判断分支。 */
  pasteDisabled?: boolean
  /** 是否隐藏，用于控制界面项或元素可见性。 */
  hide?: boolean
}

/** 控件基础信息，保存该对象最小必要配置。 */
export interface IControlBasic {
  type: ControlType
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: IElement[] | null
  /** 占位内容，用于在空值或待输入状态下显示提示。 */
  placeholder?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 前缀文本，用于包裹或提示控件值。 */
  prefix?: string
  /** 后缀文本，用于包裹或提示控件值。 */
  postfix?: string
  /** 最小宽度，用于保证控件或元素的基础占位。 */
  minWidth?: number
  /** 是否下划线，用于设置文字装饰样式。 */
  underline?: boolean
  /** 边框配置，用于控制控件或块级元素的描边效果。 */
  border?: boolean
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension?: unknown
  /** 缩进配置，用于控制控件内容的行内位置。 */
  indentation?: ControlIndentation
  /** 行剩余弹性空间，用于分配两端对齐或缩进补偿。 */
  rowFlex?: RowFlex
  /** 前置文本，用于在控件值前展示固定内容。 */
  preText?: string
  /** 后置文本，用于在控件值后展示固定内容。 */
  postText?: string
}

/** 控件样式，描述文字、边框或背景等显示效果。 */
export interface IControlStyle {
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font?: string
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size?: number
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 是否加粗，用于设置文字字重样式。 */
  bold?: boolean
  /** 高亮颜色，用于设置文字背景或控件强调样式。 */
  highlight?: string
  /** 是否斜体，用于设置文字样式。 */
  italic?: boolean
  /** 是否下划线，用于设置文字装饰样式。 */
  underline?: boolean
  /** 是否删除线，用于设置文字装饰样式。 */
  strikeout?: boolean
}

/** 控件类型，用于约束公开 API中传递的数据结构。 */
export type IControl = IControlBasic &
  IControlRule &
  Partial<IControlStyle> &
  Partial<IControlSelect> &
  Partial<IControlCheckbox> &
  Partial<IControlRadio> &
  Partial<IControlDate>

/** 控件选项，用于约束调用方可传入的可选配置。 */
export interface IControlOption {
  /** 占位文本颜色，用于区分真实内容和提示内容。 */
  placeholderColor?: string
  /** 控件括号颜色，用于区分控件边界标记。 */
  bracketColor?: string
  /** 前缀文本，用于包裹或提示控件值。 */
  prefix?: string
  /** 后缀文本，用于包裹或提示控件值。 */
  postfix?: string
  /** 边框宽度，用于绘制元素或表格线条。 */
  borderWidth?: number
  /** 边框颜色，用于绘制元素或表格边线。 */
  borderColor?: string
  /** 激活态背景颜色，用于突出当前选中的控件或分组。 */
  activeBackgroundColor?: string
  /** disabled背景颜色，用于控制绘制外观。 */
  disabledBackgroundColor?: string
  /** exist值背景颜色，用于控制绘制外观。 */
  existValueBackgroundColor?: string
  /** no值背景颜色，用于控制绘制外观。 */
  noValueBackgroundColor?: string
}

/** 控件init选项，用于约束调用方可传入的可选配置。 */
export interface IControlInitOption {
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable?: boolean
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 单元格内容索引，用于定位单元格内部元素。 */
  tdValueIndex?: number
}

export interface IControlInitResult {
  /** 新索引位置，用于描述移动、插入或命中后的目标位置。 */
  newIndex: number
}

/** 控件实例契约，定义运行期对象需要暴露的能力。 */
export interface IControlInstance {
  setElement(element: IElement): void
  getElement(): IElement
  getValue(context?: IControlContext): IElement[]
  setValue(
    data: IElement[],
    context?: IControlContext,
    options?: IControlRuleOption
  ): number
  /** 处理键盘按下事件，执行快捷键、输入或控件拦截逻辑。 */
  keydown(evt: KeyboardEvent): number | null
  /** 处理剪切操作，复制选区内容后删除原文档范围。 */
  cut(): number
}

/** 控件上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IControlContext {
  /** 选区范围，记录起止索引和方向信息。 */
  range?: IRange
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList?: IElement[]
}

/** 控件规则选项，用于约束调用方可传入的可选配置。 */
export interface IControlRuleOption {
  /** 是否忽略禁用规则，用于允许特殊场景绕过控件限制。 */
  isIgnoreDisabledRule?: boolean // 忽略禁用校验规则
  /** 是否忽略已删除规则，用于控制当前流程的判断分支。 */
  isIgnoreDeletedRule?: boolean // 忽略删除校验规则
  /** 是否补充占位符，用于在控件值为空时维持可编辑入口。 */
  isAddPlaceholder?: boolean // 是否添加占位符
}

/** 获取控件值选项，用于约束调用方可传入的可选配置。 */
export interface IGetControlValueOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 区域标识，用于关联控件或元素所在的编辑区域。 */
  areaId?: string
}

export type IGetControlValueResult = (Omit<IControl, 'value'> & {
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string | null
  /** 内部文本，保存需要渲染、搜索或复制的文本内容。 */
  innerText: string | null
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone: EditorZone
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList?: IElement[]
})[]

/** 设置控件值选项，用于约束调用方可传入的可选配置。 */
export interface ISetControlValueOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 区域标识，用于关联控件或元素所在的编辑区域。 */
  areaId?: string
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string | IElement[] | null
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory?: boolean
}

/** 设置控件extension选项，用于约束调用方可传入的可选配置。 */
export interface ISetControlExtensionOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 区域标识，用于关联控件或元素所在的编辑区域。 */
  areaId?: string
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension: unknown
}

/** 设置控件highlight选项，用于约束调用方可传入的可选配置。 */
export type ISetControlHighlightOption = IControlHighlight[]

/** 设置控件properties类型，用于约束公开 API中传递的数据结构。 */
export type ISetControlProperties = {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 区域标识，用于关联控件或元素所在的编辑区域。 */
  areaId?: string
  /** 属性集合，用于批量携带元素样式或业务配置。 */
  properties: Partial<Omit<IControl, 'value'>>
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory?: boolean
}

/** repaint控件选项，用于约束调用方可传入的可选配置。 */
export type IRepaintControlOption = Pick<
  IDrawOption,
  'curIndex' | 'isCompute' | 'isSubmitHistory' | 'isSetCursor'
>

/** 控件change选项，用于约束调用方可传入的可选配置。 */
export interface IControlChangeOption {
  /** 当前操作上下文，汇总本次处理需要共享的状态。 */
  context?: IControlContext
  /** 控件元素，用于定位或修改对应文档节点。 */
  controlElement?: IElement
  /** 控件值，保存控件、输入或配置的实际取值。 */
  controlValue?: IElement[]
}

/** 下一个控件上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface INextControlContext {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 下一个元素索引，用于继续遍历或查找。 */
  nextIndex: number
}

/** init下一个控件选项，用于约束调用方可传入的可选配置。 */
export interface IInitNextControlOption {
  /** 移动或遍历方向，用于决定下一步查找顺序。 */
  direction?: MoveDirection
}

/** location控件选项，用于约束调用方可传入的可选配置。 */
export interface ILocationControlOption {
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: LocationPosition
}

/** 设置控件行flex选项，用于约束调用方可传入的可选配置。 */
export interface ISetControlRowFlexOption {
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 行元素，用于定位或修改对应文档节点。 */
  rowElement: IRowElement
  /** 可用宽度，用于计算当前行或单元格的排版空间。 */
  availableWidth: number
  /** 控件实际渲染宽度，用于命中检测和占位计算。 */
  controlRealWidth: number
}

export interface IControlChangeResult {
  state: ControlState
  /** 控件配置对象，描述当前控件的行为和取值规则。 */
  control: IControl
  /** 控件标识，用于关联同一控件的开始、值和结束元素。 */
  controlId: string
}

export interface IControlContentChangeResult {
  /** 控件配置对象，描述当前控件的行为和取值规则。 */
  control: IControl
  /** 控件标识，用于关联同一控件的开始、值和结束元素。 */
  controlId: string
}

/** destroy控件选项，用于约束调用方可传入的可选配置。 */
export interface IDestroyControlOption {
  /** 是否派发事件，用于控制当前流程的判断分支。 */
  isEmitEvent?: boolean
}

/** remove控件选项，用于约束调用方可传入的可选配置。 */
export interface IRemoveControlOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
}
