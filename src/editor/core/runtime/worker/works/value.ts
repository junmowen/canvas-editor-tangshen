import { IGetValueOption } from '../../../../interface/Draw'
import {
  IEditorData,
  IHeaderFooterPageScopeData,
  IRuntimeEditorData
} from '../../../../interface/Editor'
import { zipElementList } from '../../../../utils/elementZip'

/** 获取值后台线程选项，用于约束调用方可传入的可选配置。 */
interface IGetValueWorkerOption {
  /** 业务数据载荷，供当前操作读取或提交。 */
  data: IRuntimeEditorData
  /** 操作配置项，用于调整当前流程的可选行为。 */
  options: IGetValueOption
}

onmessage = evt => {
  const payload = <IGetValueWorkerOption>evt.data
  const { options, data } = payload
  const { extraPickAttrs = [] } = options || {}

  const editorData: IEditorData = {
    main: zipElementList(data.main, {
      extraPickAttrs,
      isClassifyArea: true,
      isClone: false
    })
  }
  if (data.header) {
    editorData.header = zipElementList(data.header, {
      extraPickAttrs,
      isClone: false
    })
  }
  if (data.footer) {
    editorData.footer = zipElementList(data.footer, {
      extraPickAttrs,
      isClone: false
    })
  }
  if (data.headerPageScopes) {
    editorData.headerPageScopes = zipPageScopes(
      data.headerPageScopes,
      extraPickAttrs
    )
  }
  if (data.footerPageScopes) {
    editorData.footerPageScopes = zipPageScopes(
      data.footerPageScopes,
      extraPickAttrs
    )
  }

  postMessage(editorData)
}

function zipPageScopes(
  pageScopes: IHeaderFooterPageScopeData[],
  extraPickAttrs: IGetValueOption['extraPickAttrs']
): IHeaderFooterPageScopeData[] {
  return pageScopes.map(scopeData => ({
    pageScope: scopeData.pageScope,
    elementList: zipElementList(scopeData.elementList, {
      extraPickAttrs,
      isClone: false
    })
  }))
}
