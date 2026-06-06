import { CommandAdaptTable } from './CommandAdaptTable'
import { ImageDisplay } from '../../dataset/enum/Common'
import { IDrawImagePayload } from '../../interface/Draw'
import { IElement } from '../../interface/Element'
import { IWatermark } from '../../interface/Watermark'
import { getUUID } from '../../utils'
import { formatElementContext } from '../../utils/elementContext'
import {
  applyImageDisplayChange,
  createCommandImageElement,
  replaceImageElementValue,
  saveImageElement
} from '../modules/image/command/ImageCommandPolicy'
import {
  clearHyperlinkAttrs,
  createHyperlinkElementList,
  resolveHyperlinkRangeFromCandidates,
  updateHyperlinkUrl
} from '../modules/inline/command/HyperlinkCommandPolicy'
import {
  applyWatermarkOptions,
  resetWatermarkOptions
} from '../modules/watermark/command/WatermarkCommandPolicy'
import {
  applySeparatorDashArray,
  createSeparatorElement,
  shouldReplaceParagraphStartWithSeparator
} from '../modules/separator/command/SeparatorCommandPolicy'
import { createPageBreakElement } from '../modules/page-break/command/PageBreakCommandPolicy'

/**
 * 媒体与装饰命令适配模块，负责超链接、图片、分隔符、分页符和水印相关命令。
 */
export class CommandAdaptMedia extends CommandAdaptTable {
  /** 为当前选区添加超链接。 */
  public hyperlink(payload: IElement) {
    if (this.isCommandDisabled()) return
    const activeControl = this.control.getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const hyperlinkId = getUUID()
    const newElementList = createHyperlinkElementList(payload, hyperlinkId)
    if (!newElementList) return
    const start = startIndex + 1
    formatElementContext(elementList, newElementList, startIndex, {
      editorOptions: this.options
    })
    this.draw.spliceElementList(
      elementList,
      start,
      startIndex === endIndex ? 0 : endIndex - startIndex,
      newElementList
    )
    const curIndex = start + newElementList.length - 1
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  /** 解析当前光标或选区所在的超链接范围。 */
  public getHyperlinkRange(): [number, number] | null {
    const targetResolver = this.draw.getTargetResolver()
    const { elementList, startElement, endElement } =
      targetResolver.resolveRangeBoundaryElements()
    const selectedElementList = this.range.getSelectionElementList() || []
    // 超链接入口不只看当前光标，还要覆盖选区两端和相邻元素。
    const nextElement = targetResolver.resolveRangeElement({
      elementList,
      anchor: 'end',
      offset: 1
    })
    const prevElement = targetResolver.resolveRangeElement({
      elementList,
      anchor: 'start',
      offset: -1
    })
    const candidateElementList = [
      selectedElementList[0] || null,
      startElement,
      endElement,
      nextElement,
      prevElement
    ]
    return resolveHyperlinkRangeFromCandidates({
      elementList,
      candidateElementList
    })
  }

  /** 删除当前超链接及其文本内容。 */
  public deleteHyperlink() {
    if (this.isCommandDisabled()) return
    // 获取超链接索引
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const [leftIndex, rightIndex] = hyperRange
    // 删除元素
    this.draw.spliceElementList(
      elementList,
      leftIndex,
      rightIndex - leftIndex + 1
    )
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    // 重置画布
    const newIndex = leftIndex - 1
    this.range.setRange(newIndex, newIndex)
    this.draw.render({
      curIndex: newIndex
    })
  }

  /** 取消当前超链接但保留文本内容。 */
  public cancelHyperlink() {
    if (this.isCommandDisabled()) return
    // 获取超链接索引
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const [leftIndex, rightIndex] = hyperRange
    clearHyperlinkAttrs(elementList, leftIndex, rightIndex)
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    // 重置画布
    const { endIndex } = this.getRange()
    this.draw.render({
      curIndex: endIndex,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  /** 编辑当前超链接地址和显示文本。 */
  public editHyperlink(payload: string) {
    if (this.isCommandDisabled()) return
    // 获取超链接索引
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const [leftIndex, rightIndex] = hyperRange
    updateHyperlinkUrl(elementList, leftIndex, rightIndex, payload)
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    // 重置画布
    const { endIndex } = this.getRange()
    this.draw.render({
      curIndex: endIndex,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  /** 在当前选区插入分隔符。 */
  public separator(payload: number[]) {
    if (this.isCommandDisabled()) return
    const activeControl = this.control.getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return
    const targetResolver = this.draw.getTargetResolver()
    const elementList = targetResolver.resolveRangeBoundaryElements().elementList
    let curIndex = -1
    // 光标存在分割线，则判断为修改线段逻辑
    const endElement = targetResolver.resolveRangeElement({
      elementList,
      anchor: 'end',
      offset: 1
    })
    const separatorUpdate = applySeparatorDashArray(endElement, payload)
    if (separatorUpdate !== 'not-separator') {
      if (separatorUpdate === 'unchanged') return
      curIndex = endIndex
    } else {
      const newElement = createSeparatorElement(payload)
      // 从行头增加分割线
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      const startElement = targetResolver.resolveRangeElement({
        elementList,
        anchor: 'start'
      })
      if (
        shouldReplaceParagraphStartWithSeparator({
          startIndex,
          startElement
        })
      ) {
        this.draw.spliceElementList(elementList, startIndex, 1, [newElement])
        curIndex = startIndex - 1
      } else {
        this.draw.spliceElementList(elementList, startIndex + 1, 0, [
          newElement
        ])
        curIndex = startIndex
      }
    }
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  /** 在当前选区插入分页符。 */
  public pageBreak() {
    if (this.isCommandDisabled()) return
    const activeControl = this.control.getActiveControl()
    if (activeControl) return
    this.insertElementList([createPageBreakElement()])
  }

  /** 添加或更新文档水印配置。 */
  public addWatermark(payload: IWatermark) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const options = this.draw.getOptions()
    applyWatermarkOptions(options, payload)
    this.draw.render({
      isSetCursor: false,
      isSubmitHistory: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  /** 删除文档水印配置。 */
  public deleteWatermark() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const options = this.draw.getOptions()
    if (resetWatermarkOptions(options)) {
      this.draw.render({
        isSetCursor: false,
        isSubmitHistory: false,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 在当前选区插入图片元素。 */
  public image(payload: IDrawImagePayload): string | null {
    if (this.isCommandDisabled()) return null
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return null
    const imageId = payload.id || getUUID()
    this.insertElementList([createCommandImageElement(payload, imageId)])
    return imageId
  }

  /** 替换当前图片元素的资源信息。 */
  public replaceImageElement(payload: string) {
    const element = this.draw.getTargetResolver().resolveRangeElement()
    if (!replaceImageElementValue(element, payload)) return
    this.draw.render({
      isSetCursor: false
    })
  }

  /** 将当前图片元素保存为本地图片文件。 */
  public saveAsImageElement() {
    const element = this.draw.getTargetResolver().resolveRangeElement()
    saveImageElement(element)
  }

  /** 切换当前图片元素的显示方式。 */
  public changeImageDisplay(element: IElement, display: ImageDisplay) {
    const { startIndex, endIndex } = this.getRange()
    const isChanged = applyImageDisplayChange({
      element,
      display,
      startIndex,
      positionList: this.coordinate.getPositionList()
    })
    if (!isChanged) return
    this.draw.getComponents().previewer.clearResizer()
    this.draw.render({
      isSetCursor: true,
      curIndex: endIndex
    })
  }
}
