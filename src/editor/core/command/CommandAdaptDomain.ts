import { CommandAdaptPageElement } from './CommandAdaptPageElement'
import { ZERO } from '../../dataset/constant/Common'
import {
  AREA_CONTEXT_ATTR,
  CONTROL_STYLE_ATTR,
  EDITOR_ROW_ATTR,
  LIST_CONTEXT_ATTR,
  TABLE_CONTEXT_ATTR
} from '../../dataset/constant/Element'
import { titleOrderNumberMapping } from '../../dataset/constant/Title'
import { LocationPosition } from '../../dataset/enum/Common'
import { ControlComponent } from '../../dataset/enum/Control'
import { EditorMode, EditorZone } from '../../dataset/enum/Editor'
import { MoveDirection } from '../../dataset/enum/Observer'
import {
  IGetControlValueOption,
  IGetControlValueResult,
  ILocationControlOption,
  ISetControlExtensionOption,
  ISetControlHighlightOption,
  ISetControlProperties,
  ISetControlValueOption
} from '../../interface/Control'
import { IDrawOption } from '../../interface/Draw'
import { IFocusOption } from '../../interface/Editor'
import { IElement, IElementPosition } from '../../interface/Element'
import { IPositionContextByEventOption, IPositionContextByEventResult, ITableInfoByEvent } from '../../interface/Event'
import { ILocationPosition } from '../../interface/Position'
import { RangeRect } from '../../interface/Range'
import { IGetTitleValueOption, IGetTitleValueResult } from '../../interface/Title'
import { cloneProperty, deepClone, isNumber } from '../../utils'
import { getTextFromElementList, zipElementList, getAnchorElement } from '../../utils/element'
import {
  IDeleteAreaOption,
  IInsertAreaOption,
  ILocationAreaOption,
  ISetAreaPropertiesOption,
  ISetAreaValueOption
} from '../../interface/Area'
import { ISetTrackChangeOption } from '../../interface/Command'
import {
  findCommandElementList,
  walkCommandElementList
} from './CommandElementTraversal'

/**
 * 业务域命令适配模块，负责分组、控件、修订、标题、事件定位和区域相关命令。
 */
export class CommandAdaptDomain extends CommandAdaptPageElement {
  /** 为当前选区设置批注分组。 */
  public setGroup(): string | null {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly && this.draw.getMode() !== EditorMode.FORM) return null
    return this.draw.getGroup().setGroup()
  }

  /** 删除指定批注分组。 */
  public deleteGroup(groupId: string) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.draw.getGroup().deleteGroup(groupId)
  }

  /** 获取当前文档中的批注分组 ID 列表。 */
  public getGroupIds(): Promise<string[]> {
    return this.workerManager.getGroupIds()
  }

  /** 获取批注分组当前在正文中的可视矩形，供外部审阅卡片绘制关联线。 */

  public getGroupRectList(groupId: string) {
    const pageCanvasHost = this.draw.getPageCanvasHost()
    return this.coordinate
      .getLayoutMainPositionList()
      .filter(position => position.element?.groupIds?.includes(groupId))
      .map(position => {
        const { leftTop, rightBottom } = position.coordinate
        return {
          pageNo: position.pageNo,
          x: leftTop[0],
          y: pageCanvasHost.getPageTop(position.pageNo) + leftTop[1],
          width: Math.max(1, rightBottom[0] - leftTop[0]),
          height: Math.max(1, rightBottom[1] - leftTop[1])
        }
      })
  }

  /** 定位到指定批注分组所在位置。 */
  public locationGroup(groupId: string) {
    const context = this.draw.getGroup().getContextByGroupId(groupId)
    if (!context) return
    const { isTable, index, trIndex, tdIndex, tdId, trId, tableId, endIndex } =
      context
    this.coordinate.setPositionContext({
      isTable,
      index,
      trIndex,
      tdIndex,
      tdId,
      trId,
      tableId
    })
    this.range.setRange(endIndex, endIndex)
    this.draw.render({
      curIndex: endIndex,
      isCompute: false,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    })
  }

  /** 获取指定控件的当前值。 */
  public getControlValue(
    payload: IGetControlValueOption
  ): IGetControlValueResult | null {
    return this.draw.getControl().getValueById(payload)
  }

  /** 设置单个控件的值。 */
  public setControlValue(payload: ISetControlValueOption) {
    this.draw.getControl().setValueListById([payload])
  }

  /** 批量设置控件值。 */
  public setControlValueList(payload: ISetControlValueOption[]) {
    this.draw.getControl().setValueListById(payload)
  }

  /** 设置单个控件的扩展数据。 */
  public setControlExtension(payload: ISetControlExtensionOption) {
    this.draw.getControl().setExtensionListById([payload])
  }

  /** 批量设置控件扩展数据。 */
  public setControlExtensionList(payload: ISetControlExtensionOption[]) {
    this.draw.getControl().setExtensionListById(payload)
  }

  /** 设置单个控件属性。 */
  public setControlProperties(payload: ISetControlProperties) {
    this.draw.getControl().setPropertiesListById([payload])
  }

  /** 批量设置控件属性。 */
  public setControlPropertiesList(payload: ISetControlProperties[]) {
    this.draw.getControl().setPropertiesListById(payload)
  }

  /** 设置控件高亮状态并刷新覆盖层。 */
  public setControlHighlight(payload: ISetControlHighlightOption) {
    this.draw.getControl().setHighlightList(payload)
    this.draw.getControl().computeHighlightList()
    this.draw.refreshVisibleOverlay({
      isControlDirty: true
    })
  }

  /** 更新修订模式配置。 */
  public setTrackChange(payload: ISetTrackChangeOption) {
    this.draw.getTrackChange().setOptions(payload)
  }

  /** 获取当前文档中的修订批次列表。 */

  public getTrackChangeList() {
    return this.draw.getTrackChange().getRecordList()
  }

  /** 接受指定修订批次。 */

  public acceptTrackChange(id: string) {
    if (!this.draw.getTrackChange().acceptChange(id)) return
    this.renderTrackChangeResolution()
  }

  /** 拒绝指定修订批次。 */

  public rejectTrackChange(id: string) {
    if (!this.draw.getTrackChange().rejectChange(id)) return
    this.renderTrackChangeResolution()
  }

  /** 接受所有修订。 */

  public acceptAllTrackChange() {
    if (!this.draw.getTrackChange().getRecordList().length) return
    this.draw.getTrackChange().acceptAll()
    this.renderTrackChangeResolution()
  }

  /** 拒绝所有修订。 */

  public rejectAllTrackChange() {
    if (!this.draw.getTrackChange().getRecordList().length) return
    this.draw.getTrackChange().rejectAll()
    this.renderTrackChangeResolution()
  }

  /** 修订状态变化后重绘并提交历史。 */

  private renderTrackChangeResolution() {
    const { startIndex } = this.range.getEditBoundaryRange()
    const elementList = this.draw.getObjectResolver().getElementList()
    const curIndex = Math.min(startIndex, Math.max(0, elementList.length - 1))
    this.range.setRange(curIndex, curIndex)
    this.draw.render({
      curIndex,
      isSubmitHistory: true,
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }

  /** 获取当前文档中的控件元素列表。 */
  public getControlList(): IElement[] {
    return this.draw.getControl().getList()
  }

  /** 定位到指定控件的内部或外部位置。 */
  public locationControl(controlId: string, options?: ILocationControlOption) {
    const location = (
      elementList: IElement[],
      zone: EditorZone
    ): ILocationPosition | null =>
      findCommandElementList<ILocationPosition>({
        elementList,
        visitor: ({
          element,
          elementList,
          index,
          cursorIndex,
          tableContext
        }) => {
          if (element?.controlId !== controlId) return null
          let curIndex = index
          if (options?.position === LocationPosition.OUTER_AFTER) {
            // 控件外面最后
            if (
              !(
                element.controlComponent === ControlComponent.POSTFIX &&
                elementList[cursorIndex + 1]?.controlComponent !==
                  ControlComponent.POST_TEXT
              )
            ) {
              return null
            }
          } else if (options?.position === LocationPosition.OUTER_BEFORE) {
            // 控件外面最前
            curIndex -= 1
          } else if (options?.position === LocationPosition.AFTER) {
            // 控件内部最后
            curIndex -= 1
            if (
              element.controlComponent !== ControlComponent.PLACEHOLDER &&
              element.controlComponent !== ControlComponent.POSTFIX &&
              element.controlComponent !== ControlComponent.POST_TEXT
            ) {
              return null
            }
          } else {
            // 控件内部最前（默认）
            if (
              (element.controlComponent !== ControlComponent.PREFIX &&
                element.controlComponent !== ControlComponent.PRE_TEXT) ||
              elementList[cursorIndex]?.controlComponent ===
                ControlComponent.PREFIX ||
              elementList[cursorIndex]?.controlComponent ===
                ControlComponent.PRE_TEXT
            ) {
              return null
            }
          }
          return {
            zone,
            range: {
              startIndex: curIndex,
              endIndex: curIndex
            },
            positionContext: tableContext || {
              isTable: false
            }
          }
        }
      })
    for (const context of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      const locationContext = location(context.elementList, context.zone)
      if (locationContext) {
        // 设置区域、上下文、光标信息
        this.setZone(locationContext.zone)
        this.coordinate.setPositionContext(locationContext.positionContext)
        this.range.replaceRange(locationContext.range)
        this.draw.render({
          curIndex: locationContext.range.startIndex,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
        break
      }
    }
  }

  /** 在当前选区插入控件元素。 */
  public insertControl(payload: IElement) {
    if (this.isCommandDisabled()) return
    const cloneElement = deepClone(payload)
    if (this.control.getIsRangeWithinControl()) {
      const activeControl = this.control.getActiveControl()
      if (!activeControl) {
        this.control.initControl()
      }
      const nextActiveControl = this.control.getActiveControl()
      if (nextActiveControl) {
        const { startIndex, endIndex } = this.range.getEditBoundaryRange()
        const curIndex = nextActiveControl.setValue([cloneElement], undefined, {
          isIgnoreDisabledRule: true
        })
        if (~curIndex) {
          this.range.setRange(curIndex, curIndex)
          this.control.emitControlContentChange()
          this.draw.render({
            curIndex,
            isSubmitHistory: true
          })
        } else {
          this.range.setRange(startIndex, endIndex)
        }
        return
      }
    }
    // 格式化上下文信息
    const { startIndex } = this.getRange()
    const elementList = this.draw.getObjectResolver().getElementList()
    const copyElement = getAnchorElement(elementList, startIndex)
    if (!copyElement) return
    const defaultStyle = this.range.getDefaultStyle()
    if (cloneElement.control && defaultStyle) {
      CONTROL_STYLE_ATTR.forEach(attr => {
        const value = defaultStyle[attr]
        if (value !== undefined) {
          cloneElement.control![attr] = value as never
        }
      })
    }
    const cloneAttr = [
      ...TABLE_CONTEXT_ATTR,
      ...EDITOR_ROW_ATTR,
      ...LIST_CONTEXT_ATTR,
      ...AREA_CONTEXT_ATTR
    ]
    cloneProperty<IElement>(cloneAttr, copyElement, cloneElement)
    // 插入控件
    this.draw.insertElementList([cloneElement])
  }

  /** 获取编辑器页面容器 DOM。 */
  public getContainer(): HTMLDivElement {
    return this.draw.getPageCanvasHost().getContainer()
  }

  /** 获取指定标题概念下的正文内容。 */
  public getTitleValue(
    payload: IGetTitleValueOption
  ): IGetTitleValueResult | null {
    const { conceptId } = payload
    const result: IGetTitleValueResult = []
    const getValue = (elementList: IElement[], zone: EditorZone) => {
      walkCommandElementList({
        elementList,
        visitor: ({ element, elementList, cursorIndex }): number | void => {
          if (element?.title?.conceptId !== conceptId) return
          // 先查找到标题，后循环至同级或上级标题处停止
          const valueList: IElement[] = []
          let j = cursorIndex
          while (j < elementList.length) {
            const nextElement = elementList[j]
            j++
            if (element.titleId === nextElement.titleId) continue
            if (
              nextElement.level &&
              titleOrderNumberMapping[nextElement.level] <=
                titleOrderNumberMapping[element.level!]
            ) {
              break
            }
            valueList.push(nextElement)
          }
          result.push({
            ...element.title!,
            value: getTextFromElementList(valueList),
            elementList: zipElementList(valueList),
            zone
          })
          return j
        }
      })
    }
    for (const { zone, elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      getValue(elementList, zone)
    }
    return result
  }

  /** 根据鼠标事件解析命中的元素和表格上下文。 */
  public getPositionContextByEvent(
    evt: MouseEvent,
    options: IPositionContextByEventOption = {}
  ): IPositionContextByEventResult | null {
    const pagePoint = this.draw.getCoordinate().getPointerCoordinates(evt).page
    const pageIndex = pagePoint?.pageIndex
    if (!pagePoint || pageIndex === undefined || pageIndex === null) return null
    const { isMustDirectHit = true } = options
    const pageNo = Number(pageIndex)
    const positionContext = this.draw.getTableHitTestService().resolve({
      x: pagePoint.x,
      y: pagePoint.y,
      pageNo,
      pagePoint,
      startPosition: null
    }).positionResult
    if (!positionContext) return null
    const {
      isDirectHit,
      isTable,
      index,
      tdValueIndex,
      zone
    } = positionContext
    // 非直接命中或选区不一致时返回空值
    if (
      (isMustDirectHit && !isDirectHit) ||
      (zone && zone !== this.zone.getZone())
    ) {
      return null
    }
    // 命中元素信息
    let tableInfo: ITableInfoByEvent | null = null
    let element: IElement | null = null
    let position: IElementPosition | null = null
    const positionList = this.coordinate.getOriginalPositionList()
    const resolvedElement = this.draw
      .getTargetResolver()
      .resolveElementByPositionContext(positionContext)
    if (isTable) {
      const tableCell = resolvedElement.tableCell
      const tableElement = tableCell?.table
      const td = tableCell?.td
      element = resolvedElement.element
      position = td?.positionList?.[tdValueIndex!] || null
      if (tableElement) {
        tableInfo = {
          element: tableElement,
          trIndex: tableCell.trIndex,
          tdIndex: tableCell.tdIndex
        }
      }
    } else {
      element = resolvedElement.element
      position = positionList[index] || null
    }
    if (element?.controlId) {
      const controlValue = this.draw
        .getControl()
        .getList()
        .find(controlElement => controlElement.controlId === element!.controlId)
      if (controlValue?.control) {
        element = {
          ...element,
          control: controlValue.control
        }
      }
    }
    // 元素包围信息
    let rangeRect: RangeRect | null = null
    if (position) {
      const {
        pageNo,
        coordinate: { leftTop, rightTop },
        lineHeight
      } = position
      const height = this.draw.getOriginalHeight()
      const pageGap = this.draw.getOriginalPageGap()
      rangeRect = {
        x: leftTop[0],
        y: leftTop[1] + pageNo * (height + pageGap),
        width: rightTop[0] - leftTop[0],
        height: lineHeight
      }
    }
    return {
      pageNo,
      element,
      rangeRect,
      tableInfo
    }
  }

  /** 在当前选区插入标题元素。 */
  public insertTitle(payload: IElement) {
    if (this.isCommandDisabled()) return
    const cloneElement = deepClone(payload)
    // 格式化上下文信息
    const { startIndex } = this.getRange()
    const elementList = this.draw.getObjectResolver().getElementList()
    const copyElement = getAnchorElement(elementList, startIndex)
    if (!copyElement) return
    const cloneAttr = [
      ...TABLE_CONTEXT_ATTR,
      ...EDITOR_ROW_ATTR,
      ...LIST_CONTEXT_ATTR,
      ...AREA_CONTEXT_ATTR
    ]
    cloneElement.valueList?.forEach(valueItem => {
      cloneProperty<IElement>(cloneAttr, copyElement, valueItem)
    })
    // 插入标题
    this.draw.insertElementList([cloneElement])
  }

  /** 按选区、行号或首尾位置聚焦编辑器。 */
  public focus(payload?: IFocusOption) {
    const {
      position = LocationPosition.AFTER,
      isMoveCursorToVisible = true,
      rowNo,
      range
    } = payload || {}
    let curIndex = -1
    if (range) {
      // 根据选区定位
      this.range.replaceRange(range)
      curIndex =
        position === LocationPosition.BEFORE ? range.startIndex : range.endIndex
    } else if (isNumber(rowNo)) {
      // 根据行号定位
      const rowList = this.draw.getObjectResolver().getOriginalRowList()
      curIndex =
        position === LocationPosition.BEFORE
          ? rowList[rowNo]?.startIndex
          : rowList[rowNo + 1]?.startIndex - 1
      if (!isNumber(curIndex)) return
      this.range.setRange(curIndex, curIndex)
    } else {
      // 默认文档首尾
      curIndex =
        position === LocationPosition.BEFORE
          ? 0
          : this.draw.getObjectResolver().getOriginalMainLastIndex()
      this.range.setRange(curIndex, curIndex)
    }
    // 光标存在且闭合时定位
    const renderParams: IDrawOption = {
      isCompute: false,
      isSetCursor: false,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    }
    if (~curIndex && this.range.getIsCollapsed()) {
      renderParams.curIndex = curIndex
      renderParams.isSetCursor = true
    }
    this.draw.render(renderParams)
    // 移动滚动条到可见区域
    if (isMoveCursorToVisible) {
      const positionList = this.draw.getCoordinate().getPositionList()
      this.draw.getCursor().moveCursorToVisible({
        cursorPosition: positionList[curIndex],
        direction: MoveDirection.DOWN
      })
    }
  }

  /** 插入区域标记。 */
  public insertArea(payload: IInsertAreaOption) {
    return this.draw.getArea().insertArea(payload)
  }

  /** 设置指定区域内容。 */
  public setAreaValue(payload: ISetAreaValueOption) {
    return this.draw.getArea().setAreaValue(payload)
  }

  /** 设置指定区域属性。 */
  public setAreaProperties(payload: ISetAreaPropertiesOption) {
    this.draw.getArea().setAreaProperties(payload)
  }

  /** 删除指定区域。 */
  public deleteArea(payload?: IDeleteAreaOption) {
    return this.draw.getArea().deleteArea(payload)
  }

  /** 定位到指定区域。 */
  public locationArea(areaId: string, options?: ILocationAreaOption) {
    // 区域在最后时，如果后面没有元素是否追加换行符
    if (
      options?.isAppendLastLineBreak &&
      options?.position === LocationPosition.OUTER_AFTER
    ) {
      const lastElement = this.draw
        .getObjectResolver()
        .getOriginalMainLastElement()
      if (lastElement?.areaId === areaId) {
        this.draw.appendElementList(
          [
            {
              value: ZERO
            }
          ],
          {
            isSubmitHistory: false
          }
        )
      }
    }
    // 获取区域位置
    const context = this.draw.getArea().getContextByAreaId(areaId, options)
    if (!context) return
    const {
      range: { endIndex },
      elementPosition
    } = context
    this.coordinate.setPositionContext({
      isTable: false
    })
    this.range.setRange(endIndex, endIndex)
    this.draw.render({
      curIndex: endIndex,
      isSetCursor: true,
      isCompute: false,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    })
    // 移动到可见区域
    const cursor = this.draw.getCursor()
    this.coordinate.setCursorPosition(elementPosition)
    cursor.moveCursorToVisible({
      cursorPosition: elementPosition,
      direction: MoveDirection.UP
    })
  }
}
