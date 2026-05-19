import { IPadding } from './Common'

export type PageBorderStyle = 'solid' | 'dashed' | 'dotted' | 'double' | 'art'

export interface IPageBorderOption {
  color?: string
  lineWidth?: number
  padding?: IPadding
  style?: PageBorderStyle
  dashArray?: number[]
  artSize?: number
  disabled?: boolean
}
