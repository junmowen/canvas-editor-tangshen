import { IPageNumber } from '../../interface/PageNumber'

/** 生成“沿用上一节页码”的下一份页码配置。 */
export function createPageNumberContinueOptions(pageNumber: IPageNumber): IPageNumber {
  return {
    ...pageNumber,
    startPageNo: 1,
    fromPageNo: 0
  }
}

/** 生成“从指定编号重新开始”的下一份页码配置。 */
export function createPageNumberRestartOptions(
  pageNumber: IPageNumber,
  payload: {
    /** 起始页码，用于限定跨页范围的左边界。 */
    startPageNo?: number
    /** 来源页码，用于描述迁移或重排前所在页面。 */
    fromPageNo?: number
  }
): IPageNumber {
  return {
    ...pageNumber,
    startPageNo: payload.startPageNo ?? pageNumber.startPageNo,
    fromPageNo: payload.fromPageNo ?? pageNumber.fromPageNo
  }
}

/** 生成“页码应用范围”的下一份页码配置。 */
export function createPageNumberRangeOptions(
  pageNumber: IPageNumber,
  payload: {
    /** 来源页码，用于描述迁移或重排前所在页面。 */
    fromPageNo?: number
    /** 最大页面no，用于定位对应页、行或序号。 */
    maxPageNo?: number | null
  }
): IPageNumber {
  return {
    ...pageNumber,
    fromPageNo: payload.fromPageNo ?? pageNumber.fromPageNo,
    maxPageNo:
      payload.maxPageNo === undefined ? pageNumber.maxPageNo : payload.maxPageNo
  }
}
