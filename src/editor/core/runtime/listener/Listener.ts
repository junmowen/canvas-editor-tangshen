import {
  IContentChange,
  IControlChange,
  IControlContentChange,
  IIntersectionPageNoChange,
  IPageModeChange,
  IPageScaleChange,
  IPageSizeChange,
  IRangeStyleChange,
  ISaved,
  IVisiblePageNoListChange,
  IZoneChange
} from '../../../interface/Listener'

export class Listener {
  /** range Style Change 回调入口，用于通知外部或响应对应事件。 */
  public rangeStyleChange: IRangeStyleChange | null
  /** visible Page No List Change 回调入口，用于通知外部或响应对应事件。 */
  public visiblePageNoListChange: IVisiblePageNoListChange | null
  /** intersection Page No Change 回调入口，用于通知外部或响应对应事件。 */
  public intersectionPageNoChange: IIntersectionPageNoChange | null
  /** page Size Change 回调入口，用于通知外部或响应对应事件。 */
  public pageSizeChange: IPageSizeChange | null
  /** page Scale Change 回调入口，用于通知外部或响应对应事件。 */
  public pageScaleChange: IPageScaleChange | null
  /** saved 回调入口，用于通知外部或响应对应事件。 */
  public saved: ISaved | null
  /** content Change 回调入口，用于通知外部或响应对应事件。 */
  public contentChange: IContentChange | null
  /** control Change 回调入口，用于通知外部或响应对应事件。 */
  public controlChange: IControlChange | null
  /** control Content Change 回调入口，用于通知外部或响应对应事件。 */
  public controlContentChange: IControlContentChange | null
  /** page Mode Change 回调入口，用于通知外部或响应对应事件。 */
  public pageModeChange: IPageModeChange | null
  /** zone Change 回调入口，用于通知外部或响应对应事件。 */
  public zoneChange: IZoneChange | null

  /** 初始化 Listener 实例并注入运行依赖。 */
  constructor() {
    this.rangeStyleChange = null
    this.visiblePageNoListChange = null
    this.intersectionPageNoChange = null
    this.pageSizeChange = null
    this.pageScaleChange = null
    this.saved = null
    this.contentChange = null
    this.controlChange = null
    this.controlContentChange = null
    this.pageModeChange = null
    this.zoneChange = null
  }
}
