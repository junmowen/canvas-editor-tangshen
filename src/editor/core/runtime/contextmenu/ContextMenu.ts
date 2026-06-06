import { NAME_PLACEHOLDER } from '../../../dataset/constant/ContextMenu'
import { EDITOR_COMPONENT, EDITOR_PREFIX } from '../../../dataset/constant/Editor'
import { EditorComponent } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import {
  IContextMenuContext,
  IRegisterContextMenu
} from '../../../interface/contextmenu/ContextMenu'
import { findParent } from '../../../utils'
import { zipElementList } from '../../../utils/elementZip'
import { Command } from '../../command/Command'
import { Draw } from '../../draw/Draw'
import type { DrawCoordinateService } from '../../draw/coordinate/DrawCoordinateService'
import { I18n } from '../../extension/i18n/I18n'
import { RangeManager } from '../../range/RangeManager'
import { controlMenus } from '../../modules/control/contextmenu/controlMenus'
import { globalMenus } from './menus/globalMenus'
import { hyperlinkMenus } from '../../modules/inline/contextmenu/hyperlinkMenus'
import { imageMenus } from '../../modules/image/contextmenu/imageMenus'
import { tableMenus } from '../../modules/table/contextmenu/tableMenus'

/** 渲染调用载荷，聚合执行该操作所需的输入数据。 */
interface IRenderPayload {
  contextMenuList: IRegisterContextMenu[]
  /** 左侧偏移或边距，用于计算区域边界。 */
  left: number
  /** 上侧偏移或边距，用于计算区域边界。 */
  top: number
  parentMenuContainer?: HTMLDivElement
}

export class ContextMenu {
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器命令门面，向外暴露排版、插入、表格、搜索等操作入口。 */
  private command: Command
  /** 选区管理器，用于读取和更新当前编辑范围。 */
  private range: RangeManager
  /** 坐标服务，用于读取元素位置、浮动元素和光标坐标。 */
  private coordinate: DrawCoordinateService
  /** 国际化服务实例，用于读取当前语言文案。 */
  private i18n: I18n
  /** 编辑器根容器，承载浮层、光标或交互节点。 */
  private container: HTMLDivElement
  private contextMenuList: IRegisterContextMenu[]
  private contextMenuContainerList: HTMLDivElement[]
  private contextMenuRelationShip: Map<HTMLDivElement, HTMLDivElement>
  /** 右键菜单上下文，保存当前命中的元素、表格或控件信息。 */
  private context: IContextMenuContext | null

  /** 初始化 ContextMenu 实例并注入运行依赖。 */
  constructor(draw: Draw, command: Command) {
    const components = draw.getComponents()
    this.options = draw.getOptions()
    this.draw = draw
    this.command = command
    this.range = components.range
    this.coordinate = draw.getCoordinate()
    this.i18n = components.i18n
    this.container = draw.getPageCanvasHost().getContainer()
    this.context = null
    // 内部菜单
    this.contextMenuList = [
      ...globalMenus,
      ...tableMenus,
      ...imageMenus,
      ...controlMenus,
      ...hyperlinkMenus
    ]
    this.contextMenuContainerList = []
    this.contextMenuRelationShip = new Map()
    this._addEvent()
  }

  public getContextMenuList(): IRegisterContextMenu[] {
    return this.contextMenuList
  }

  private _addEvent() {
    // 菜单权限
    this.container.addEventListener('contextmenu', this._proxyContextMenuEvent)
    // 副作用处理
    document.addEventListener('mousedown', this._handleSideEffect)
  }

  public removeEvent() {
    this.container.removeEventListener(
      'contextmenu',
      this._proxyContextMenuEvent
    )
    document.removeEventListener('mousedown', this._handleSideEffect)
  }

  private _filterMenuList(
    menuList: IRegisterContextMenu[]
  ): IRegisterContextMenu[] {
    const { contextMenuDisableKeys } = this.options
    const renderList: IRegisterContextMenu[] = []
    for (let m = 0; m < menuList.length; m++) {
      const menu = menuList[m]
      if (
        menu.disable ||
        (menu.key && contextMenuDisableKeys.includes(menu.key))
      ) {
        continue
      }
      if (menu.isDivider) {
        renderList.push(menu)
      } else {
        if (menu.when?.(this.context!)) {
          renderList.push(menu)
        }
      }
    }
    return renderList
  }

  /** 右键菜单代理事件处理函数，用于统一处理自定义菜单点击。 */
  private _proxyContextMenuEvent = (evt: MouseEvent) => {
    this.context = this._getContext(evt)
    const renderList = this._filterMenuList(this.contextMenuList)
    const isRegisterContextMenu = renderList.some(menu => !menu.isDivider)
    if (isRegisterContextMenu) {
      this.dispose()
      this._render({
        contextMenuList: renderList,
        left: evt.clientX,
        top: evt.clientY
      })
    }
    evt.preventDefault()
  }

  /** 右键菜单副作用清理函数，用于关闭菜单后恢复临时状态。 */
  private _handleSideEffect = (evt: MouseEvent) => {
    if (this.contextMenuContainerList.length) {
      // 点击非右键菜单内
      const target = <Element>(evt?.composedPath()[0] || evt.target)
      const contextMenuDom = findParent(
        target,
        (node: Node & Element) =>
          !!node &&
          node.nodeType === 1 &&
          node.getAttribute(EDITOR_COMPONENT) === EditorComponent.CONTEXTMENU,
        true
      )
      if (!contextMenuDom) {
        this.dispose()
      }
    }
  }

  /** 获取上下文，向调用方返回当前状态或计算结果。 */
  private _getContext(evt: MouseEvent): IContextMenuContext {
    // 是否是只读模式
    const isReadonly = this.draw.isReadonly()
    const {
      isCrossRowCol: crossRowCol,
      startIndex,
      endIndex
    } = this.range.getEditBoundaryRange()
    // 是否存在焦点
    const editorTextFocus = !!(~startIndex || ~endIndex)
    // 是否存在选区
    const editorHasSelection = editorTextFocus && startIndex !== endIndex
    // 是否在表格内
    const hitContext = this.command.getPositionContextByEvent(evt, {
      isMustDirectHit: false
    })
    const hitTableInfo = hitContext?.tableInfo || null
    const tableTarget = this.draw.getTargetResolver().resolveTableTarget({
      hitTableInfo,
      positionContext: this.coordinate.getPositionContext()
    })
    let tableElement: IElement | null = null
    const tableTrIndex: number | null = tableTarget?.trIndex ?? null
    const tableTdIndex: number | null = tableTarget?.tdIndex ?? null
    if (tableTarget?.element) {
      tableElement = zipElementList([tableTarget.element], {
        extraPickAttrs: ['id']
      })[0]
    }
    // 是否存在跨行/列
    const isCrossRowCol = !!tableElement && !!crossRowCol
    // 当前元素
    const { startElement, endElement } = this.draw
      .getTargetResolver()
      .resolveRangeBoundaryElements({
        range: this.range.getEditBoundaryRange()
      })
    // 当前区域
    const zone = this.draw.getZone().getZone()
    return {
      startElement,
      endElement,
      isReadonly,
      editorHasSelection,
      editorTextFocus,
      isCrossRowCol,
      zone,
      isInTable: !!tableElement,
      trIndex: tableTrIndex,
      tdIndex: tableTdIndex,
      tableElement,
      options: this.options
    }
  }

  /** 创建上下文menucontainer，组装后续流程需要的对象或 DOM 结构。 */
  private _createContextMenuContainer(): HTMLDivElement {
    const contextMenuContainer = document.createElement('div')
    contextMenuContainer.classList.add(`${EDITOR_PREFIX}-contextmenu-container`)
    contextMenuContainer.setAttribute(
      EDITOR_COMPONENT,
      EditorComponent.CONTEXTMENU
    )
    this.container.append(contextMenuContainer)
    return contextMenuContainer
  }

  /** 渲染当前项，把布局结果绘制到目标画布。 */
  private _render(payload: IRenderPayload): HTMLDivElement {
    const { contextMenuList, left, top, parentMenuContainer } = payload
    const contextMenuContainer = this._createContextMenuContainer()
    const contextMenuContent = document.createElement('div')
    contextMenuContent.classList.add(`${EDITOR_PREFIX}-contextmenu-content`)
    // 直接子菜单
    let childMenuContainer: HTMLDivElement | null = null
    // 父菜单添加子菜单映射关系
    if (parentMenuContainer) {
      this.contextMenuRelationShip.set(
        parentMenuContainer,
        contextMenuContainer
      )
    }
    for (let c = 0; c < contextMenuList.length; c++) {
      const menu = contextMenuList[c]
      if (menu.isDivider) {
        // 分割线相邻 || 首尾分隔符时不渲染
        if (
          c !== 0 &&
          c !== contextMenuList.length - 1 &&
          !contextMenuList[c - 1]?.isDivider
        ) {
          const divider = document.createElement('div')
          divider.classList.add(`${EDITOR_PREFIX}-contextmenu-divider`)
          contextMenuContent.append(divider)
        }
      } else {
        const menuItem = document.createElement('div')
        menuItem.classList.add(`${EDITOR_PREFIX}-contextmenu-item`)
        // 菜单事件
        if (menu.childMenus) {
          const childMenus = this._filterMenuList(menu.childMenus)
          const isRegisterContextMenu = childMenus.some(menu => !menu.isDivider)
          if (isRegisterContextMenu) {
            menuItem.classList.add(`${EDITOR_PREFIX}-contextmenu-sub-item`)
            menuItem.onmouseenter = () => {
              this._setHoverStatus(menuItem, true)
              this._removeSubMenu(contextMenuContainer)
              // 子菜单
              const subMenuRect = menuItem.getBoundingClientRect()
              const left = subMenuRect.left + subMenuRect.width
              const top = subMenuRect.top
              childMenuContainer = this._render({
                contextMenuList: childMenus,
                left,
                top,
                parentMenuContainer: contextMenuContainer
              })
            }
            menuItem.onmouseleave = evt => {
              // 移动到子菜单选项选中状态不变化
              if (
                !childMenuContainer ||
                !childMenuContainer.contains(evt.relatedTarget as Node)
              ) {
                this._setHoverStatus(menuItem, false)
              }
            }
          }
        } else {
          menuItem.onmouseenter = () => {
            this._setHoverStatus(menuItem, true)
            this._removeSubMenu(contextMenuContainer)
          }
          menuItem.onmouseleave = () => {
            this._setHoverStatus(menuItem, false)
          }
          menuItem.onclick = () => {
            if (menu.callback && this.context) {
              menu.callback(this.command, this.context)
            }
            this.dispose()
          }
        }
        // 图标
        const icon = document.createElement('i')
        menuItem.append(icon)
        if (menu.icon) {
          icon.classList.add(`${EDITOR_PREFIX}-contextmenu-${menu.icon}`)
        }
        // 文本
        const span = document.createElement('span')
        const name = menu.i18nPath
          ? this._formatName(this.i18n.t(menu.i18nPath))
          : this._formatName(menu.name || '')
        span.append(document.createTextNode(name))
        menuItem.append(span)
        // 快捷方式提示
        if (menu.shortCut) {
          const span = document.createElement('span')
          span.classList.add(`${EDITOR_PREFIX}-shortcut`)
          span.append(document.createTextNode(menu.shortCut))
          menuItem.append(span)
        }
        contextMenuContent.append(menuItem)
      }
    }
    contextMenuContainer.append(contextMenuContent)
    contextMenuContainer.style.display = 'block'
    // 右侧空间不足时，以菜单右上角作为起始点
    const innerWidth = window.innerWidth
    const contextmenuRect = contextMenuContainer.getBoundingClientRect()
    const contextMenuWidth = contextmenuRect.width
    const adjustLeft =
      left + contextMenuWidth > innerWidth ? left - contextMenuWidth : left
    contextMenuContainer.style.left = `${adjustLeft}px`
    // 下侧空间不足时，以菜单底部作为起始点
    const innerHeight = window.innerHeight
    const contextMenuHeight = contextmenuRect.height
    const adjustTop =
      top + contextMenuHeight > innerHeight ? top - contextMenuHeight : top
    contextMenuContainer.style.top = `${adjustTop}px`
    this.contextMenuContainerList.push(contextMenuContainer)
    return contextMenuContainer
  }

  private _removeSubMenu(payload: HTMLDivElement) {
    const childMenu = this.contextMenuRelationShip.get(payload)
    if (childMenu) {
      this._removeSubMenu(childMenu)
      childMenu.remove()
      this.contextMenuRelationShip.delete(payload)
    }
  }

  /** 更新hoverstatus，同步内部状态并触发必要的界面刷新。 */
  private _setHoverStatus(payload: HTMLDivElement, status: boolean) {
    if (status) {
      payload.parentNode
        ?.querySelectorAll(`${EDITOR_PREFIX}-contextmenu-item`)
        .forEach(child => child.classList.remove('hover'))
      payload.classList.add('hover')
    } else {
      payload.classList.remove('hover')
    }
  }

  /** 格式化name，生成界面显示或提交需要的文本。 */
  private _formatName(name: string): string {
    const placeholderValues = Object.values(NAME_PLACEHOLDER)
    // 创建 placeholder Reg 实例。
    const placeholderReg = new RegExp(`${placeholderValues.join('|')}`)
    let formatName = name
    if (placeholderReg.test(formatName)) {
      // 选区名称
      const selectedReg = new RegExp(NAME_PLACEHOLDER.SELECTED_TEXT, 'g')
      if (selectedReg.test(formatName)) {
        const selectedText = this.range.toString()
        formatName = formatName.replace(selectedReg, selectedText)
      }
    }
    return formatName
  }

  public registerContextMenuList(payload: IRegisterContextMenu[]) {
    this.contextMenuList.push(...payload)
  }

  /** 销毁dispose相关资源，解除事件监听并释放持有对象。 */
  public dispose() {
    this.contextMenuContainerList.forEach(child => child.remove())
    this.contextMenuContainerList = []
    this.contextMenuRelationShip.clear()
  }
}
