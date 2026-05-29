import { ILineBreakOption } from '../../interface/LineBreak'

// 默认换行符配置，作为显示格式标记时的基础样式。
export const defaultLineBreak: Readonly<Required<ILineBreakOption>> = {
  disabled: true,
  color: '#CCCCCC',
  lineWidth: 1.5
}
