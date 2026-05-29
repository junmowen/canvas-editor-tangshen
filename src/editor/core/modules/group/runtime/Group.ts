import { EditorMode, EditorZone } from '../../../../dataset/enum/Editor'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement, IElementFillRect } from '../../../../interface/Element'
import { IPositionContext } from '../../../../interface/Position'
import { IRange } from '../../../../interface/Range'
import { getUUID } from '../../../../utils'
import { RangeManager } from '../../../range/RangeManager'
import { Draw } from '../../../draw/Draw'
import {
  findElementTree,
  walkElementTree
} from '../../../shared/traversal/ElementTreeTraversal'

export class Group {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>
  /** 选区管理器，用于读取和更新当前编辑范围。 */
  private range: RangeManager
  /** fill Rect Map 映射缓存，用于按 key 快速定位对应数据。 */
  private fillRectMap: Map<string, IElementFillRect>

  /** 初始化 Group 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.range = draw.getRange()
    this.fillRectMap = new Map()
  }

  public setGroup(): string | null {
    if (
      (this.draw.isReadonly() && this.draw.getMode() !== EditorMode.FORM) ||
      this.draw.getZone().getZone() !== EditorZone.MAIN
    ) {
      return null
    }
    const selection = this.getGroupSelection()
    if (!selection) return null
    const groupId = getUUID()
    selection.forEach(el => {
      if (!Array.isArray(el.groupIds)) {
        el.groupIds = []
      }
      el.groupIds.push(groupId)
    })
    this.draw.render({
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
    return groupId
  }

  private getGroupSelection(): IElement[] | null {
    const selection = this.range.getSelection()
    if (selection) return selection
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (startIndex === endIndex || !~startIndex || !~endIndex) return null
    const start = Math.min(startIndex, endIndex) + 1
    const end = Math.max(startIndex, endIndex)
    const positionContext = this.draw.getCoordinate().getPositionContext()
    if (positionContext.isTable) {
      const tableTd = this.draw.getTargetResolver().resolveActiveLogicalTableTd({
        positionContext
      })
      return (
        tableTd?.td.value
          .slice(start, end + 1)
          .filter(element => !element.control?.disabled) || null
      )
    }
    if (this.draw.getMode() !== EditorMode.FORM) return null
    return this.draw
      .getObjectResolver()
      .getOriginalMainElementList()
      .slice(start, end + 1)
      .filter(element => !element.control?.disabled)
  }

  public getElementListByGroupId(
    elementList: IElement[],
    groupId: string
  ): IElement[] {
    const groupElementList: IElement[] = []
    walkElementTree({
      elementList,
      visitor: ({ element, elementList, index }) => {
        if (element?.groupIds?.includes(groupId)) {
          groupElementList.push(element)
          const nextElement = elementList[index + 1]
          if (!nextElement?.groupIds?.includes(groupId)) return false
        }
        return undefined
      }
    })
    return groupElementList
  }

  public deleteGroup(groupId: string) {
    if (this.draw.isReadonly()) return
    // 仅主体内容可以成组
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const groupElementList = this.getElementListByGroupId(elementList, groupId)
    if (!groupElementList.length) return
    for (let e = 0; e < groupElementList.length; e++) {
      const element = groupElementList[e]
      const groupIds = element.groupIds!
      const groupIndex = groupIds.findIndex(id => id === groupId)
      groupIds.splice(groupIndex, 1)
      // 不包含成组时删除字段，减少存储及内存占用
      if (!groupIds.length) {
        delete element.groupIds
      }
    }
    this.draw.render({
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  public getContextByGroupId(
    groupId: string,
    elementList = this.draw.getObjectResolver().getOriginalMainElementList()
  ): (IRange & IPositionContext) | null {
    return findElementTree<IRange & IPositionContext>({
      elementList,
      visitor: ({ element, elementList, index, tableContext }) => {
        const nextElement = elementList[index + 1]
        if (
          element.groupIds?.includes(groupId) &&
          !nextElement?.groupIds?.includes(groupId)
        ) {
          return {
            ...(tableContext
              ? {
                  isTable: true,
                  index: tableContext.tableIndex,
                  trIndex: tableContext.trIndex,
                  tdIndex: tableContext.tdIndex,
                  tdId: tableContext.tdId,
                  trId: tableContext.trId,
                  tableId: tableContext.tableId
                }
              : {
                  isTable: false
                }),
            startIndex: index,
            endIndex: index
          }
        }
        return null
      }
    })
  }

  public clearFillInfo() {
    this.fillRectMap.clear()
  }

  /** 记录fillinfo，把当前命中结果写入缓存或统计。 */
  public recordFillInfo(
    element: IElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const groupIds = element.groupIds
    if (!groupIds) return
    for (const groupId of groupIds) {
      const fillRect = this.fillRectMap.get(groupId)
      if (!fillRect) {
        this.fillRectMap.set(groupId, {
          x,
          y,
          width,
          height
        })
      } else {
        fillRect.width += width
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.fillRectMap.size) return
    // 当前激活组信息
    const range = this.range.getEditBoundaryRange()
    const elementList = this.draw.getObjectResolver().getElementList()
    const anchorGroupIds = elementList[range.endIndex]?.groupIds
    const {
      group: { backgroundColor, opacity, activeOpacity, activeBackgroundColor }
    } = this.options
    ctx.save()
    this.fillRectMap.forEach((fillRect, groupId) => {
      const { x, y, width, height } = fillRect
      if (anchorGroupIds?.includes(groupId)) {
        ctx.globalAlpha = activeOpacity
        ctx.fillStyle = activeBackgroundColor
      } else {
        ctx.globalAlpha = opacity
        ctx.fillStyle = backgroundColor
      }
      ctx.fillRect(x, y, width, height)
    })
    ctx.restore()
    this.clearFillInfo()
  }
}
