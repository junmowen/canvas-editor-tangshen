import { PageColumnLayoutService } from '../../../src/editor/core/draw/layout/PageColumnLayoutService'

function createService(payload: {
  width?: number
  height?: number
  margins?: number[]
  headerExtraHeight?: number
  mainOuterHeight?: number
  scale?: number
  columns?: {
    count?: number
    gap?: number
    widths?: number[]
  }
}) {
  const draw = {
    getWidth: () => payload.width ?? 600,
    getHeight: () => payload.height ?? 800,
    getMargins: () => payload.margins ?? [40, 50, 60, 70],
    getHeader: () => ({
      getExtraHeight: () => payload.headerExtraHeight ?? 20
    }),
    getMainOuterHeight: () => payload.mainOuterHeight ?? 140,
    getOptions: () => ({
      scale: payload.scale ?? 1,
      columns: payload.columns ?? {
        count: 1,
        gap: 0
      }
    })
  }
  return new PageColumnLayoutService(draw as any)
}

describe('page column layout policy', () => {
  it('builds the content rect from page margins and header/footer reservations', () => {
    const service = createService({})
    const layout = service.getPageColumnLayout(0)

    expect(layout.contentRect).to.deep.eq({
      x: 70,
      y: 60,
      width: 480,
      height: 660
    })
    expect(layout.columnList).to.have.length(1)
    expect(layout.columnList[0].rect).to.deep.eq(layout.contentRect)
  })

  it('creates equal columns from count and scaled gap', () => {
    const service = createService({
      scale: 2,
      columns: {
        count: 3,
        gap: 10
      }
    })
    const layout = service.getPageColumnLayout(0)

    expect(layout.columnList.map(column => column.rect.width)).to.deep.eq([
      146.66666666666666,
      146.66666666666666,
      146.66666666666666
    ])
    expect(layout.columnList.map(column => column.rect.x)).to.deep.eq([
      70,
      236.66666666666666,
      403.3333333333333
    ])
  })

  it('uses explicit widths and falls back for unspecified columns', () => {
    const service = createService({
      columns: {
        count: 3,
        gap: 20,
        widths: [120, 180]
      }
    })
    const layout = service.getPageColumnLayout(0)

    expect(layout.columnList.map(column => column.rect.width)).to.deep.eq([
      120,
      180,
      140
    ])
    expect(service.getMeasurementColumnWidth(0)).to.eq(120)
  })

  it('prefers local column overrides and falls back when index is out of range', () => {
    const service = createService({
      columns: {
        count: 1,
        gap: 0
      }
    })
    const override = {
      count: 2,
      gap: 24,
      widths: [160, 240]
    }

    expect(service.getPrimaryColumnWidth(0, override)).to.eq(160)
    expect(service.getMeasurementColumnWidth(0, override)).to.eq(160)
    expect(service.getColumn(0, 9, override).index).to.eq(0)
    expect(service.getPageColumnLayout(0).columnList).to.have.length(1)
    expect(service.getPageColumnLayout(0, override).columnList).to.have.length(2)
  })

  it('normalizes invalid counts gaps and widths', () => {
    const service = createService({
      columns: {
        count: -2,
        gap: -10,
        widths: [-100]
      }
    })
    const layout = service.getPageColumnLayout(0)

    expect(layout.columnList).to.have.length(1)
    expect(layout.columnList[0].rect.width).to.eq(0)
    expect(service.getMeasurementColumnWidth(0)).to.eq(0)
  })
})
