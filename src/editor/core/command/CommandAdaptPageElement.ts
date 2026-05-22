import { CommandAdaptQuery } from './CommandAdaptQuery'
import { NBSP, ZERO } from '../../dataset/constant/Common'
import {
  AREA_CONTEXT_ATTR,
  LIST_CONTEXT_ATTR,
  TITLE_CONTEXT_ATTR,
  TABLE_CONTEXT_ATTR
} from '../../dataset/constant/Element'
import { PageMode, PaperDirection } from '../../dataset/enum/Editor'
import { ElementType } from '../../dataset/enum/Element'
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
import {
  formatElementList,
  pickSurroundElementList,
  pickElementAttr,
  getElementListByHTML
} from '../../utils/element'
import { IAreaBadge, IBadge } from '../../interface/Badge'

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

  /** 获取当前纸张页边距。 */
  public getPaperMargin(): number[] {
    return this.options.margins
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
      elementList: IElement[]
      index: number
    }[] = []
    function getElementInfoById(elementList: IElement[]) {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              getElementInfoById(td.value)
            }
          }
        }
        if (element.valueList?.length) {
          getElementInfoById(element.valueList)
        }
        if (
          (id && element.id === id) ||
          (conceptId && element.conceptId === conceptId)
        ) {
          updateElementInfoList.push({
            elementList,
            index: i - 1
          })
        }
      }
    }
    // 优先正文再页眉页脚
    const data = [
      this.draw.getOriginalMainElementList(),
      this.draw.getHeaderElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
      getElementInfoById(elementList)
    }
    // 更新内容
    if (!updateElementInfoList.length) return
    const updateRangeInfoList: {
      elementList: IElement[]
      startIndex: number
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
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              deleteElement(td.value)
            }
          }
        }
        if (
          (id && element.id === id) ||
          (conceptId && element.conceptId === conceptId)
        ) {
          isExistDelete = true
          elementList.splice(i, 1)
          i--
        }
        i++
      }
    }
    // 优先正文再页眉页脚
    const data = [
      this.draw.getOriginalMainElementList(),
      this.draw.getHeaderElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
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
    const result: IElement[] = []
    if (!id && !conceptId) return result
    const getElement = (elementList: IElement[]) => {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              getElement(td.value)
            }
          }
        }
        if (element.valueList?.length) {
          getElement(element.valueList)
        }
        if (
          (id && element.id !== id) ||
          (conceptId && element.conceptId !== conceptId)
        ) {
          continue
        }
        const matchedElement = deepClone(element)
        if (id && matchedElement.type !== ElementType.LIST) {
          LIST_CONTEXT_ATTR.forEach(attr => {
            delete matchedElement[attr]
          })
        }
        if (id && matchedElement.type !== ElementType.TITLE) {
          TITLE_CONTEXT_ATTR.forEach(attr => {
            delete matchedElement[attr]
          })
        }
        result.push(matchedElement)
      }
    }
    const data = [
      this.draw.getHeaderElementList(),
      this.draw.getOriginalMainElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
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
        let i = elementList.length - 1
        while (i >= 0) {
          const element = elementList[i]
          if (element.type === ElementType.TABLE) {
            const trList = element.trList!
            for (let r = 0; r < trList.length; r++) {
              const tr = trList[r]
              for (let d = 0; d < tr.tdList.length; d++) {
                const td = tr.tdList[d]
                remove(td.value)
              }
            }
          }
          i--
          if (
            !element.control ||
            (id && element.controlId !== id) ||
            (conceptId && element.control.conceptId !== conceptId)
          ) {
            continue
          }
          isExistRemove = true
          elementList.splice(i + 1, 1)
        }
      }
      const data = [
        this.draw.getHeaderElementList(),
        this.draw.getOriginalMainElementList(),
        this.draw.getFooterElementList()
      ]
      for (const elementList of data) {
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
      const elementList = this.draw.getElementList()
      const element = elementList[startIndex]
      if (!element.controlId) return
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
    const elementList = this.draw.getOriginalElementList()

    function getPosition(
      elementList: IElement[],
      titleId: string
    ): (IRange & IPositionContext) | null {
      for (let e = 0; e < elementList.length; e++) {
        const element = elementList[e]
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              const range = getPosition(td.value, titleId)
              if (range) {
                return {
                  ...range,
                  isTable: true,
                  index: e,
                  trIndex: r,
                  tdIndex: d,
                  tdId: td.id,
                  trId: tr.id,
                  tableId: element.id
                }
              }
            }
          }
        }
        // 找到标题末尾
        if (element.titleId === titleId) {
          let newIndex = e
          while (newIndex < elementList.length) {
            if (elementList[newIndex + 1]?.titleId !== titleId) {
              return {
                isTable: false,
                startIndex: newIndex,
                endIndex: newIndex
              }
            }
            newIndex++
          }
        }
      }
      return null
    }

    const context = getPosition(elementList, titleId)
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
    this.position.setPositionContext({
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

  /** 执行文档工具类统计和分析。 */
  public wordTool() {
    const elementList = this.draw.getMainElementList()
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
