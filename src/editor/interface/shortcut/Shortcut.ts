import { Command } from '../../core/command/Command'
import { KeyMap } from '../../dataset/enum/KeyMap'

/** registershortcut契约，用于约束公开 API中传递的数据结构。 */
export interface IRegisterShortcut {
  key: KeyMap
  /** ctrl开关，用于控制当前流程的判断分支。 */
  ctrl?: boolean
  /** meta开关，用于控制当前流程的判断分支。 */
  meta?: boolean
  /** mod开关，用于控制当前流程的判断分支。 */
  mod?: boolean // windows:ctrl || mac:command
  /** Shift开关，用于控制当前流程的判断分支。 */
  shift?: boolean
  /** alt开关，用于控制当前流程的判断分支。 */
  alt?: boolean // windows:alt || mac:option
  /** 是否全局快捷键，用于决定快捷键是否脱离编辑器焦点生效。 */
  isGlobal?: boolean
  /** 回调函数，用于在当前异步流程完成后通知调用方。 */
  callback?: (command: Command) => any
  /** 禁用动作或禁用状态配置，用于关闭对应能力。 */
  disable?: boolean
}
