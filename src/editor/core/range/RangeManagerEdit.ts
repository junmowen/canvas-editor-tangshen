import { RangeManagerQuery } from './RangeManagerQuery'
import { ZERO } from '../../dataset/constant/Common'
import { ControlComponent } from '../../dataset/enum/Control'
import { IControlContext } from '../../interface/Control'
import { IElement } from '../../interface/Element'
import { IRange } from '../../interface/Range'
import { createRecoveryRangeStyle, createSelectionRangeStyle } from './rangeStyleFactory'

/**
 * RangeManager 编辑模块，负责 range 写入、样式事件、控件边界收缩和选区渲染。
 */
export class RangeManagerEdit extends RangeManagerQuery {
  /** 清空当前编辑范围。 */
  public clearRange() {
    this.setRange(-1, -1)
  }

  /** 判断当前 range 是否允许输入内容。 */
  public getIsCanInput(): boolean {
    const { startIndex, endIndex } = this.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return false
    const targetResolver = this.draw.getTargetResolver()
    // 这里统一从 TargetResolver 取边界元素，避免 RangeManager 自己解释坐标语义。
    const { elementList, startElement, endElement } =
      targetResolver.resolveRangeBoundaryElements()
    if (!startElement) {
      return false
    }
    if (startIndex === endIndex) {
      const nextElement = targetResolver.resolveRangeElement({
        elementList,
        anchor: 'start',
        offset: 1
      })
      return (
        (startElement.controlComponent !== ControlComponent.PRE_TEXT ||
          nextElement?.controlComponent !== ControlComponent.PRE_TEXT) &&
        startElement.controlComponent !== ControlComponent.POST_TEXT
      )
    }
    if (!endElement) {
      return false
    }
    // 选区前后不是控件 || 选区前不是控件或是后缀&&选区后不是控件或是后缀 || 选区在控件内
    return (
      (!startElement.controlId && !endElement.controlId) ||
      ((!startElement.controlId ||
        startElement.controlComponent === ControlComponent.POSTFIX) &&
        (!endElement.controlId ||
          endElement.controlComponent === ControlComponent.POSTFIX)) ||
      (!!startElement.controlId &&
        endElement.controlId === startElement.controlId &&
        endElement.controlComponent !== ControlComponent.PRE_TEXT &&
        endElement.controlComponent !== ControlComponent.POST_TEXT &&
        endElement.controlComponent !== ControlComponent.POSTFIX)
    )
  }

  /** 写入新的编辑范围并同步控件激活状态。 */
  public setRange(
    startIndex: number,
    endIndex: number,
    tableId?: string,
    startTdIndex?: number,
    endTdIndex?: number,
    startTrIndex?: number,
    endTrIndex?: number
  ) {
    // 判断光标是否改变
    const isChange = this.getIsRangeChange(
      startIndex,
      endIndex,
      tableId,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    )
    if (isChange) {
      this.range.startIndex = startIndex
      this.range.endIndex = endIndex
      this.range.tableId = tableId
      this.range.startTdIndex = startTdIndex
      this.range.endTdIndex = endTdIndex
      this.range.startTrIndex = startTrIndex
      this.range.endTrIndex = endTrIndex
      this.range.isCrossRowCol = !!(
        tableId &&
        startTdIndex !== undefined &&
        endTdIndex !== undefined &&
        startTrIndex !== undefined &&
        endTrIndex !== undefined
      )
      this.setDefaultStyle(null)
    }
    this.range.zone = this.draw.getZone().getZone()
    // 激活控件
    const control = this.draw.getControl()
    if (~startIndex && ~endIndex) {
      const element = this.draw.getTargetResolver().resolveRangeElement()
      if (element?.controlId) {
        control.initControl()
        return
      }
    }
    control.destroyControl()
  }

  /** 用给定 range 替换当前编辑范围。 */
  public replaceRange(range: IRange) {
    this.setRange(
      range.startIndex,
      range.endIndex,
      range.tableId,
      range.startTdIndex,
      range.endTdIndex,
      range.startTrIndex,
      range.endTrIndex
    )
  }

  /** 将非闭合选区收缩到结束边界。 */
  public shrinkRange() {
    const { startIndex, endIndex } = this.range
    if (startIndex === endIndex || (!~startIndex && !~endIndex)) return
    this.replaceRange({
      ...this.range,
      startIndex: endIndex
    })
  }

  /** 根据当前选区计算并派发工具栏样式状态。 */
  public setRangeStyle() {
    const rangeStyleChangeListener = this.listener.rangeStyleChange
    const isSubscribeRangeStyleChange =
      this.eventBus.isSubscribe('rangeStyleChange')
    if (!rangeStyleChangeListener && !isSubscribeRangeStyleChange) return
    // 结束光标位置
    const { startIndex, endIndex, isCrossRowCol } = this.range
    if (!~startIndex && !~endIndex) return
    let curElement: IElement | null
    if (isCrossRowCol) {
      // 单元格选择以当前表格定位
      curElement =
        this.draw.getTargetResolver().resolveContextTable({
          positionContext: this.coordinate.getPositionContext(),
          range: this.range
        })?.element || null
    } else {
      const index = ~endIndex ? endIndex : 0
      // 行首以第一个非换行符元素定位
      const elementList = this.draw.getObjectResolver().getElementList()
      curElement = this.getRangeAnchorStyle(elementList, index)
    }
    if (!curElement) return
    const rangeStyle = createSelectionRangeStyle({
      options: this.options,
      runtime: {
        canUndo: this.historyManager.isCanUndo(),
        canRedo: this.historyManager.isCanRedo(),
        painter: !!this.draw.getPainterStyle()
      },
      activeElement: curElement,
      selectionElements: this.getSelection() || [curElement]
    })
    if (rangeStyleChangeListener) {
      rangeStyleChangeListener(rangeStyle)
    }
    if (isSubscribeRangeStyleChange) {
      this.eventBus.emit('rangeStyleChange', rangeStyle)
    }
  }

  /** 恢复无选区时的工具栏样式状态。 */
  public recoveryRangeStyle() {
    const rangeStyleChangeListener = this.listener.rangeStyleChange
    const isSubscribeRangeStyleChange =
      this.eventBus.isSubscribe('rangeStyleChange')
    if (!rangeStyleChangeListener && !isSubscribeRangeStyleChange) return
    const rangeStyle = createRecoveryRangeStyle({
      options: this.options,
      runtime: {
        canUndo: this.historyManager.isCanUndo(),
        canRedo: this.historyManager.isCanRedo(),
        painter: !!this.draw.getPainterStyle()
      }
    })
    if (rangeStyleChangeListener) {
      rangeStyleChangeListener(rangeStyle)
    }
    if (isSubscribeRangeStyleChange) {
      this.eventBus.emit('rangeStyleChange', rangeStyle)
    }
  }

  /** 按控件组件边界收缩当前编辑范围。 */
  public shrinkBoundary(context: IControlContext = {}) {
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    const range = context.range || this.getEditBoundaryRange()
    const { startIndex, endIndex } = range
    if (!~startIndex && !~endIndex) return
    const targetResolver = this.draw.getTargetResolver()
    // 控件边界判断统一交给 TargetResolver，RangeManager 只负责收缩结果。
    const { startElement, endElement } = targetResolver.resolveRangeBoundaryElements(
      {
        range,
        elementList
      }
    )
    if (!startElement || !endElement) return
    if (startIndex === endIndex) {
      if (startElement.controlComponent === ControlComponent.PLACEHOLDER) {
        // 找到第一个placeholder字符
        let index = startIndex - 1
        while (index > 0) {
          const preElement = elementList[index]
          if (
            preElement.controlId !== startElement.controlId ||
            preElement.controlComponent === ControlComponent.PREFIX ||
            preElement.controlComponent === ControlComponent.PRE_TEXT
          ) {
            range.startIndex = index
            range.endIndex = index
            break
          }
          index--
        }
      }
    } else {
      // 首、尾为占位符时，收缩到最后一个前缀字符后
      if (
        startElement.controlComponent === ControlComponent.PLACEHOLDER ||
        endElement.controlComponent === ControlComponent.PLACEHOLDER
      ) {
        let index = endIndex - 1
        while (index > 0) {
          const preElement = elementList[index]
          if (
            preElement.controlId !== endElement.controlId ||
            preElement.controlComponent === ControlComponent.PREFIX ||
            preElement.controlComponent === ControlComponent.PRE_TEXT
          ) {
            range.startIndex = index
            range.endIndex = index
            return
          }
          index--
        }
      }
      // 向右查找到第一个Value
      if (startElement.controlComponent === ControlComponent.PREFIX) {
        let index = startIndex + 1
        while (index < elementList.length) {
          const nextElement = elementList[index]
          if (
            nextElement.controlId !== startElement.controlId ||
            nextElement.controlComponent === ControlComponent.VALUE
          ) {
            range.startIndex = index - 1
            break
          } else if (
            nextElement.controlComponent === ControlComponent.PLACEHOLDER
          ) {
            range.startIndex = index - 1
            range.endIndex = index - 1
            return
          }
          index++
        }
      }
      // 向左查找到第一个Value
      if (endElement.controlComponent !== ControlComponent.VALUE) {
        let index = startIndex - 1
        while (index > 0) {
          const preElement = elementList[index]
          if (
            preElement.controlId !== startElement.controlId ||
            preElement.controlComponent === ControlComponent.VALUE
          ) {
            range.startIndex = index
            break
          } else if (
            preElement.controlComponent === ControlComponent.PLACEHOLDER
          ) {
            range.startIndex = index
            range.endIndex = index
            return
          }
          index--
        }
      }
    }
  }

  /** 在画布上渲染选区背景矩形。 */
  public render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    ctx.save()
    ctx.globalAlpha = this.options.rangeAlpha
    ctx.fillStyle = this.options.rangeColor
    ctx.fillRect(x, y, width, height)
    ctx.restore()
  }

  /** 将当前文本类选区转换为纯文本。 */
  public toString(): string {
    const selection = this.getTextLikeSelectionElementList()
    if (!selection) return ''
    return selection
      .map(s => s.value)
      .join('')
      .replace(new RegExp(ZERO, 'g'), '')
  }
}
