import { MaxHeightRatio } from '../dataset/enum/Common'

/** footer契约，用于约束公开 API中传递的数据结构。内容 pageScope 见 IEditorData.footerPageScopes。 */
export interface IFooter {
  /** 下侧偏移或边距，用于计算区域边界。 */
  bottom?: number
  /** 非激活状态透明度，用于弱化未选中内容。 */
  inactiveAlpha?: number
  /** 最大高度比例，用于限制页眉页脚占用空间。 */
  maxHeightRadio?: MaxHeightRatio
  /** 是否禁用，用于阻止交互、编辑或菜单动作。 */
  disabled?: boolean
  /** 是否可编辑，用于控制页眉页脚或控件内容能否修改。 */
  editable?: boolean
}
