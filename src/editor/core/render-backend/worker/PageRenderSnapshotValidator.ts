
import { WatermarkType } from '../../../dataset/enum/Watermark'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { ZERO } from '../../../dataset/constant/Common'
import { isChartGraphicElement } from '../../modules/chart-graphics/layout/ChartGraphicElementLayout'
import { isCheckboxHitElement, isRadioHitElement } from '../../modules/control/hittest/ControlHitTest'
import { isImageElement } from '../../modules/image/layout/InlineImageElementLayout'
import { isWorkerSnapshotSupportedFloatingImage } from '../../modules/image/render/WorkerSnapshotImageRenderPolicy'
import { isPageBreakElement } from '../../modules/page-break/layout/PageBreakElementLayout'
import { isSeparatorElement } from '../../modules/separator/layout/SeparatorElementLayout'
import { isTableElement } from '../../modules/table/layout/TableRowLayoutPolicy'
import { isWorkerSnapshotTextElement } from '../../modules/richtext/render/WorkerSnapshotTextStylePolicy'
import { PageRenderSnapshotFrameCommands } from './PageRenderSnapshotFrameCommands'

/** Support boundary checks for worker snapshot generation. */
export abstract class PageRenderSnapshotValidator extends PageRenderSnapshotFrameCommands {
  /** 校验页面supported，在不支持的场景下阻止后台渲染。 */
  protected assertPageSupported(payload: IDrawPagePayload) {
    const options = this.draw.getRuntime().getOptions()
    this.assertHeaderFooterSupported()
    if (options.watermark.data) {
      this.assertWatermarkSupported()
    }
    if (this.draw.getSearch().getSearchKeyword()) {
      throw new Error('worker snapshot does not support active search')
    }
    this.assertAreaSupported()
    for (let i = 0; i < payload.rowList.length; i++) {
      const row = payload.rowList[i]
      if (row.tableFragment) {
        this.assertTableSupported(row.tableFragment)
      }
      for (let j = 0; j < row.elementList.length; j++) {
        this.assertElementSupported(row.elementList[j], row.tableFragment)
      }
    }
  }

  /** 校验元素supported，在不支持的场景下阻止后台渲染。 */
  protected assertElementSupported(
    element: IRowElement,
    tableFragment?: ITableFragmentDescriptor
  ) {
    if (isChartGraphicElement(element)) {
      return
    }
    if (element.value === ZERO) {
      return
    }
    if (this.shouldSkipHiddenElement(element)) {
      return
    }
    if (isSeparatorElement(element)) {
      return
    }
    if (isImageElement(element)) {
      if (this.isFloatingImage(element)) {
        if (
          !isWorkerSnapshotSupportedFloatingImage({
            element,
            tableFragment
          })
        ) {
          throw new Error('worker snapshot does not support floating image')
        }
        return
      }
      return
    }
    if (isCheckboxHitElement(element) || isRadioHitElement(element)) {
      return
    }
    if (isTableElement(element)) {
      if (!tableFragment) {
        this.assertTableSupported(element)
      }
      return
    }
    const type = element.type
    if (isPageBreakElement(element)) {
      return
    }
    if (!isWorkerSnapshotTextElement(element)) {
      throw new Error(`worker snapshot does not support element type=${type}`)
    }
  }

  /** 校验区域装饰是否可进入 worker；隐藏区域按主线程非设计态语义跳过。 */
  protected assertAreaSupported() {
    const areaInfo = this.draw.getArea().getAreaInfo()
    if (!areaInfo.size) return
    for (const [, item] of areaInfo) {
      if (item.area?.hide && this.draw.isDesignMode()) {
        throw new Error('worker snapshot does not support hidden area in design mode')
      }
    }
  }

  /** 校验表格supported，在不支持的场景下阻止后台渲染。 */
  protected assertTableSupported(table: IElement | ITableFragmentDescriptor) {
    if (!table.trList?.length || !table.width || !table.height) {
      throw new Error('worker snapshot does not support incomplete table')
    }
    if (!table.colgroup?.length) {
      throw new Error('worker snapshot does not support table without colgroup')
    }
    for (let t = 0; t < table.trList.length; t++) {
      const tr = table.trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (
          td.x === undefined ||
          td.y === undefined ||
          td.width === undefined ||
          td.height === undefined ||
          !td.rowList ||
          !td.positionList
        ) {
          throw new Error('worker snapshot does not support unmeasured table cell')
        }
        for (let r = 0; r < td.rowList.length; r++) {
          const row = td.rowList[r]
          if (row.tableFragment) {
            throw new Error('worker snapshot does not support nested table fragment')
          }
          for (let e = 0; e < row.elementList.length; e++) {
            const cellElement = row.elementList[e]
            if (isTableElement(cellElement)) {
              throw new Error('worker snapshot does not support nested table')
            }
            this.assertElementSupported(cellElement)
          }
        }
      }
    }
  }

  /** 校验页眉页脚是否可序列化。 */
  protected assertHeaderFooterSupported() {
    const options = this.draw.getRuntime().getOptions()
    if (!this.draw.isPagingPageMode()) return
    if (!options.header.disabled) {
      this.draw.getHeader().getAllRowList().forEach(rowList => {
        this.assertFrameRowsSupported(rowList)
      })
    }
    if (!options.footer.disabled) {
      this.draw.getFooter().getAllRowList().forEach(rowList => {
        this.assertFrameRowsSupported(rowList)
      })
    }
  }

  /** 校验页眉或页脚行。 */
  protected assertFrameRowsSupported(rowList: IDrawPagePayload['rowList']) {
    for (let i = 0; i < rowList.length; i++) {
      const row = rowList[i]
      if (row.isList || row.tableFragment) {
        throw new Error('worker snapshot does not support frame list or table')
      }
      for (let j = 0; j < row.elementList.length; j++) {
        this.assertElementSupported(row.elementList[j])
      }
    }
  }

  /** 校验水印是否可序列化。 */
  protected assertWatermarkSupported() {
    const { watermark } = this.draw.getRuntime().getOptions()
    if (watermark.type === WatermarkType.IMAGE) {
      if (!watermark.width || !watermark.height) {
        throw new Error('worker snapshot does not support incomplete image watermark')
      }
    }
  }
}
