import { IPageBorderOption } from '../../interface/PageBorder'

export const defaultPageBorderOption: Readonly<Required<IPageBorderOption>> = {
  color: '#000000',
  lineWidth: 1,
  padding: [0, 5, 0, 5],
  style: 'solid',
  dashArray: [],
  artSize: 16,
  disabled: true
}
