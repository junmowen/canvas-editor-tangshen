import { CommandAdaptTable } from './CommandAdaptTable'
import { WRAP, ZERO } from '../../dataset/constant/Common'
import { defaultWatermarkOption } from '../../dataset/constant/Watermark'
import { ImageDisplay } from '../../dataset/enum/Common'
import { ElementType } from '../../dataset/enum/Element'
import { IDrawImagePayload } from '../../interface/Draw'
import { IElement } from '../../interface/Element'
import { IWatermark } from '../../interface/Watermark'
import { downloadFile, getUUID } from '../../utils'
import { formatElementContext } from '../../utils/element'

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
    const { valueList, url } = payload
    const hyperlinkId = getUUID()
    const newElementList = valueList?.map<IElement>(v => ({
      ...v,
      url,
      hyperlinkId,
      value: v.value,
      type: ElementType.HYPERLINK
    }))
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
    // 超链接入口不只看当前光标，还要兼容选区两端和相邻元素。
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
    const matchedElement = candidateElementList.find(
      element => element?.type === ElementType.HYPERLINK
    )
    if (!matchedElement?.hyperlinkId) return null
    const hyperlinkId = matchedElement.hyperlinkId
    const startIndex = elementList.indexOf(matchedElement)
    if (startIndex < 0) return null
    let leftIndex = startIndex
    let rightIndex = startIndex
    // 向左查找
    let preIndex = startIndex - 1
    while (preIndex >= 0) {
      const preElement = elementList[preIndex]
      if (preElement.hyperlinkId !== hyperlinkId) {
        break
      }
      leftIndex = preIndex
      preIndex--
    }
    // 向右查找
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      if (nextElement.hyperlinkId !== hyperlinkId) {
        break
      }
      rightIndex = nextIndex
      nextIndex++
    }
    // 控件在最后
    if (nextIndex === elementList.length) {
      rightIndex = nextIndex - 1
    }
    if (!~leftIndex || !~rightIndex) return null
    return [leftIndex, rightIndex]
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
    // 删除属性
    for (let i = leftIndex; i <= rightIndex; i++) {
      const element = elementList[i]
      delete element.type
      delete element.url
      delete element.hyperlinkId
      delete element.underline
    }
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
    // 替换url
    for (let i = leftIndex; i <= rightIndex; i++) {
      const element = elementList[i]
      element.url = payload
    }
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
    if (endElement && endElement.type === ElementType.SEPARATOR) {
      if (
        endElement.dashArray &&
        endElement.dashArray.join() === payload.join()
      ) {
        return
      }
      curIndex = endIndex
      endElement.dashArray = payload
    } else {
      const newElement: IElement = {
        value: WRAP,
        type: ElementType.SEPARATOR,
        dashArray: payload
      }
      // 从行头增加分割线
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      const startElement = targetResolver.resolveRangeElement({
        elementList,
        anchor: 'start'
      })
      if (startIndex !== 0 && startElement?.value === ZERO) {
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
    this.insertElementList([
      {
        type: ElementType.PAGE_BREAK,
        value: WRAP
      }
    ])
  }

  /** 添加或更新文档水印配置。 */
  public addWatermark(payload: IWatermark) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const options = this.draw.getOptions()
    const { type, color, size, opacity, font, gap, width, height, numberType } =
      defaultWatermarkOption
    options.watermark.data = payload.data
    options.watermark.type = payload.type || type
    options.watermark.width = payload.width || width
    options.watermark.height = payload.height || height
    options.watermark.color = payload.color || color
    options.watermark.size = payload.size || size
    options.watermark.opacity = payload.opacity || opacity
    options.watermark.font = payload.font || font
    options.watermark.repeat = !!payload.repeat
    options.watermark.numberType = payload.numberType || numberType
    options.watermark.gap = payload.gap || gap
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
    if (options.watermark && options.watermark.data) {
      options.watermark = { ...defaultWatermarkOption }
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
    this.insertElementList([
      {
        ...payload,
        id: imageId,
        type: ElementType.IMAGE
      }
    ])
    return imageId
  }

  /** 替换当前图片元素的资源信息。 */
  public replaceImageElement(payload: string) {
    const element = this.draw.getTargetResolver().resolveRangeElement()
    if (!element || element.type !== ElementType.IMAGE) return
    element.value = payload
    this.draw.render({
      isSetCursor: false
    })
  }

  /** 将当前图片元素保存为本地图片文件。 */
  public saveAsImageElement() {
    const element = this.draw.getTargetResolver().resolveRangeElement()
    if (!element || element.type !== ElementType.IMAGE) return
    downloadFile(element.value, `${element.id!}.png`)
  }

  /** 切换当前图片元素的显示方式。 */
  public changeImageDisplay(element: IElement, display: ImageDisplay) {
    if (element.imgDisplay === display) return
    element.imgDisplay = display
    const { startIndex, endIndex } = this.getRange()
    if (
      display === ImageDisplay.SURROUND ||
      display === ImageDisplay.TIGHT ||
      display === ImageDisplay.FLOAT_TOP ||
      display === ImageDisplay.FLOAT_BOTTOM
    ) {
      const positionList = this.coordinate.getPositionList()
      const {
        pageNo,
        coordinate: { leftTop }
      } = positionList[startIndex]
      element.imgFloatPosition = {
        pageNo,
        x: leftTop[0],
        y: leftTop[1]
      }
    } else {
      delete element.imgFloatPosition
    }
    this.draw.getComponents().previewer.clearResizer()
    this.draw.render({
      isSetCursor: true,
      curIndex: endIndex
    })
  }
}
