import { Draw } from '../../../draw/Draw'
import { deepClone, getUUID, isNonValue } from '../../../../utils'
import { ElementType } from '../../../../dataset/enum/Element'
import {
  IArea,
  IAreaInfo,
  IDeleteAreaOption,
  IGetAreaValueOption,
  IGetAreaValueResult,
  IInsertAreaOption,
  ILocationAreaOption,
  ISetAreaPropertiesOption,
  ISetAreaValueOption
} from '../../../../interface/Area'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { LocationPosition } from '../../../../dataset/enum/Common'
import { RangeManager } from '../../../range/RangeManager'
import { Zone } from '../../../runtime/zone/Zone'
import { zipElementList } from '../../../../utils/elementZip'
import { formatElementList } from '../../../../utils/elementFormat'
import { AreaMode } from '../../../../dataset/enum/Area'
import { IRange } from '../../../../interface/Range'
import { IElementPosition } from '../../../../interface/Element'
import { Placeholder } from '../../placeholder/runtime/Placeholder'
import { defaultPlaceholderOption } from '../../../../dataset/constant/Placeholder'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import type { DrawCoordinateService } from '../../../draw/coordinate/DrawCoordinateService'
import { walkElementTree } from '../../../shared/traversal/ElementTreeTraversal'

export class Area {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 区域状态管理器，用于判断并切换正文、页眉、页脚等编辑区域。 */
  private zone: Zone
  /** 选区管理器，用于读取和更新当前编辑范围。 */
  private range: RangeManager
  /** 坐标服务，用于读取元素位置、浮动元素和光标坐标。 */
  private coordinate: DrawCoordinateService
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>
  /** area Info Map 映射缓存，用于按 key 快速定位对应数据。 */
  private areaInfoMap = new Map<string, IAreaInfo>()

  /** 初始化 Area 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.zone = draw.getZone()
    this.range = draw.getRange()
    this.coordinate = draw.getCoordinate()
  }

  public getAreaInfo(): Map<string, IAreaInfo> {
    return this.areaInfoMap
  }

  public getActiveAreaId(): string | null {
    if (!this.areaInfoMap.size) return null
    const { startIndex } = this.range.getEditBoundaryRange()
    const elementList = this.draw.getObjectResolver().getElementList()
    const element = elementList[startIndex]
    return element?.areaId || null
  }

  public getActiveAreaInfo(): IAreaInfo | null {
    const activeAreaId = this.getActiveAreaId()
    if (!activeAreaId) return null
    return this.areaInfoMap.get(activeAreaId) || null
  }

  public isReadonly() {
    const activeAreaInfo = this.getActiveAreaInfo()
    if (!activeAreaInfo?.area) return false
    switch (activeAreaInfo.area.mode) {
      case AreaMode.EDIT:
        return false
      case AreaMode.READONLY:
        return true
      case AreaMode.FORM:
        return !this.draw.getControl().getIsRangeWithinControl()
      default:
        return false
    }
  }

  public insertArea(payload: IInsertAreaOption): string | null {
    const { id, value, area, position, range } = payload
    // 切换至正文
    if (this.zone.getZone() !== EditorZone.MAIN) {
      this.zone.setZone(EditorZone.MAIN)
    }
    // 跳出表格
    this.draw.getCoordinate().setPositionContext({
      isTable: false
    })
    // 通过光标插入area && 不能在area内再次插入area
    if (range && !this.getActiveAreaId()) {
      const { startIndex, endIndex } = range
      // 校验位置合法性
      if (
        !this.draw
          .getObjectResolver()
          .getIsOriginalMainRangeAvailable(startIndex, endIndex)
      ) {
        return null
      }
      this.range.setRange(range.startIndex, range.endIndex)
    } else {
      // 设置插入位置
      if (position === LocationPosition.BEFORE) {
        this.range.setRange(0, 0)
      } else {
        const lastIndex = this.draw
          .getObjectResolver()
          .getOriginalMainLastIndex()
        this.range.setRange(lastIndex, lastIndex)
      }
    }
    const areaId = id || getUUID()
    this.draw.insertElementList([
      {
        type: ElementType.AREA,
        value: '',
        areaId,
        valueList: value,
        area: deepClone(area)
      }
    ])
    return areaId
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    if (!this.areaInfoMap.size) return
    ctx.save()
    // 区域背景和边框需要使用当前页边距，避免镜像页边距下跨页区域横向错位。
    const margins = this.draw.getMargins(pageNo)
    const width = this.draw.getInnerWidth(pageNo)
    for (const areaInfoItem of this.areaInfoMap) {
      const { area, positionList } = areaInfoItem[1]
      if (
        area?.hide ||
        (!area?.backgroundColor && !area?.borderColor && !area?.placeholder)
      ) {
        continue
      }
      const pagePositionList = positionList.filter(p => p.pageNo === pageNo)
      if (!pagePositionList.length) continue
      ctx.translate(0.5, 0.5)
      const firstPosition = pagePositionList[0]
      const lastPosition = pagePositionList[pagePositionList.length - 1]
      // 起始位置
      const x = margins[3]
      const y = Math.ceil(firstPosition.coordinate.leftTop[1])
      const height = Math.ceil(lastPosition.coordinate.rightBottom[1] - y)
      // 背景色
      if (area.backgroundColor) {
        ctx.fillStyle = area.backgroundColor
        ctx.fillRect(x, y, width, height)
      }
      // 边框
      if (area.borderColor) {
        ctx.strokeStyle = area.borderColor
        ctx.strokeRect(x, y, width, height)
      }
      // 提示词
      if (area.placeholder && positionList.length <= 1) {
        // 创建 placeholder 实例。
        const placeholder = new Placeholder(this.draw)
        placeholder.render(ctx, {
          placeholder: {
            ...defaultPlaceholderOption,
            ...area.placeholder
          },
          startY: firstPosition.coordinate.leftTop[1]
        })
      }
      ctx.translate(-0.5, -0.5)
    }
    ctx.restore()
  }

  /** 计算当前项，产出布局或业务规则需要的中间结果。 */
  public compute() {
    this.areaInfoMap.clear()
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const positionList = this.coordinate.getMainPositionList()
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      const areaId = element.areaId
      if (areaId) {
        const position =
          positionList[e] ||
          ({
            pageNo: 0,
            index: e,
            value: element.value,
            element,
            rowIndex: 0,
            rowNo: 0,
            ascent: 0,
            lineHeight: 0,
            left: 0,
            metrics: {
              width: 0,
              height: 0,
              boundingBoxAscent: 0,
              boundingBoxDescent: 0
            },
            isFirstLetter: false,
            isLastLetter: false,
            coordinate: {
              leftTop: [0, 0],
              leftBottom: [0, 0],
              rightTop: [0, 0],
              rightBottom: [0, 0]
            }
          } as IElementPosition)
        const areaInfo = this.areaInfoMap.get(areaId)
        if (!areaInfo) {
          this.areaInfoMap.set(areaId, {
            id: areaId,
            area: element.area!,
            elementList: [element],
            positionList: [position]
          })
        } else {
          areaInfo.elementList.push(element)
          areaInfo.positionList.push(position)
        }
      }
    }
  }

  public getAreaValue(
    options: IGetAreaValueOption = {}
  ): IGetAreaValueResult | null {
    const areaId = options.id || this.getActiveAreaId()
    if (!areaId) return null
    let areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) {
      this.compute()
      areaInfo = this.areaInfoMap.get(areaId)
    }
    if (!areaInfo) return null
    return {
      area: areaInfo.area,
      id: areaInfo.id,
      startPageNo: areaInfo.positionList[0].pageNo,
      endPageNo: areaInfo.positionList[areaInfo.positionList.length - 1].pageNo,
      value: zipElementList(areaInfo.elementList)
    }
  }

  public getContextByAreaId(
    areaId: string,
    options?: ILocationAreaOption
  /** 元素位置，用于描述布局或命中的空间范围。 */
  /** 选区范围，记录起止索引和方向信息。 */
  ): { range: IRange; elementPosition: IElementPosition } | null {
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (options?.position === LocationPosition.OUTER_BEFORE) {
        // 区域外面最前
        if (elementList[e + 1]?.areaId !== areaId) continue
      } else if (options?.position === LocationPosition.AFTER) {
        // 区域内部最后
        if (
          !(element.areaId === areaId && elementList[e + 1]?.areaId !== areaId)
        ) {
          continue
        }
      } else if (options?.position === LocationPosition.OUTER_AFTER) {
        // 区域外部最后
        if (
          !(element.areaId !== areaId && elementList[e - 1]?.areaId === areaId)
        ) {
          continue
        }
      } else {
        // 区域内部最前
        if (element.areaId !== areaId) continue
      }
      const positionList = this.coordinate.getMainPositionList()
      return {
        range: {
          startIndex: e,
          endIndex: e
        },
        elementPosition: positionList[e]
      }
    }
    return null
  }

  public setAreaProperties(payload: ISetAreaPropertiesOption) {
    const areaId = payload.id || this.getActiveAreaId()
    if (!areaId) return
    let areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) {
      this.compute()
      areaInfo = this.areaInfoMap.get(areaId)
    }
    if (!areaInfo) return
    if (!areaInfo.area) {
      areaInfo.area = {}
    }
    const area = areaInfo.area
    // 需要计算的属性
    let isCompute = false
    // 初始化 compute Props 列表。
    const computeProps: Array<keyof IArea> = ['top', 'hide']
    // 循环设置
    Object.entries(payload.properties).forEach(([key, value]) => {
      if (isNonValue(value)) return
      const propKey = key as keyof IArea
      area[propKey] = value
      if (computeProps.includes(propKey)) {
        isCompute = true
      }
    })
    walkElementTree({
      elementList: this.draw.getObjectResolver().getOriginalMainElementList(),
      visitor: ({ element }) => {
        if (element.areaId === areaId) {
          element.area = area
        }
      }
    })
    this.draw.render({
      isCompute,
      isSetCursor: false,
      pageRenderScope: isCompute ? undefined : 'visible'
    })
  }

  public deleteArea(payload: IDeleteAreaOption = {}): boolean {
    const areaId = payload.id || this.getActiveAreaId()
    if (!areaId) return false
    let areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) {
      this.compute()
      areaInfo = this.areaInfoMap.get(areaId)
    }
    if (!areaInfo || areaInfo.area?.deletable === false) return false

    const { positionList } = areaInfo
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    this.draw.spliceElementList(
      elementList,
      positionList[0].index,
      positionList.length,
      [],
      {
        isIgnoreDeletedRule: true
      }
    )
    this.draw.render({
      isCompute: true,
      isSetCursor: false
    })
    return true
  }

  public setAreaValue(payload: ISetAreaValueOption) {
    const areaId = payload.id || this.getActiveAreaId()
    if (!areaId) return
    let areaInfo = this.areaInfoMap.get(areaId)
    if (!areaInfo) {
      this.compute()
      areaInfo = this.areaInfoMap.get(areaId)
    }
    if (!areaInfo) return
    // 用新的格式化数据替换当前区域内容。
    const { positionList } = areaInfo
    const elementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const valueList = payload.value
    formatElementList(
      [
        {
          type: ElementType.AREA,
          value: '',
          valueList,
          areaId: areaInfo.id,
          area: areaInfo.area
        }
      ],
      {
        editorOptions: this.options
      }
    )
    this.draw.spliceElementList(
      elementList,
      positionList[0].index,
      positionList.length,
      valueList,
      {
        isIgnoreDeletedRule: true
      }
    )
    this.draw.render({
      isSetCursor: false
    })
  }
}
