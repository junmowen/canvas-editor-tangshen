import './assets/css/index.css'
import {
  IEditorData,
  IEditorOption,
  IEditorResult,
  IRenderBackendOption
} from './interface/Editor'
import { IElement } from './interface/Element'
import { ISetTrackChangeOption } from './interface/Command'
import {
  ITrackChangeRecord,
  ITrackChangeRect
} from './core/draw/track-change/TrackChangeService'
import { Draw } from './core/draw/Draw'
import { Command } from './core/command/Command'
import { CommandAdapt } from './core/command/CommandAdapt'
import { Listener } from './core/runtime/listener/Listener'
import { RowFlex } from './dataset/enum/Row'
import {
  FlexDirection,
  ImageDisplay,
  LocationPosition
} from './dataset/enum/Common'
import { ElementType } from './dataset/enum/Element'
import { formatElementList } from './utils/element'
import { Register } from './core/extension/register/Register'
import { ContextMenu } from './core/runtime/contextmenu/ContextMenu'
import {
  IContextMenuContext,
  IRegisterContextMenu
} from './interface/contextmenu/ContextMenu'
import {
  EditorComponent,
  EditorZone,
  EditorMode,
  PageMode,
  PaperDirection,
  WordBreak,
  RenderMode
} from './dataset/enum/Editor'
import { EDITOR_CLIPBOARD, EDITOR_COMPONENT } from './dataset/constant/Editor'
import { IWatermark } from './interface/Watermark'
import {
  ControlComponent,
  ControlIndentation,
  ControlState,
  ControlType
} from './dataset/enum/Control'
import { INavigateInfo } from './core/modules/search/runtime/Search'
import { Shortcut } from './core/extension/shortcut/Shortcut'
import { KeyMap } from './dataset/enum/KeyMap'
import { BlockType } from './dataset/enum/Block'
import { IBlock } from './interface/Block'
import { ILang } from './interface/i18n/I18n'
import { VerticalAlign } from './dataset/enum/VerticalAlign'
import {
  TableBorder,
  TableDisplay,
  TdBorder,
  TdSlash
} from './dataset/enum/table/Table'
import { MaxHeightRatio, NumberType } from './dataset/enum/Common'
import { TitleLevel } from './dataset/enum/Title'
import { ListStyle, ListType } from './dataset/enum/List'
import { ICatalog, ICatalogItem } from './interface/Catalog'
import { Plugin } from './core/extension/plugin/Plugin'
import { UsePlugin } from './interface/Plugin'
import { EventBus } from './core/event/eventbus/EventBus'
import { EventBusMap } from './interface/EventBus'
import { IRangeStyle } from './interface/Listener'
import { Override } from './core/extension/override/Override'
import { LETTER_CLASS } from './dataset/constant/Common'
import { INTERNAL_CONTEXT_MENU_KEY } from './dataset/constant/ContextMenu'
import { IRange } from './interface/Range'
import { deepClone, splitText } from './utils'
import {
  createDomFromElementList,
  getElementListByHTML,
  getTextFromElementList,
  type IGetElementListByHTMLOption
} from './utils/element'
import { BackgroundRepeat, BackgroundSize } from './dataset/enum/Background'
import { TextDecorationStyle } from './dataset/enum/Text'
import { mergeOption } from './utils/option'
import { LineNumberType } from './dataset/enum/LineNumber'
import { AreaMode } from './dataset/enum/Area'
import { IBadge } from './interface/Badge'
import { WatermarkType } from './dataset/enum/Watermark'
import { INTERNAL_SHORTCUT_KEY } from './dataset/constant/Shortcut'

export default class Editor {
  /** 编辑器命令门面，向外暴露排版、插入、表格、搜索等操作入口。 */
  public command: Command
  /** 外部监听器集合，用于触发内容、页码、选区、控件等回调。 */
  public listener: Listener
  /** 事件总线实例，用于发布和订阅编辑器内部事件。 */
  public eventBus: EventBus<EventBusMap>
  /** 外部覆盖处理器集合，用于接管复制、粘贴、拖放等默认行为。 */
  public override: Override
  /** 扩展注册器，用于登记菜单、快捷键和多语言文案。 */
  public register: Register
  /** 销毁函数，用于释放编辑器事件监听和运行时资源。 */
  public destroy: () => void
  /** 插件安装入口，用于把插件挂载到当前编辑器实例。 */
  public use: UsePlugin
  /** 内部 Draw 实例，负责布局、渲染和渲染后端统计。 */
  private draw: Draw

  /** 初始化 Editor 实例并注入运行依赖。 */
  constructor(
    container: HTMLDivElement,
    data: IEditorData | IElement[],
    options: IEditorOption = {}
  ) {
    // 合并配置
    const editorOptions = mergeOption(options)
    // 数据处理
    data = deepClone(data)
    let headerElementList: IElement[] = []
    let mainElementList: IElement[] = []
    let footerElementList: IElement[] = []
    if (Array.isArray(data)) {
      mainElementList = data
    } else {
      headerElementList = data.header || []
      mainElementList = data.main
      footerElementList = data.footer || []
    }
    // 初始化 page Component Data 列表。
    const pageComponentData = [
      headerElementList,
      mainElementList,
      footerElementList
    ]
    pageComponentData.forEach(elementList => {
      formatElementList(elementList, {
        editorOptions,
        isForceCompensation: true
      })
    })
    // 监听
    this.listener = new Listener()
    // 事件
    this.eventBus = new EventBus<EventBusMap>()
    // 重写
    this.override = new Override()
    // 启动
    const draw = new Draw(
      container,
      editorOptions,
      {
        header: headerElementList,
        main: mainElementList,
        footer: footerElementList
      },
      this.listener,
      this.eventBus,
      this.override
    )
    this.draw = draw
    // 命令
    this.command = new Command(new CommandAdapt(draw))
    // 菜单
    const contextMenu = new ContextMenu(draw, this.command)
    // 快捷键
    const shortcut = new Shortcut(draw, this.command)
    // 注册
    this.register = new Register({
      contextMenu,
      shortcut,
      i18n: draw.getComponents().i18n
    })
    // 注册销毁方法
    this.destroy = () => {
      draw.destroy()
      shortcut.removeEvent()
      contextMenu.removeEvent()
    }
    // 插件
    const plugin = new Plugin(this)
    this.use = plugin.use.bind(plugin)
  }

  /**
   * 获取渲染后端统计。
   *
   * 该入口用于浏览器自动化测试、调试面板和性能压测读取 canvas 池、bitmap 缓存和多引擎调度状态。
   */
  public getRenderBackendStats() {
    return this.draw.getRenderBackendStats()
  }

  /** 获取压缩后的渲染后端调试快照，用于内置面板和业务诊断视图。 */
  public getRenderBackendDebugSnapshot() {
    return this.draw.getRenderBackendDebugSnapshot()
  }

  /**
   * 重置渲染后端统计。
   *
   * 仅清空统计计数和高水位基线，不释放当前 canvas、surface 或 bitmap 缓存。
   */
  public resetRenderBackendStats() {
    this.draw.resetRenderBackendStats()
  }
}

// 对外方法
export {
  splitText,
  createDomFromElementList,
  getElementListByHTML,
  getTextFromElementList
}

// 对外常量
export {
  EDITOR_COMPONENT,
  LETTER_CLASS,
  INTERNAL_CONTEXT_MENU_KEY,
  INTERNAL_SHORTCUT_KEY,
  EDITOR_CLIPBOARD
}

// 对外枚举
export {
  Editor,
  RowFlex,
  VerticalAlign,
  EditorZone,
  EditorMode,
  ElementType,
  ControlType,
  EditorComponent,
  PageMode,
  RenderMode,
  ImageDisplay,
  Command,
  KeyMap,
  BlockType,
  PaperDirection,
  TableBorder,
  TableDisplay,
  TdBorder,
  TdSlash,
  MaxHeightRatio,
  NumberType,
  TitleLevel,
  ListType,
  ListStyle,
  WordBreak,
  ControlIndentation,
  ControlComponent,
  BackgroundRepeat,
  BackgroundSize,
  TextDecorationStyle,
  LineNumberType,
  LocationPosition,
  AreaMode,
  ControlState,
  FlexDirection,
  WatermarkType
}

// 对外类型
export type {
  IElement,
  IEditorData,
  IEditorOption,
  IRenderBackendOption,
  IEditorResult,
  IContextMenuContext,
  IRegisterContextMenu,
  IWatermark,
  INavigateInfo,
  IBlock,
  ILang,
  ICatalog,
  ICatalogItem,
  IRange,
  IRangeStyle,
  IBadge,
  IGetElementListByHTMLOption,
  ISetTrackChangeOption,
  ITrackChangeRecord,
  ITrackChangeRect
}
