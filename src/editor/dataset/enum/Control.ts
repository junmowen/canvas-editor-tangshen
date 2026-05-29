/** 表单控件类型，决定控件值读取、渲染和交互方式。 */
export enum ControlType {
  TEXT = 'text',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  DATE = 'date',
  NUMBER = 'number'
}

/** 控件组成片段类型，用于识别前后缀、占位符和值域等子元素。 */
export enum ControlComponent {
  PREFIX = 'prefix',
  POSTFIX = 'postfix',
  PRE_TEXT = 'preText',
  POST_TEXT = 'postText',
  PLACEHOLDER = 'placeholder',
  VALUE = 'value',
  CHECKBOX = 'checkbox',
  RADIO = 'radio'
}

// 控件内容缩进方式
export enum ControlIndentation {
  ROW_START = 'rowStart', // 从行起始位置缩进
  VALUE_START = 'valueStart' // 从值起始位置缩进
}

// 控件状态
export enum ControlState {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}
