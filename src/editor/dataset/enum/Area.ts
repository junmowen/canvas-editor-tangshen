/** 编辑区域交互模式，控制区域内容可编辑、只读或仅表单填写。 */
export enum AreaMode {
  EDIT = 'edit', // 编辑模式（文档可编辑、辅助元素均存在）
  READONLY = 'readonly', // 只读模式（文档不可编辑）
  FORM = 'form' // 表单模式（仅控件内可编辑）
}
