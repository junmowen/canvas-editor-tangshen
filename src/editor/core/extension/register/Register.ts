import { IRegisterContextMenu } from '../../../interface/contextmenu/ContextMenu'
import { IRegisterShortcut } from '../../../interface/shortcut/Shortcut'
import { ContextMenu } from '../../runtime/contextmenu/ContextMenu'
import { Shortcut } from '../shortcut/Shortcut'
import { I18n } from '../i18n/I18n'
import { ILang } from '../../../interface/i18n/I18n'
import { DeepPartial } from '../../../interface/Common'

/** register调用载荷，聚合执行该操作所需的输入数据。 */
interface IRegisterPayload {
  contextMenu: ContextMenu
  shortcut: Shortcut
  i18n: I18n
}

export class Register {
  public contextMenuList: (payload: IRegisterContextMenu[]) => void
  public getContextMenuList: () => IRegisterContextMenu[]
  public shortcutList: (payload: IRegisterShortcut[]) => void
  /** lang Map 映射缓存，用于按 key 快速定位对应数据。 */
  public langMap: (locale: string, lang: DeepPartial<ILang>) => void

  /** 初始化 Register 实例并注入运行依赖。 */
  constructor(payload: IRegisterPayload) {
    const { contextMenu, shortcut, i18n } = payload
    this.contextMenuList = contextMenu.registerContextMenuList.bind(contextMenu)
    this.getContextMenuList = contextMenu.getContextMenuList.bind(contextMenu)
    this.shortcutList = shortcut.registerShortcutList.bind(shortcut)
    this.langMap = i18n.registerLangMap.bind(i18n)
  }
}
