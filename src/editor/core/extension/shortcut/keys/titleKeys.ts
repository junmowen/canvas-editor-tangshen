import { Command, TitleLevel } from '../../../..'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { IRegisterShortcut } from '../../../../interface/shortcut/Shortcut'

// 初始化 title Keys 列表。
export const titleKeys: IRegisterShortcut[] = [
  {
    key: KeyMap.ZERO,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(null)
    }
  },
  {
    key: KeyMap.ONE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.FIRST)
    }
  },
  {
    key: KeyMap.TWO,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.SECOND)
    }
  },
  {
    key: KeyMap.THREE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.THIRD)
    }
  },
  {
    key: KeyMap.FOUR,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.FOURTH)
    }
  },
  {
    key: KeyMap.FIVE,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.FIFTH)
    }
  },
  {
    key: KeyMap.SIX,
    alt: true,
    ctrl: true,
    callback: (command: Command) => {
      command.executeTitle(TitleLevel.SIXTH)
    }
  }
]
