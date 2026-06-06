import { IRow } from '../../../interface/Row'
import {
  ITypesettingLayoutSnapshot,
  ITypesettingPage,
  ITypesettingParagraphBlock,
  ITypesettingRect
} from '../../../interface/TypesettingLayout'
import { isTableElement } from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'
import {
  appendTypesettingParagraphSegment,
  ITypesettingParagraphBlockGroup
} from './TypesettingLayoutParagraphGroup'
import {
  createTypesettingRowSegmentList,
  getTypesettingSegmentContextElement
} from './TypesettingLayoutParagraphSegment'

/** 构建排版中间层快照所需的输入。 */
interface IBuildTypesettingLayoutSnapshotPayload {
  /** 快照版本，跟随布局流水线版本递增。 */
  version: number
  /** 最近一次完整布局产出的分页行列表。 */
  pageRowList: IRow[][]
}

/**
 * 排版布局结构构建器。
 *
 * 负责把当前布局产出的 `pageRowList` 直接整理为段落块、栏、页快照。
 * 该类不参与渲染决策，不引入长期适配器，只生成后续分页/分栏规则可以消费的布局产物。
 */
export class TypesettingLayoutStructureBuilder {
  /** 初始化构建器并持有 Draw 门面，用于读取页面尺寸、边距和排版配置。 */
  constructor(private readonly draw: Draw) {}

  /** 构建当前布局对应的段落块/栏/页快照。 */
  public build(
    payload: IBuildTypesettingLayoutSnapshotPayload
  ): ITypesettingLayoutSnapshot {
    const pageList: ITypesettingPage[] = []
    const paragraphBlockList: ITypesettingParagraphBlock[] = []
    let globalRowOffset = 0

    for (let pageNo = 0; pageNo < payload.pageRowList.length; pageNo++) {
      const pageRows = payload.pageRowList[pageNo] || []
      const pageRowOffsetMap = new Map<IRow, number>(
        pageRows.map((row, rowOffset) => [row, rowOffset])
      )
      const page = this.createPage(pageNo, pageRows)
      for (const column of page.columnList) {
        const columnRows = pageRows.filter(
          row => (row.columnIndex || 0) === column.index
        )
        const pageBlockList = this.createParagraphBlockList({
          pageNo,
          columnIndex: column.index,
          columnRect: column.rect,
          rowList: columnRows,
          pageRowOffsetMap,
          globalRowOffset
        })
        column.paragraphBlockList.push(...pageBlockList)
        paragraphBlockList.push(...pageBlockList)
      }
      pageList.push(page)
      globalRowOffset += pageRows.length
    }

    return {
      version: payload.version,
      pageCount: pageList.length,
      rowCount: globalRowOffset,
      paragraphBlockCount: paragraphBlockList.length,
      pageList,
      paragraphBlockList
    }
  }

  /** 创建单页结构，并支持选中内容分栏产生的局部栏数量。 */
  private createPage(pageNo: number, pageRows: IRow[]): ITypesettingPage {
    const width = this.draw.getWidth()
    const height = this.draw.getHeight()
    const columnLayout = this.draw
      .getServices()
      .pageColumnLayoutService.getPageColumnLayout(pageNo)
    const columnList = columnLayout.columnList.map(column => ({
      ...column,
      paragraphBlockList: []
    }))
    pageRows.forEach(row => {
      if (!row.columns) return
      const localLayout = this.draw
        .getServices()
        .pageColumnLayoutService.getPageColumnLayout(pageNo, row.columns)
      localLayout.columnList.forEach(column => {
        if (!columnList[column.index]) {
          columnList[column.index] = {
            ...column,
            paragraphBlockList: []
          }
        }
      })
    })
    return {
      pageNo,
      rect: {
        x: 0,
        y: 0,
        width,
        height
      },
      contentRect: columnLayout.contentRect,
      columnList
    }
  }

  /** 把页内连续行分组为段落块。 */
  private createParagraphBlockList(payload: {
    /** 页码，从 0 开始。 */
    pageNo: number
    /** 栏索引，从 0 开始。 */
    columnIndex: number
    /** 当前栏矩形，用于计算段落块在栏内的绝对位置。 */
    columnRect: ITypesettingRect
    /** 页内行列表。 */
    rowList: IRow[]
    /** 页内行偏移索引表，用于分栏过滤后仍保留全页行号。 */
    pageRowOffsetMap: Map<IRow, number>
    /** 当前页第一行在全局 rowList 中的偏移。 */
    globalRowOffset: number
  }): ITypesettingParagraphBlock[] {
    const groupList: ITypesettingParagraphBlockGroup[] = []
    let rowTop = payload.rowList[0]?.columnStartY ?? payload.columnRect.y
    for (let rowOffset = 0; rowOffset < payload.rowList.length; rowOffset++) {
      const row = payload.rowList[rowOffset]
      if (row.columnStartY !== undefined && row.columnStartY > rowTop) {
        rowTop = row.columnStartY
      }
      const rowOffsetY = row.offsetY || 0
      const pageRowOffset = payload.pageRowOffsetMap.get(row) ?? rowOffset
      const rowSegmentList = createTypesettingRowSegmentList({
        row,
        rowLeft: this.getRowLeft(row, payload.pageNo),
        rowTop: rowTop + rowOffsetY,
        pageRowOffset
      })
      rowSegmentList.forEach(segment => {
        appendTypesettingParagraphSegment(groupList, segment)
      })
      rowTop += rowOffsetY + row.height
    }
    return groupList.map((group, blockIndex) =>
      this.createParagraphBlock({
        pageNo: payload.pageNo,
        columnIndex: payload.columnIndex,
        blockIndex,
        globalRowOffset: payload.globalRowOffset,
        group
      })
    )
  }

  /** 创建单个段落块快照。 */
  private createParagraphBlock(payload: {
    /** 页码，从 0 开始。 */
    pageNo: number
    /** 栏索引，从 0 开始。 */
    columnIndex: number
    /** 当前页内的段落块序号。 */
    blockIndex: number
    /** 当前页第一行在全局 rowList 中的偏移。 */
    globalRowOffset: number
    /** 段落块分组。 */
    group: ITypesettingParagraphBlockGroup
  }): ITypesettingParagraphBlock {
    const firstSegment = payload.group.segmentList[0]
    const lastSegment =
      payload.group.segmentList[payload.group.segmentList.length - 1]
    const firstRow = firstSegment.row
    const lastRow = lastSegment.row
    const firstElement = getTypesettingSegmentContextElement(firstSegment)
    const startRowIndex = payload.globalRowOffset + firstSegment.pageRowOffset
    const endRowIndex = payload.globalRowOffset + lastSegment.pageRowOffset
    const startIndex = firstRow.startIndex + firstSegment.startElementOffset
    const endIndex =
      lastRow.startIndex + Math.max(0, lastSegment.endElementOffset)
    const rowCount = new Set(
      payload.group.segmentList.map(segment => segment.pageRowOffset)
    ).size
    return {
      id: `p${payload.pageNo}-c${payload.columnIndex}-b${payload.blockIndex}`,
      pageNo: payload.pageNo,
      columnIndex: payload.columnIndex,
      startRowIndex,
      endRowIndex,
      startIndex,
      endIndex,
      rowCount,
      rect: {
        x: payload.group.left,
        y: payload.group.top,
        width: Math.max(0, payload.group.right - payload.group.left),
        height: Math.max(0, payload.group.bottom - payload.group.top)
      },
      type: payload.group.type,
      rowFlex: firstRow.rowFlex,
      titleId: firstElement?.titleId,
      listId: firstElement?.listId,
      tableId:
        firstRow.tableFragment?.logicalTableId ||
        firstRow.tableFragment?.tableId ||
        firstElement?.tableId ||
        (firstElement && isTableElement(firstElement) ? firstElement.id : undefined),
      areaId: firstElement?.areaId,
      isPageBreak: payload.group.segmentList.some(segment => segment.row.isPageBreak)
    }
  }

  /** 获取行左边坐标，包含缩进和列表偏移。 */
  private getRowLeft(row: IRow, pageNo: number): number {
    const column = this.draw
      .getServices()
      .pageColumnLayoutService.getColumn(
        pageNo,
        row.columnIndex || 0,
        row.columns
      )
    return column.rect.x + (row.offsetX || 0)
  }
}
