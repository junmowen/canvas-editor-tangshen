import { ZERO } from '../../../dataset/constant/Common'
import { ElementType } from '../../../dataset/enum/Element'
import { EditorMode } from '../../../dataset/enum/Editor'
import {
  IAppendElementListOption
} from '../../../interface/Draw'
import { IEditorData, ISetValueOption } from '../../../interface/Editor'
import {
  IElement,
  IInsertElementListOption,
  ISpliceElementListOption
} from '../../../interface/Element'
import { deepClone } from '../../../utils'
import { formatElementList } from '../../../utils/element'
import type { Draw } from '../Draw'

/**
 * Draw 文档写操作服务。
 *
 * 负责把插入、追加、替换、删除、整体 setValue 等正文修改操作
 * 收敛到统一入口中，避免这些过程型逻辑继续散落在 `Draw` 门面。
 */
export class DrawMutationService {
  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {}

  /**
   * 在光标位置插入元素列表。
   *
   * 支持在正文和控件中插入元素，会处理范围选择和列表格式化。
   *
   * @param payload - 要插入的元素列表
   * @param options - 插入选项
   * @param options.isSubmitHistory - 是否提交到历史记录，默认为 true
   */
  public insertElementList(
    payload: IElement[],
    options: IInsertElementListOption = {}
  ) {
    const components = this.draw.getComponents()
    // 如果元素列表为空或当前不允许输入，直接返回
    if (!payload.length || !components.range.getIsCanInput()) return
    // 获取编辑边界范围
    const { startIndex, endIndex } = components.range.getEditBoundaryRange()
    // 如果没有有效的边界，直接返回
    if (!~startIndex && !~endIndex) return
    const { isSubmitHistory = true } = options
    // 格式化元素列表
    formatElementList(payload, {
      isHandleFirstElement: false,
      editorOptions: this.draw.getRuntime().getOptions()
    })
    let curIndex = -1
    // 获取当前激活的控件
    let activeControl = components.control.getActiveControl()
    // 如果范围在控件内但没有激活控件，初始化控件
    if (!activeControl && components.control.getIsRangeWithinControl()) {
      components.control.initControl()
      activeControl = components.control.getActiveControl()
    }
    // 如果在控件范围内，使用控件设置值
    if (activeControl && components.control.getIsRangeWithinControl()) {
      curIndex = activeControl.setValue(payload, undefined, {
        isIgnoreDisabledRule: true
      })
      // 触发控件内容变更事件
      components.control.emitControlContentChange()
    } else {
      // 获取当前元素列表
      const elementList = this.draw.getElementList()
      // 判断是否为折叠光标（光标位置前后相同）
      const isCollapsed = startIndex === endIndex
      const start = startIndex + 1
      // 如果不是折叠光标，先删除选中范围内的元素
      if (!isCollapsed) {
        this.spliceElementList(elementList, start, endIndex - startIndex)
      }
      // 在指定位置插入新元素
      this.spliceElementList(elementList, start, 0, payload)
      curIndex = startIndex + payload.length
      // 获取插入位置前的元素
      const preElement = elementList[start - 1]
      // 如果插入的元素有列表ID，且前一个元素是空的文本元素，移除该前元素
      if (
        payload[0].listId &&
        preElement &&
        !preElement.listId &&
        preElement?.value === ZERO &&
        (!preElement.type || preElement.type === ElementType.TEXT)
      ) {
        elementList.splice(startIndex, 1)
        curIndex -= 1
      }
    }
    // 如果有有效的光标位置，设置范围并渲染
    if (~curIndex) {
      components.range.setRange(curIndex, curIndex)
      this.draw.render({
        curIndex,
        isSubmitHistory
      })
    }
  }

  /**
   * 追加或前置元素列表到正文区域。
   *
   * 支持在正文区域的开头或结尾添加元素列表。
   *
   * @param elementList - 要追加的元素列表
   * @param options - 追加选项
   * @param options.isPrepend - 是否前置（插入到开头），默认为 false
   * @param options.isSubmitHistory - 是否提交到历史记录，默认为 true
   */
  public appendElementList(
    elementList: IElement[],
    options: IAppendElementListOption = {}
  ) {
    // 如果元素列表为空，直接返回
    if (!elementList.length) return
    // 格式化元素列表
    formatElementList(elementList, {
      isHandleFirstElement: false,
      editorOptions: this.draw.getRuntime().getOptions()
    })
    let curIndex: number
    const { isPrepend, isSubmitHistory = true } = options
    // 获取正文元素列表
    const mainElementList = this.draw.getOriginalMainElementList()
    // 如果是前置模式，在开头插入；否则在末尾追加
    if (isPrepend) {
      // 有起始占位符时保留占位符；否则真正插到正文第一项之前。
      const insertIndex = mainElementList[0]?.value === ZERO ? 1 : 0
      mainElementList.splice(insertIndex, 0, ...elementList)
      curIndex = insertIndex + elementList.length - 1
    } else {
      // 在末尾追加元素
      mainElementList.push(...elementList)
      curIndex = mainElementList.length - 1
    }
    // 设置选区到插入位置
    this.draw.getComponents().range.setRange(curIndex, curIndex)
    // 渲染文档
    this.draw.render({
      curIndex,
      isSubmitHistory
    })
  }

  /**
   * 修改元素列表。
   *
   * 支持删除和插入元素，会处理列表格式化和可删除规则。
   *
   * @param elementList - 要修改的元素列表
   * @param start - 起始索引
   * @param deleteCount - 要删除的元素数量
   * @param items - 要插入的元素列表（可选）
   * @param options - 修改选项
   * @param options.isIgnoreDeletedRule - 是否忽略删除规则，默认为 false
   */
  public spliceElementList(
    elementList: IElement[],
    start: number,
    deleteCount: number,
    items?: IElement[],
    options?: ISpliceElementListOption
  ) {
    const { isIgnoreDeletedRule = false } = options || {}
    const { group, modeRule } = this.draw.getRuntime().getOptions()
    // 如果有需要删除的元素
    if (deleteCount > 0) {
      // 计算结束索引
      const endIndex = start + deleteCount
      const endElement = elementList[endIndex]
      const endElementListId = endElement?.listId
      // 如果删除的最后一个元素属于某个列表，且前一个元素不属于该列表，需要处理后续列表格式
      if (
        endElementListId &&
        elementList[start - 1]?.listId !== endElementListId
      ) {
        let startIndex = endIndex
        // 遍历后续元素，清除列表属性，直到遇到不同列表或零元素
        while (startIndex < elementList.length) {
          const curElement = elementList[startIndex]
          if (
            curElement.listId !== endElementListId ||
            curElement.value === ZERO
          ) {
            break
          }
          // 清除列表相关属性
          delete curElement.listId
          delete curElement.listType
          delete curElement.listStyle
          delete curElement.listLevel
          startIndex++
        }
      }
      // 如果不忽略删除规则且不在设计模式，则执行可删除性检查
      if (
        !isIgnoreDeletedRule &&
        !this.draw.isDesignMode() &&
        !this.draw.getComponents().control.getIsRangeWithinControl()
      ) {
        // 获取当前表格单元格的可删除性设置
        const tdDeletable = this.draw.getTd()?.deletable
        let deleteIndex = endIndex - 1
        // 从后向前遍历要删除的元素，根据可删除规则判断是否删除
        while (deleteIndex >= start) {
          const deleteElement = elementList[deleteIndex]
          // 判断元素是否可删除（根据隐藏属性、可删除性、表单模式规则等）
          if (
            deleteElement?.hide ||
            deleteElement?.control?.hide ||
            deleteElement?.area?.hide ||
            (tdDeletable !== false &&
              deleteElement?.control?.deletable !== false &&
              (!deleteElement?.controlId ||
                this.draw.getMode() !== EditorMode.FORM ||
                !modeRule[EditorMode.FORM].controlDeletableDisabled) &&
              deleteElement?.title?.deletable !== false &&
              (group.deletable !== false || !deleteElement?.groupIds?.length) &&
              (deleteElement?.area?.deletable !== false ||
                deleteElement?.areaIndex !== 0))
          ) {
            elementList.splice(deleteIndex, 1)
          }
          deleteIndex--
        }
      } else {
        // 直接删除指定数量的元素
        elementList.splice(start, deleteCount)
      }
    }
    // 如果有需要插入的元素
    if (items?.length) {
      // 逐个插入元素到指定位置
      for (let i = 0; i < items.length; i++) {
        elementList.splice(start + i, 0, items[i])
      }
    }
  }

  /**
   * 设置编辑器数据。
   *
   * 批量设置页眉、正文和页脚的数据，支持格式化和光标位置设置。
   *
   * @param payload - 编辑器数据
   * @param options - 设置选项
   * @param options.isSetCursor - 是否设置光标位置，默认为 false
   */
  public setValue(payload: Partial<IEditorData>, options?: ISetValueOption) {
    // 深度克隆输入数据
    const { header, main, footer } = deepClone(payload)
    // 如果所有区域都为空，直接返回
    if (!header && !main && !footer) return
    const { isSetCursor = false } = options || {}
    // 整理各区域数据
    const pageComponentData = [header, main, footer]
    // 遍历每个区域，格式化元素列表
    pageComponentData.forEach(data => {
      if (!data) return
      formatElementList(data, {
        editorOptions: this.draw.getRuntime().getOptions(),
        isForceCompensation: true
      })
    })
    // 设置编辑器数据
    this.draw.setEditorData({
      header,
      main,
      footer
    })
    // 恢复历史记录
    this.draw.getComponents().historyManager.recovery()
    // 根据选项计算光标位置
    const curIndex = isSetCursor
      ? main?.length
        ? main.length - 1
        : 0
      : undefined
    // 如果需要设置光标，设置选区范围
    if (curIndex !== undefined) {
      this.draw.getComponents().range.setRange(curIndex, curIndex)
    }
    // 渲染文档
    this.draw.render({
      curIndex,
      isSetCursor,
      isFirstRender: true
    })
  }
}
