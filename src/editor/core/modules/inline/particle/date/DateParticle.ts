import { ElementType } from '../../../../../dataset/enum/Element'
import { DeepRequired } from '../../../../../interface/Common'
import { IEditorOption } from '../../../../../interface/Editor'
import { IElement, IElementPosition } from '../../../../../interface/Element'
import { formatElementContext } from '../../../../../utils/elementContext'
import { I18n } from '../../../../extension/i18n/I18n'
import { RangeManager } from '../../../../range/RangeManager'
import { Draw } from '../../../../draw/Draw'
import { DatePicker } from './DatePicker'

export class DateParticle {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 选区管理器，用于读取和更新当前编辑范围。 */
  private range: RangeManager
  private datePicker: DatePicker
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  /** 初始化 DateParticle 实例并注入运行依赖。 */
  constructor(draw: Draw, i18n: I18n) {
    this.draw = draw
    this.options = draw.getOptions()
    this.range = draw.getRange()
    this.datePicker = new DatePicker(draw, i18n, {
      onSubmit: this._setValue.bind(this)
    })
  }

  /** 更新值，同步内部状态并触发必要的界面刷新。 */
  private _setValue(date: string) {
    if (!date) return
    const range = this.getDateElementRange()
    if (!range) return
    const [leftIndex, rightIndex] = range
    const elementList = this.draw.getObjectResolver().getElementList()
    const startElement = elementList[leftIndex + 1]
    // 删除旧时间
    this.draw.spliceElementList(
      elementList,
      leftIndex + 1,
      rightIndex - leftIndex
    )
    this.range.setRange(leftIndex, leftIndex)
    // 插入新时间
    const dateElement: IElement = {
      type: ElementType.DATE,
      value: '',
      dateFormat: startElement.dateFormat,
      valueList: [
        {
          value: date
        }
      ]
    }
    formatElementContext(elementList, [dateElement], leftIndex, {
      editorOptions: this.options
    })
    this.draw.insertElementList([dateElement])
  }

  public getDateElementRange(): [number, number] | null {
    let leftIndex = -1
    let rightIndex = -1
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return null
    const elementList = this.draw.getObjectResolver().getElementList()
    const startElement = elementList[startIndex]
    if (startElement.type !== ElementType.DATE) return null
    // 向左查找
    let preIndex = startIndex
    while (preIndex >= 0) {
      const preElement = elementList[preIndex]
      if (preElement.dateId !== startElement.dateId) {
        leftIndex = preIndex
        break
      }
      preIndex--
    }
    // 向右查找
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      if (nextElement.dateId !== startElement.dateId) {
        rightIndex = nextIndex - 1
        break
      }
      nextIndex++
    }
    // 控件在最后
    if (nextIndex === elementList.length) {
      rightIndex = nextIndex - 1
    }
    if (!~leftIndex || !~rightIndex) return null
    return [leftIndex, rightIndex]
  }

  public clearDatePicker() {
    this.datePicker.dispose()
  }

  public renderDatePicker(element: IElement, position: IElementPosition) {
    const elementList = this.draw.getObjectResolver().getElementList()
    const range = this.getDateElementRange()
    const value = range
      ? elementList
          .slice(range[0] + 1, range[1] + 1)
          .map(el => el.value)
          .join('')
      : ''
    this.datePicker.render({
      value,
      position,
      dateFormat: element.dateFormat
    })
  }
}
