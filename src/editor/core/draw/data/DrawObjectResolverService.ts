import { EditorZone } from '../../../dataset/enum/Editor'
import { IEditorData } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { ITd } from '../../../interface/table/Td'
import type { Draw } from '../Draw'

/**
 * Draw 当前对象统一解析入口。
 *
 * 统一承接 header / footer / main / table / row / td 的读取路由，
 * 避免这些解析逻辑继续散落在各个业务模块里。
 */
export class DrawObjectResolverService {
  constructor(private readonly draw: Draw) {}

  public getHeaderElementList(): IElement[] {
    return this.draw.getServices().dataAccess.getHeaderElementList()
  }

  public getHeaderElement(index: number): IElement | undefined {
    return this.getHeaderElementList()[index]
  }

  public getFooterElementList(): IElement[] {
    return this.draw.getServices().dataAccess.getFooterElementList()
  }

  public getFooterElement(index: number): IElement | undefined {
    return this.getFooterElementList()[index]
  }

  public getTableElementList(sourceElementList: IElement[]): IElement[] {
    return this.draw.getServices().dataAccess.getTableElementList(sourceElementList)
  }

  public getOriginalElementList(): IElement[] {
    return this.draw.getServices().dataAccess.getOriginalElementList()
  }

  public getOriginalElement(index: number): IElement | undefined {
    return this.getOriginalElementList()[index]
  }

  public getElementList(): IElement[] {
    return this.draw.getServices().dataAccess.getElementList()
  }

  public getElement(index: number): IElement | undefined {
    return this.getElementList()[index]
  }

  public getMainElementList(): IElement[] {
    return this.draw.getServices().dataAccess.getMainElementList()
  }

  public getMainElement(index: number): IElement | undefined {
    return this.getMainElementList()[index]
  }

  public getOriginalMainElementList(): IElement[] {
    return this.draw.getRuntime().getOriginalMainElementList()
  }

  public getOriginalMainElement(index: number): IElement | undefined {
    return this.getOriginalMainElementList()[index]
  }

  /** 判断正文原始列表中的单个索引是否有效。 */
  public getIsOriginalMainIndexAvailable(index: number): boolean {
    return !!this.getOriginalMainElement(index)
  }

  /** 判断正文原始列表中的范围两端是否都存在。 */
  public getIsOriginalMainRangeAvailable(
    startIndex: number,
    endIndex: number
  ): boolean {
    return (
      this.getIsOriginalMainIndexAvailable(startIndex) &&
      this.getIsOriginalMainIndexAvailable(endIndex)
    )
  }

  public getOriginalMainLastIndex(): number {
    return this.getOriginalMainElementList().length - 1
  }

  /** 获取正文原始列表最后一个元素，避免业务侧自行计算 length。 */
  public getOriginalMainLastElement(): IElement | undefined {
    return this.getOriginalMainElement(this.getOriginalMainLastIndex())
  }

  /** 判断正文是否仍处于可显示 placeholder 的空文档状态。 */
  public getIsOriginalMainPlaceholderAvailable(): boolean {
    const mainElementList = this.getOriginalMainElementList()
    return mainElementList.length <= 1 && !mainElementList[0]?.listId
  }

  public getOriginalZoneElementList(
    zoneOrder: EditorZone[] = [
      EditorZone.HEADER,
      EditorZone.MAIN,
      EditorZone.FOOTER
    ]
  ): Array<{
    zone: EditorZone
    elementList: IElement[]
  }> {
    return zoneOrder.map(zone => ({
      zone,
      elementList:
        zone === EditorZone.HEADER
          ? this.getHeaderElementList()
          : zone === EditorZone.FOOTER
            ? this.getFooterElementList()
            : this.getOriginalMainElementList()
    }))
  }

  /** 获取完整原始编辑器数据，统一 header/main/footer 聚合来源。 */
  public getOriginalEditorData(): Required<IEditorData> {
    return {
      header: this.getHeaderElementList(),
      main: this.getOriginalMainElementList(),
      footer: this.getFooterElementList()
    }
  }

  public getLayoutMainElementList(): IElement[] {
    return this.draw.getRuntime().getLayoutMainElementList()
  }

  public getLayoutMainElement(index: number): IElement | undefined {
    return this.getLayoutMainElementList()[index]
  }

  public getOriginalRowList(): IRow[] {
    return this.draw.getServices().dataAccess.getOriginalRowList()
  }

  public getOriginalRow(index: number): IRow | undefined {
    return this.getOriginalRowList()[index]
  }

  public getRowList(): IRow[] {
    return this.draw.getServices().dataAccess.getRowList()
  }

  public getRow(index: number): IRow | undefined {
    return this.getRowList()[index]
  }

  public getTableRowList(sourceElementList: IElement[]): IRow[] {
    return this.draw.getServices().dataAccess.getTableRowList(sourceElementList)
  }

  public getTd(): ITd | null {
    return this.draw.getServices().dataAccess.getTd()
  }
}
