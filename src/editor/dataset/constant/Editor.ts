import { DeepRequired } from '../../interface/Common'
import { IModeRule, ITrackChangeOption } from '../../interface/Editor'

// 编辑器根组件标识，用于识别编辑器 DOM 容器。
export const EDITOR_COMPONENT = 'editor-component'
// 编辑器 CSS 和 DOM 命名前缀。
export const EDITOR_PREFIX = 'ce'
// 编辑器剪贴板辅助节点标识。
export const EDITOR_CLIPBOARD = `${EDITOR_PREFIX}-clipboard`

export const defaultModeRuleOption: Readonly<DeepRequired<IModeRule>> = {
  print: {
    imagePreviewerDisabled: false,
    backgroundDisabled: false
  },
  readonly: {
    imagePreviewerDisabled: false
  },
  form: {
    controlDeletableDisabled: false
  }
}

export const defaultTrackChangeOption: Readonly<Required<ITrackChangeOption>> = {
  enabled: false,
  author: '',
  insertColor: '#047857',
  deleteColor: '#DC2626'
}
