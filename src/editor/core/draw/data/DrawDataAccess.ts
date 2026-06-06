import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { ITd } from '../../../interface/table/Td'
import type { Draw } from '../Draw'

/**
 * Draw 数据访问服务。
 *
 * 该服务专门负责“当前编辑上下文”的数据读取路由，
 * 把 header / main / footer、普通正文 / 表格单元格、
 * 原始元素列表 / 当前可编辑元素列表、原始行列表 / 当前有效行列表
 * 统一折叠成稳定的访问入口。
 */
export class DrawDataAccess {
  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {}

  /**
   * 获取页眉区域的元素列表。
   *
   * @returns 页眉区域的元素数组
   */
  public getHeaderElementList(pageNo?: number): IElement[] {
    return this.draw.getComponents().header.getElementList(pageNo)
  }

  /**
   * 获取页脚区域的元素列表。
   *
   * @returns 页脚区域的元素数组
   */
  public getFooterElementList(pageNo?: number): IElement[] {
    return this.draw.getComponents().footer.getElementList(pageNo)
  }

  /**
   * 获取表格单元格内的元素列表。
   *
   * @param sourceElementList - 源元素列表
   * @returns 表格单元格中的元素数组
   */
  public getTableElementList(sourceElementList: IElement[]): IElement[] {
    return this.getTableTd(sourceElementList)?.value || []
  }

  /**
   * 获取原始元素列表。
   *
   * 根据当前激活的区域（页眉、页脚或正文），返回对应的原始元素列表。
   *
   * @returns 原始元素数组
   */
  public getOriginalElementList(): IElement[] {
    const zoneManager = this.draw.getZone()
    // 如果页眉区域激活，返回页眉元素列表
    if (zoneManager.isHeaderActive()) {
      return this.getHeaderElementList(zoneManager.getZonePageNo())
    }
    // 如果页脚区域激活，返回页脚元素列表
    if (zoneManager.isFooterActive()) {
      return this.getFooterElementList(zoneManager.getZonePageNo())
    }
    // 否则返回正文区域的原始元素列表
    return this.draw.getObjectResolver().getOriginalMainElementList()
  }

  /**
   * 获取当前可编辑的元素列表。
   *
   * 根据当前位置上下文（表格或普通正文），返回对应的元素列表。
   *
   * @returns 元素数组
   */
  public getElementList(): IElement[] {
    const positionContext = this.draw.getCoordinate().getPositionContext()
    const elementList = this.getOriginalElementList()
    // 如果当前位置在表格中，返回表格单元格元素列表；否则返回普通元素列表
    return positionContext.isTable
      ? this.getTableElementList(elementList)
      : elementList
  }

  /**
   * 获取正文区域的元素列表。
   *
   * 根据当前位置上下文（表格或普通正文），返回正文区域的元素列表。
   *
   * @returns 正文元素数组
   */
  public getMainElementList(): IElement[] {
    const positionContext = this.draw.getCoordinate().getPositionContext()
    const mainElementList = this.draw.getObjectResolver().getOriginalMainElementList()
    // 如果当前位置在表格中，返回表格单元格元素列表；否则返回正文元素列表
    return positionContext.isTable
      ? this.getTableElementList(mainElementList)
      : mainElementList
  }

  /**
   * 获取当前表格单元格对象。
   *
   * 如果当前位置不在表格中，则返回 null。
   *
   * @returns 表格单元格对象，不在表格中时返回 null
   */
  public getTd(): ITd | null {
    return this.getTableTd(this.getOriginalElementList())
  }

  /**
   * 获取表格单元格内的行列表。
   *
   * @param sourceElementList - 源元素列表
   * @returns 表格单元格中的行数组
   */
  public getTableRowList(sourceElementList: IElement[]): IRow[] {
    return this.getTableTd(sourceElementList)?.rowList || []
  }

  private getTableTd(sourceElementList: IElement[]): ITd | null {
    const positionContext = this.draw
      .getCoordinate()
      .getPositionContext()
    const { index, trIndex, tdIndex, isTable } = positionContext
    if (!isTable) return null

    if (index === undefined || trIndex === undefined || tdIndex === undefined) {
      return null
    }
    return (
      this.draw.getTargetResolver().resolveTableTdByIndex({
        elementList: sourceElementList,
        tableIndex: index,
        trIndex,
        tdIndex
      })?.td || null
    )
  }

  /**
   * 获取原始行列表。
   *
   * 根据当前激活的区域（页眉、页脚或正文），返回对应的原始行列表。
   *
   * @returns 原始行数组
   */
  public getOriginalRowList(): IRow[] {
    const zoneManager = this.draw.getZone()
    // 如果页眉区域激活，返回页眉行列表
    if (zoneManager.isHeaderActive()) {
      return this.draw.getComponents().header.getRowList(
        zoneManager.getZonePageNo()
      )
    }
    // 如果页脚区域激活，返回页脚行列表
    if (zoneManager.isFooterActive()) {
      return this.draw.getComponents().footer.getRowList(
        zoneManager.getZonePageNo()
      )
    }
    // 否则返回运行时行列表
    return this.draw.getRuntime().getRuntimeRowList()
  }

  /**
   * 获取当前可编辑的行列表。
   *
   * 根据当前位置上下文（表格或普通正文），返回对应的行列表。
   *
   * @returns 行数组
   */
  public getRowList(): IRow[] {
    const positionContext = this.draw.getCoordinate().getPositionContext()
    // 如果当前位置在表格中，返回表格单元格行列表；否则返回原始行列表
    return positionContext.isTable
      ? this.getTableRowList(this.getOriginalElementList())
      : this.getOriginalRowList()
  }
}
