import { IDatePickerLang } from '../../core/modules/inline/particle/date/DatePicker'
import { IContextmenuLang } from '../contextmenu/ContextMenu'

/** 当前项语言包结构，约束界面文案的本地化键。 */
export interface ILang {
  contextmenu: IContextmenuLang
  datePicker: IDatePickerLang
}
