import { Command, ListStyle, ListType } from '../../../..'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { IRegisterShortcut } from '../../../../interface/shortcut/Shortcut'

// 初始化 list Keys 列表。
export const listKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.I,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeList(ListType.UL, ListStyle.DISC)
    }
  },
  {
    key: KeyMap.U,
    shift: true,
    mod: true,
    callback: (command: Command) => {
      command.executeList(ListType.OL)
    }
  }
]
