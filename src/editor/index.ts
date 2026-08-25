import './assets/css/index.css'
import {
  HeaderFooterPageScope,
  IHeaderFooterPageScopeData,
  IEditorData,
  IEditorOption,
  IEditorResult,
  IRenderBackendOption
} from './interface/Editor'
import { IElement, ITabStop } from './interface/Element'
import {
  DocumentStyleType,
  IDocumentListStyle,
  IDocumentStyle
} from './interface/Style'
import { ISetTrackChangeOption } from './interface/Command'
import {
  ITrackChangeRecord,
  ITrackChangeRect
} from './core/draw/track-change/TrackChangeService'
import { IOoxmlPackageParts } from './core/export/ooxml/OoxmlPackage'
import { ITypesettingLayoutSnapshot } from './interface/TypesettingLayout'
import {
  ITitleTree,
  ITitleTreeNode,
  ITitleTreeRange
} from './interface/Title'
import {
  FormulaDisplayMode,
  FormulaDomain,
  FormulaNodeType,
  FormulaSourceFormat,
  IFormula,
  IFormulaNode,
  IFormulaSymbol
} from './interface/Formula'
import type {
  ChartGraphicPresetUnregister,
  ChartGraphicDataMergeStrategy,
  ChartGraphicSeriesPointPatch,
  ChartGraphicDataProviderUnregister,
  ChartGraphicKind,
  ChartGraphicHitTarget,
  DentalSurface,
  DentalToothStatus,
  IDentalToothState,
  IChartAnnotation,
  IChartDataSourceFieldTransform,
  ChartGraphicDataSourceRefreshPhase,
  ChartGraphicDataSourceRefreshReason,
  ChartGraphicDataSourceRefreshSkipReason,
  ChartGraphicDataSourceRefreshStatus,
  IChartGraphicDataLoadPayload,
  IChartGraphicDataSourceRefreshEvent,
  IChartGraphicDataProvider,
  IChartGraphicDataResult,
  IChartGraphicDataSourceState,
  IChartGraphicDataSourceSummary,
  IChartGraphicPreset,
  IChartGraphicPresetCompatibility,
  IChartGraphicPresetCompatibilityHost,
  IChartGraphicPresetCompatibilityResult,
  IChartGraphicPresetUpgradeInfo,
  IChartGraphicPresetUpgradeResult,
  IClearChartGraphicDentalStatusByHitPayload,
  IChartGraphic,
  IDeleteChartGraphicTargetByHitPayload,
  IChartGraphicHitQueryPayload,
  IChartGraphicHitQueryResult,
  IChartGraphicHitResult,
  IInsertChartGraphicAnnotationByHitPayload,
  IInsertChartGraphicMarkByHitPayload,
  IInsertChartGraphicSeriesPointByHitPayload,
  IUpdateChartGraphicSeriesPointByHitPayload,
  IToggleChartGraphicDentalStatusByHitPayload,
  IChartGraphicSeriesSnapshot,
  IChartGraphicSnapshot,
  IChartGraphicTemplateAuditSummary,
  IChartGraphicTemplatePresetAuditSummary,
  IChartGraphicValidationEntry,
  IChartGraphicValidationIssue,
  IChartGraphicValidationIssueEntry,
  IChartGraphicValidationResult,
  IChartGraphicValidationSummary,
  IChartMark,
  IChartRegion,
  IChartSeries,
  IInsertChartGraphicPayload,
  IRefreshChartGraphicSourceOption,
  IRefreshChartGraphicSourcesPayload,
  IRefreshChartGraphicSourcesResult,
  ChartGraphicTemplateAuditReason
} from './interface/ChartGraphic'
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
import { formatElementList } from './utils/elementFormat'
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
  type IGetElementListByHTMLOption
} from './utils/elementDom'
import { getTextFromElementList } from './utils/elementText'
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
    this.applyInitialControlDataToEditorData(data, editorOptions)
    let mainElementList: IElement[] = []
    let headerPageScopes: IHeaderFooterPageScopeData[] | undefined
    let footerPageScopes: IHeaderFooterPageScopeData[] | undefined
    if (Array.isArray(data)) {
      mainElementList = data
    } else {
      mainElementList = data.main
      headerPageScopes = data.headerPageScopes
      footerPageScopes = data.footerPageScopes
    }
    // 初始化 page Component Data 列表。
    const pageComponentData = [
      ...(headerPageScopes?.map(scopeData => scopeData.elementList) || []),
      mainElementList,
      ...(footerPageScopes?.map(scopeData => scopeData.elementList) || [])
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
        headerPageScopes,
        main: mainElementList,
        footerPageScopes
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

  /** 获取段落块/栏/页排版中间层快照。 */
  public getTypesettingLayoutSnapshot(): ITypesettingLayoutSnapshot | null {
    return this.draw.getTypesettingLayoutSnapshot()
  }

  /** 获取当前正文标题父子树。 */
  public getTitleTree(): ITitleTree | null {
    return this.command.getTitleTree()
  }

  /** 按标题 id 获取标题树节点。 */
  public getTitleTreeNode(titleId: string): ITitleTreeNode | null {
    return this.command.getTitleTreeNode(titleId)
  }

  /** 按标题 id 列表批量获取标题树节点。 */
  public getTitleTreeNodeList(titleIds: string[]): ITitleTreeNode[] {
    return this.command.getTitleTreeNodeList(titleIds)
  }

  /** 获取指定标题的直接子标题节点列表。 */
  public getTitleTreeChildList(titleId: string): ITitleTreeNode[] | null {
    return this.command.getTitleTreeChildList(titleId)
  }

  /** 获取指定标题覆盖的章节范围。 */
  public getTitleTreeRange(titleId: string): ITitleTreeRange | null {
    return this.command.getTitleTreeRange(titleId)
  }

  /** 按标题 id 定位到对应章节。 */
  public locationTitle(titleId: string) {
    this.command.executeLocationTitle(titleId)
  }

  /** 在格式化前把创建编辑器时传入的控件业务数据合并到原始模型。 */
  private applyInitialControlDataToEditorData(
    data: IEditorData | IElement[],
    options: Required<IEditorOption>
  ) {
    const apply = (elementList?: IElement[]) => {
      if (elementList?.length) {
        this.applyInitialControlDataToElementList(elementList, options)
      }
    }
    if (Array.isArray(data)) {
      apply(data)
    } else {
      data.headerPageScopes?.forEach(scopeData => apply(scopeData.elementList))
      apply(data.main)
      data.footerPageScopes?.forEach(scopeData => apply(scopeData.elementList))
    }
  }

  /** 遍历元素列表，处理普通控件、区域/标题 valueList 和表格单元格内的控件。 */
  private applyInitialControlDataToElementList(
    elementList: IElement[],
    options: Required<IEditorOption>
  ) {
    for (let index = 0; index < elementList.length; index++) {
      const element = elementList[index]
      if (element.control) {
        this.applyInitialControlDataToElement(element, options)
      }
      if (element.valueList?.length) {
        this.applyInitialControlDataToElementList(element.valueList, options)
      }
      if (element.type === ElementType.TABLE && element.trList?.length) {
        element.trList.forEach(tr => {
          tr.tdList.forEach(td => {
            this.applyInitialControlDataToElementList(td.value, options)
          })
        })
      }
    }
  }

  /** 将初始化属性和值写入单个控件元素。 */
  private applyInitialControlDataToElement(
    element: IElement,
    options: Required<IEditorOption>
  ) {
    const schema = options.controlSchema.find(item =>
      this.isInitialControlDataMatched(element, item)
    )
    if (schema) {
      if (schema.elementProperties?.externalId !== undefined) {
        element.externalId = schema.elementProperties.externalId
      }
      if (schema.elementProperties?.extension !== undefined) {
        element.extension = schema.elementProperties.extension
      }
      if (schema.properties) {
        element.control = {
          ...element.control!,
          ...schema.properties,
          value: element.control!.value
        }
      }
      if (schema.defaultValue !== undefined) {
        this.applyInitialControlValueToElement(element, schema.defaultValue)
      }
    }
    const property = options.controlInitialProperties.find(item =>
      this.isInitialControlDataMatched(element, item)
    )
    if (property) {
      element.control = {
        ...element.control!,
        ...property.properties,
        value: element.control!.value
      }
    }
    const value = options.controlInitialValues.find(item =>
      this.isInitialControlDataMatched(element, item)
    )
    if (value) {
      this.applyInitialControlValueToElement(element, value.value)
    }
  }

  /** 判断初始化数据是否命中当前控件元素。 */
  private isInitialControlDataMatched(
    element: IElement,
    option: {
      /** 唯一标识，用于匹配控件 controlId。 */
      id?: string
      /** 控件概念标识，用于匹配业务语义。 */
      conceptId?: string
      /** 区域标识，用于匹配区域内控件。 */
      areaId?: string
      /** 外部系统标识，用于匹配业务字段。 */
      externalId?: string
      /** 业务编码，用于匹配业务字段编码。 */
      code?: string | number
    }
  ): boolean {
    return (
      (!!option.id && element.controlId === option.id) ||
      (!!option.conceptId && element.control?.conceptId === option.conceptId) ||
      (!!option.externalId && element.externalId === option.externalId) ||
      (option.code !== undefined &&
        option.code !== null &&
        element.control?.code !== undefined &&
        element.control.code !== null &&
        String(element.control.code) === String(option.code)) ||
      (!!option.areaId && element.areaId === option.areaId)
    )
  }

  /** 按控件类型写入初始化值，选择类控件写 code，文本类控件写 value。 */
  private applyInitialControlValueToElement(
    element: IElement,
    value: string | IElement[] | null
  ) {
    const control = element.control!
    if (
      control.type === ControlType.SELECT ||
      control.type === ControlType.CHECKBOX ||
      control.type === ControlType.RADIO
    ) {
      control.code = Array.isArray(value) ? null : value
      control.value = null
      return
    }
    control.value = Array.isArray(value)
      ? value
      : value
        ? [{ value }]
        : null
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
  ITabStop,
  DocumentStyleType,
  IDocumentListStyle,
  IDocumentStyle,
  HeaderFooterPageScope,
  IEditorData,
  IHeaderFooterPageScopeData,
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
  ITrackChangeRect,
  IOoxmlPackageParts,
  ITypesettingLayoutSnapshot,
  ITitleTree,
  ITitleTreeNode,
  ITitleTreeRange,
  ChartGraphicPresetUnregister,
  ChartGraphicDataMergeStrategy,
  ChartGraphicDataProviderUnregister,
  FormulaDisplayMode,
  FormulaDomain,
  FormulaNodeType,
  FormulaSourceFormat,
  IFormula,
  IFormulaNode,
  IFormulaSymbol,
  ChartGraphicSeriesPointPatch,
  ChartGraphicKind,
  ChartGraphicHitTarget,
  DentalSurface,
  DentalToothStatus,
  IDentalToothState,
  IChartAnnotation,
  IChartDataSourceFieldTransform,
  ChartGraphicDataSourceRefreshPhase,
  ChartGraphicDataSourceRefreshReason,
  ChartGraphicDataSourceRefreshSkipReason,
  ChartGraphicDataSourceRefreshStatus,
  IChartGraphicDataLoadPayload,
  IChartGraphicDataSourceRefreshEvent,
  IChartGraphicDataProvider,
  IChartGraphicDataResult,
  IChartGraphicDataSourceState,
  IChartGraphicDataSourceSummary,
  IChartGraphicPreset,
  IChartGraphicPresetCompatibility,
  IChartGraphicPresetCompatibilityHost,
  IChartGraphicPresetCompatibilityResult,
  IChartGraphicPresetUpgradeInfo,
  IChartGraphicPresetUpgradeResult,
  IClearChartGraphicDentalStatusByHitPayload,
  IChartGraphic,
  IDeleteChartGraphicTargetByHitPayload,
  IChartGraphicHitQueryPayload,
  IChartGraphicHitQueryResult,
  IChartGraphicHitResult,
  IInsertChartGraphicAnnotationByHitPayload,
  IInsertChartGraphicMarkByHitPayload,
  IInsertChartGraphicSeriesPointByHitPayload,
  IUpdateChartGraphicSeriesPointByHitPayload,
  IToggleChartGraphicDentalStatusByHitPayload,
  IChartGraphicSeriesSnapshot,
  IChartGraphicSnapshot,
  IChartGraphicTemplateAuditSummary,
  IChartGraphicTemplatePresetAuditSummary,
  IChartGraphicValidationEntry,
  IChartGraphicValidationIssue,
  IChartGraphicValidationIssueEntry,
  IChartGraphicValidationResult,
  IChartGraphicValidationSummary,
  IChartMark,
  IChartRegion,
  IChartSeries,
  IInsertChartGraphicPayload,
  IRefreshChartGraphicSourceOption,
  IRefreshChartGraphicSourcesPayload,
  IRefreshChartGraphicSourcesResult,
  ChartGraphicTemplateAuditReason
}
