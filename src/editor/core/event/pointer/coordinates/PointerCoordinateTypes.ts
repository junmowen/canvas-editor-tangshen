import { IPagePoint } from '../../utils/PagePointTypes'

export interface IPointerPoint {
  x: number
  y: number
}

export interface IViewportPoint extends IPointerPoint {}

export interface IContainerPoint extends IPointerPoint {}

export interface IResolvedPagePoint extends IPagePoint {
  pageNo: number
  isExactPage: boolean
}

export interface IPointerCoordinatePayload {
  viewport: IViewportPoint
  container: IContainerPoint | null
  page: IResolvedPagePoint | null
  deltaViewport: IPointerPoint
  source: 'mouse' | 'drag'
}
