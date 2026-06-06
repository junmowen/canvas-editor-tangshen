import { IElement } from '../../../interface/Element'
import {
  visitTableCellValueList
} from '../../modules/table/layout/TableRowLayoutPolicy'

/** 布局内容特征，用于跳过不需要的后处理。 */
export interface IDrawLayoutFeaturePresence {
  hasTable: boolean
  hasArea: boolean
  hasControl: boolean
}

/** 扫描布局元素中的表格、区域和控件特征。 */
export function scanDrawLayoutFeaturePresence(
  elementList: IElement[]
): IDrawLayoutFeaturePresence {
  const result = {
    hasTable: false,
    hasArea: false,
    hasControl: false
  }
  const visit = (payload: IElement[]) => {
    for (let i = 0; i < payload.length; i++) {
      const element = payload[i]
      if (visitTableCellValueList({
        element,
        tableIndex: i,
        visitor: ({ td }) => visit(td.value || [])
      })) {
        result.hasTable = true
      }
      if (element.areaId) {
        result.hasArea = true
      }
      if (element.controlId) {
        result.hasControl = true
      }
      if (result.hasTable && result.hasArea && result.hasControl) {
        return
      }
    }
  }
  visit(elementList)
  return result
}
