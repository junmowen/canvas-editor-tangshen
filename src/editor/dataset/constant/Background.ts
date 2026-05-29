import { IBackgroundOption } from '../../interface/Background'
import { BackgroundRepeat, BackgroundSize } from '../enum/Background'

// 默认背景配置，作为未显式设置背景时的渲染基线。
export const defaultBackground: Readonly<Required<IBackgroundOption>> = {
  color: '#FFFFFF',
  image: '',
  size: BackgroundSize.COVER,
  repeat: BackgroundRepeat.NO_REPEAT,
  applyPageNumbers: []
}
