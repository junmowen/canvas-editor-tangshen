import { CommandAdaptQuery } from './CommandAdaptQuery'
import { NBSP, ZERO } from '../../dataset/constant/Common'
import {
  AREA_CONTEXT_ATTR,
  LIST_CONTEXT_ATTR,
  TITLE_CONTEXT_ATTR,
  TABLE_CONTEXT_ATTR
} from '../../dataset/constant/Element'
import { EditorZone, PageMode, PaperDirection } from '../../dataset/enum/Editor'
import { ICatalog } from '../../interface/Catalog'
import { IRemoveControlOption } from '../../interface/Control'
import { IAppendElementListOption } from '../../interface/Draw'
import { IEditorHTML } from '../../interface/Editor'
import {
  IDeleteElementByIdOption,
  IElement,
  IGetElementByIdOption,
  IUpdateElementByIdOption
} from '../../interface/Element'
import { IMargin } from '../../interface/Margin'
import { IPositionContext } from '../../interface/Position'
import { IRange } from '../../interface/Range'
import { cloneProperty, deepClone } from '../../utils'
import { pickElementAttr } from '../../utils/elementZip'
import { getElementListByHTML } from '../../utils/elementDom'
import { formatElementList } from '../../utils/elementFormat'
import { pickSurroundElementList } from '../../utils/elementLayout'
import { IAreaBadge, IBadge } from '../../interface/Badge'
import {
  findCommandElementList,
  walkCommandElementList
} from './CommandElementTraversal'
import { shouldKeepListContextForElement } from '../modules/list/command/ListElementQueryPolicy'
import { shouldKeepTitleContextForElement } from '../modules/title/command/TitleElementQueryPolicy'

/**
 * 页面与元素命令适配模块，负责页面设置、元素 CRUD、目录和文档工具类命令。
 */
export class CommandAdaptPageElement extends CommandAdaptQuery {
  /** 切换页面显示模式。 */
  public pageMode(payload: PageMode) {
    this.draw.setPageMode(payload)
  }

  /** 设置页面缩放比例。 */
  public pageScale(scale: number) {
    if (scale === this.options.scale) return
    this.draw.setPageScale(scale)
  }

  /** 恢复页面默认缩放比例。 */
  public pageScaleRecovery() {
    const { scale } = this.options
    if (scale !== 1) {
      this.draw.setPageScale(1)
    }
  }

  /** 降低页面缩放比例。 */
  public pageScaleMinus() {
    const { scale } = this.options
    const nextScale = scale * 10 - 1
    if (nextScale >= 5) {
      this.draw.setPageScale(nextScale / 10)
    }
  }

  /** 提高页面缩放比例。 */
  public pageScaleAdd() {
    const { scale } = this.options
    const nextScale = scale * 10 + 1
    if (nextScale <= 30) {
      this.draw.setPageScale(nextScale / 10)
    }
  }

  /** 设置纸张尺寸。 */
  public paperSize(width: number, height: number) {
    this.draw.setPaperSize(width, height)
  }

  /** 设置纸张方向。 */
  public paperDirection(payload: PaperDirection) {
    this.draw.setPaperDirection(payload)
  }

  /** 获取指定页最终纸张页边距，包含镜像页边距和装订线。 */
  public getPaperMargin(pageNo = 0): number[] {
    return this.draw.getOriginalMargins(pageNo)
  }

  /** 设置当前纸张页边距。 */
  public setPaperMargin(payload: IMargin) {
    return this.draw.setPaperMargin(payload)
  }

  /** 设置正文区域徽标配置。 */
  public setMainBadge(payload: IBadge | null) {
    this.draw.getBadge().setMainBadge(payload)
    this.draw.render({
      isCompute: false,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    })
  }

  /** 设置指定区域徽标配置。 */
  public setAreaBadge(payload: IAreaBadge[]) {
    this.draw.getBadge().setAreaBadgeMap(payload)
    this.draw.render({
      isCompute: false,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    })
  }

  /** 向文档末尾追加元素列表。 */
  public appendElementList(
    elementList: IElement[],
    options?: IAppendElementListOption
  ) {
    if (!elementList.length) return
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.draw.appendElementList(deepClone(elementList), options)
  }

  /** 按元素 ID 更新文档元素。 */
  public updateElementById(payload: IUpdateElementByIdOption) {
    const { id, conceptId } = payload
    if (!id && !conceptId) return
    const updateElementInfoList: {
      /** 文档元素列表，按文档顺序保存参与处理的元素。 */
      elementList: IElement[]
      /** 元素索引，用于定位文档列表中的目标元素。 */
      index: number
    }[] = []
    function getElementInfoById(elementList: IElement[]) {
      walkCommandElementList({
        elementList,
        isIncludeValueList: true,
        visitor: ({ element, elementList, index }): number | void => {
          if (
            (id && element.id === id) ||
            (conceptId && element.conceptId === conceptId)
          ) {
            updateElementInfoList.push({
              elementList,
              index
            })
          }
        }
      })
    }
    // 优先正文再页眉页脚
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList([
        EditorZone.MAIN,
        EditorZone.HEADER,
        EditorZone.FOOTER
      ])) {
      getElementInfoById(elementList)
    }
    // 更新内容
    if (!updateElementInfoList.length) return
    const updateRangeInfoList: {
      /** 文档元素列表，按文档顺序保存参与处理的元素。 */
      elementList: IElement[]
      /** 起始元素索引，用于确定处理范围的左边界。 */
      startIndex: number
      /** 结束元素索引，用于确定处理范围的右边界。 */
      endIndex: number
    }[] = []
    for (let i = 0; i < updateElementInfoList.length; i++) {
      const { elementList, index } = updateElementInfoList[i]
      const prevRange = updateRangeInfoList[updateRangeInfoList.length - 1]
      if (prevRange?.elementList === elementList && prevRange.endIndex + 1 === index) {
        prevRange.endIndex = index
      } else {
        updateRangeInfoList.push({
          elementList,
          startIndex: index,
          endIndex: index
        })
      }
    }
    for (let i = updateRangeInfoList.length - 1; i >= 0; i--) {
      const { elementList, startIndex, endIndex } = updateRangeInfoList[i]
      // 重新格式化元素
      const oldElement = elementList[startIndex]
      if (!oldElement) continue
      // 初始化 new Element 列表。
      const newElement = [
        pickElementAttr(
          {
            ...oldElement,
            ...payload.properties
          },
          {
            extraPickAttrs: [
              'id',
              ...LIST_CONTEXT_ATTR,
              ...TITLE_CONTEXT_ATTR,
              ...TABLE_CONTEXT_ATTR,
              ...AREA_CONTEXT_ATTR
            ]
          }
        )
      ]
      // 区域上下文提取
      cloneProperty<IElement>(AREA_CONTEXT_ATTR, oldElement, newElement[0])
      formatElementList(newElement, {
        isHandleFirstElement: false,
        editorOptions: this.options
      })
      elementList.splice(startIndex, endIndex - startIndex + 1, ...newElement)
    }
    this.draw.render({
      isSetCursor: false
    })
  }

  /** 按元素 ID 删除文档元素。 */
  public deleteElementById(payload: IDeleteElementByIdOption) {
    const { id, conceptId } = payload
    if (!id && !conceptId) return
    let isExistDelete = false
    function deleteElement(elementList: IElement[]) {
      walkCommandElementList({
        elementList,
        visitor: ({ element, elementList, index }): number | void => {
          if (
            (id && element.id === id) ||
            (conceptId && element.conceptId === conceptId)
          ) {
            isExistDelete = true
            elementList.splice(index, 1)
            return index
          }
        }
      })
    }
    // 优先正文再页眉页脚
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList([
        EditorZone.MAIN,
        EditorZone.HEADER,
        EditorZone.FOOTER
      ])) {
      deleteElement(elementList)
    }
    if (!isExistDelete) return
    this.draw.render({
      isSetCursor: false
    })
  }

  /** 按元素 ID 查找文档元素。 */
  public getElementById(payload: IGetElementByIdOption): IElement[] {
    const { id, conceptId } = payload
    // 初始化 result 列表。
    const result: IElement[] = []
    if (!id && !conceptId) return result
    const getElement = (elementList: IElement[]) => {
      walkCommandElementList({
        elementList,
        isIncludeValueList: true,
        visitor: ({ element }) => {
          if (
            (id && element.id !== id) ||
            (conceptId && element.conceptId !== conceptId)
          ) {
            return
          }
          const matchedElement = deepClone(element)
          if (id && !shouldKeepListContextForElement(matchedElement)) {
            LIST_CONTEXT_ATTR.forEach(attr => {
              delete matchedElement[attr]
            })
          }
          if (id && !shouldKeepTitleContextForElement(matchedElement)) {
            TITLE_CONTEXT_ATTR.forEach(attr => {
              delete matchedElement[attr]
            })
          }
          result.push(matchedElement)
        }
      })
    }
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      getElement(elementList)
    }
    return result.map(element =>
      pickElementAttr(element, {
        extraPickAttrs: ['id']
      })
    )
  }

  /** 删除指定控件及其关联内容。 */
  public removeControl(payload?: IRemoveControlOption) {
    if (payload?.id || payload?.conceptId) {
      const { id, conceptId } = payload
      let isExistRemove = false
      const remove = (elementList: IElement[]) => {
        walkCommandElementList({
          elementList,
          visitor: ({ element, elementList, index }): number | void => {
            if (
              !element.control ||
              (id && element.controlId !== id) ||
              (conceptId && element.control.conceptId !== conceptId)
            ) {
              return
            }
            isExistRemove = true
            elementList.splice(index, 1)
            return index
          }
        })
      }
      for (const { elementList } of this.draw
        .getObjectResolver()
        .getOriginalZoneElementList()) {
        remove(elementList)
      }
      if (isExistRemove) {
        this.draw.render({
          isSetCursor: false
        })
      }
    } else {
      const { startIndex, endIndex } = this.range.getEditBoundaryRange()
      if (startIndex !== endIndex) return
      const element = this.draw.getTargetResolver().resolveRangeElement()
      if (!element?.controlId) return
      // 删除控件
      const control = this.draw.getControl()
      const newIndex = control.removeControl(startIndex)
      if (newIndex === null) return
      // 重新渲染
      this.range.setRange(newIndex, newIndex)
      this.draw.render({
        curIndex: newIndex
      })
    }
  }

  /** 执行编辑器国际化文案翻译。 */
  public translate(path: string): string {
    return this.i18n.t(path)
  }

  /** 切换编辑器语言环境。 */
  public setLocale(payload: string) {
    this.i18n.setLocale(payload)
  }

  /** 获取当前语言环境。 */
  public getLocale(): string {
    return this.i18n.getLocale()
  }

  /** 获取当前文档目录。 */
  public getCatalog(): Promise<ICatalog | null> {
    return this.workerManager.getCatalog()
  }

  /** 定位到指定目录项对应的位置。 */
  public locationCatalog(titleId: string) {
    const elementList = this.draw.getObjectResolver().getOriginalElementList()

    const context = findCommandElementList<IRange & IPositionContext>({
      elementList,
      visitor: ({ element, elementList, index, tableContext }) => {
        // 找到标题末尾
        if (element.titleId === titleId) {
          let newIndex = index
          while (newIndex < elementList.length) {
            if (elementList[newIndex + 1]?.titleId !== titleId) {
              return {
                ...(tableContext || { isTable: false }),
                startIndex: newIndex,
                endIndex: newIndex
              }
            }
            newIndex++
          }
        }
        return null
      }
    })
    if (!context) return
    const {
      isTable,
      index,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex,
      trIndex,
      tdIndex,
      tdId,
      trId,
      tableId,
      endIndex
    } = context
    this.coordinate.setPositionContext({
      isTable,
      index,
      trIndex,
      tdIndex,
      tdId,
      trId,
      tableId
    })
    this.range.setRange(
      endIndex,
      endIndex,
      tableId,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    )
    this.draw.render({
      curIndex: endIndex,
      isCompute: false,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    })
  }

  /** 按标题 id 定位章节，语义上复用目录定位的稳定落点逻辑。 */
  public locationTitle(titleId: string) {
    this.locationCatalog(titleId)
  }

  /** 执行文档工具类统计和分析。 */
  public wordTool() {
    const elementList = this.draw.getObjectResolver().getMainElementList()
    let isApply = false
    for (let i = 0; i < elementList.length; i++) {
      const element = elementList[i]
      // 删除空行、行首空格
      if (element.value === ZERO) {
        while (i + 1 < elementList.length) {
          const nextElement = elementList[i + 1]
          if (nextElement.value !== ZERO && nextElement.value !== NBSP) break
          elementList.splice(i + 1, 1)
          isApply = true
        }
      }
    }
    if (!isApply) {
      // 避免输入框光标丢失
      const isCollapsed = this.range.getIsCollapsed()
      this.draw.getCursor().drawCursor({
        isShow: isCollapsed
      })
    } else {
      this.draw.render({
        isSetCursor: false
      })
    }
  }

  /**
   * 计算任意 elementList 在当前编辑器上下文中的总高度。
   *
   * 表格高度依赖格式化后的 table / td 元信息，必须先补齐上下文再做 row layout。
   */

  public computeElementListHeight(elementList: IElement[]): number {
    if (!elementList.length) return 0
    const innerWidth = this.draw.getInnerWidth()
    if (innerWidth <= 0) return 0
    const targetElementList = deepClone(elementList)
    formatElementList(targetElementList, {
      isHandleFirstElement: false,
      editorOptions: this.options
    })
    const surroundElementList = pickSurroundElementList(targetElementList)
    const rowList = this.draw.computeRowList({
      innerWidth,
      elementList: targetElementList,
      surroundElementList
    })
    return rowList.reduce((pre, cur) => pre + cur.height + (cur.offsetY || 0), 0)
  }

  /** 用 HTML 内容替换文档指定区域。 */
  public setHTML(payload: Partial<IEditorHTML>) {
    const { header, main, footer } = payload
    const innerWidth = this.draw.getOriginalInnerWidth()
    // 不设置值时数据为undefined，避免覆盖当前数据
    const getElementList = (htmlText?: string) =>
      htmlText !== undefined
        ? getElementListByHTML(htmlText, {
            innerWidth
          })
        : undefined
    this.setValue({
      header: getElementList(header),
      main: getElementList(main),
      footer: getElementList(footer)
    })
  }
}
