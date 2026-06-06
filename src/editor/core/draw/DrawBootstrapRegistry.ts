import { Cursor } from '../runtime/cursor/Cursor'
import { HistoryManager } from '../runtime/history/HistoryManager'
import { Position } from '../position/Position'
import { RangeManager } from '../range/RangeManager'
import { Header } from '../modules/header/runtime/Header'
import { Footer } from '../modules/footer/runtime/Footer'
import { TableParticle } from '../modules/table/particle/TableParticle'
import { HyperlinkParticle } from '../modules/inline/particle/HyperlinkParticle'
import { ImageParticle } from '../modules/image/particle/ImageParticle'
import { Control } from '../modules/control/runtime/Control'
import { Zone } from '../runtime/zone/Zone'
import { TableHitTestService } from '../modules/table/hittest/TableHitTestService'
import { DrawComponentRegistry } from './runtime/DrawComponentRegistry'

/** 构造阶段组件注册表尚未完成时的临时依赖容器。 */
export class DrawBootstrapRegistry {
  private historyManager?: HistoryManager
  private position?: Position
  private zone?: Zone
  private range?: RangeManager
  private header?: Header
  private footer?: Footer
  private tableParticle?: TableParticle
  private hyperlinkParticle?: HyperlinkParticle
  private imageParticle?: ImageParticle
  private control?: Control
  private cursor?: Cursor
  private tableHitTestService?: TableHitTestService

  public setHistoryManager(payload: HistoryManager) {
    this.historyManager = payload
  }

  public setPosition(payload: Position) {
    this.position = payload
  }

  public setZone(payload: Zone) {
    this.zone = payload
  }

  public setRange(payload: RangeManager) {
    this.range = payload
  }

  public setHeader(payload: Header) {
    this.header = payload
  }

  public setFooter(payload: Footer) {
    this.footer = payload
  }

  public setTableParticle(payload: TableParticle) {
    this.tableParticle = payload
  }

  public setHyperlinkParticle(payload: HyperlinkParticle) {
    this.hyperlinkParticle = payload
  }

  public setImageParticle(payload: ImageParticle) {
    this.imageParticle = payload
  }

  public setControl(payload: Control) {
    this.control = payload
  }

  public setCursor(payload: Cursor) {
    this.cursor = payload
  }

  public setTableHitTestService(payload: TableHitTestService) {
    this.tableHitTestService = payload
  }

  public resolveHistoryManager(components: DrawComponentRegistry | undefined) {
    return components?.historyManager || this.historyManager!
  }

  public resolvePosition(components: DrawComponentRegistry | undefined) {
    return components?.position || this.position!
  }

  public resolveTableHitTestService(
    components: DrawComponentRegistry | undefined
  ) {
    return components?.tableHitTestService || this.tableHitTestService!
  }

  public resolveZone(components: DrawComponentRegistry | undefined) {
    return components?.zone || this.zone!
  }

  public resolveRange(components: DrawComponentRegistry | undefined) {
    return components?.range || this.range!
  }

  public resolveCursor(components: DrawComponentRegistry | undefined) {
    return components?.cursor || this.cursor!
  }

  public resolveImageParticle(components: DrawComponentRegistry | undefined) {
    return components?.imageParticle || this.imageParticle!
  }

  public resolveTableParticle(components: DrawComponentRegistry | undefined) {
    return components?.tableParticle || this.tableParticle!
  }

  public resolveHeader(components: DrawComponentRegistry | undefined) {
    return components?.header || this.header!
  }

  public resolveFooter(components: DrawComponentRegistry | undefined) {
    return components?.footer || this.footer!
  }

  public resolveHyperlinkParticle(
    components: DrawComponentRegistry | undefined
  ) {
    return components?.hyperlinkParticle || this.hyperlinkParticle!
  }

  public resolveControl(components: DrawComponentRegistry | undefined) {
    return components?.control || this.control!
  }
}
