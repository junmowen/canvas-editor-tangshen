import { ElementType } from '../../../src/editor/dataset/enum/Element'
import type {
  IElementMetrics,
  ITabStop
} from '../../../src/editor/interface/Element'
import {
  isTabElement,
  resolveTabAlignmentOffset,
  resolveTabMeasure,
  TabElementLayout
} from '../../../src/editor/core/modules/paragraph/layout/TabElementLayout'

function tabStops(value: ITabStop[]): ITabStop[] {
  return value
}

describe('tab layout policy', () => {
  it('identifies tab elements without treating plain text as a tab', () => {
    expect(isTabElement({ type: ElementType.TAB, value: '' })).to.eq(true)
    expect(isTabElement({ value: '\t' })).to.eq(false)
    expect(isTabElement(undefined)).to.eq(false)
  })

  it('uses the next sorted in-bounds tab stop without mutating paragraph stops', () => {
    const stops = tabStops([
      { position: -10, alignment: 'right' },
      { position: 80, alignment: 'right' },
      { position: 50 }
    ])

    expect(
      resolveTabMeasure({
        scale: 2,
        defaultTabWidth: 24,
        currentRowWidth: 70,
        availableWidth: 200,
        nextRunWidth: 10,
        tabStops: stops
      })
    ).to.deep.eq({ width: 30, alignment: 'left' })
    expect(stops.map(stop => stop.position)).to.deep.eq([-10, 80, 50])
  })

  it('falls back to the default tab width when no explicit stop can be hit', () => {
    expect(
      resolveTabMeasure({
        scale: 2,
        defaultTabWidth: 24,
        currentRowWidth: 100,
        availableWidth: 200,
        nextRunWidth: 20,
        tabStops: [
          { position: 50, alignment: 'left' },
          { position: 120, alignment: 'right' }
        ]
      })
    ).to.deep.eq({ width: 48 })
  })

  it('applies alignment offsets and clamps over-wide aligned runs', () => {
    expect(
      resolveTabAlignmentOffset({ alignment: 'left', nextRunWidth: 40 })
    ).to.eq(0)
    expect(
      resolveTabAlignmentOffset({ alignment: 'bar', nextRunWidth: 40 })
    ).to.eq(0)
    expect(
      resolveTabAlignmentOffset({ alignment: 'center', nextRunWidth: 40 })
    ).to.eq(20)
    expect(
      resolveTabAlignmentOffset({ alignment: 'right', nextRunWidth: 40 })
    ).to.eq(40)
    expect(
      resolveTabAlignmentOffset({ alignment: 'decimal', nextRunWidth: 40 })
    ).to.eq(40)

    expect(
      resolveTabMeasure({
        scale: 1,
        defaultTabWidth: 24,
        currentRowWidth: 20,
        availableWidth: 200,
        nextRunWidth: 200,
        tabStops: [{ position: 100, alignment: 'right' }]
      })
    ).to.deep.eq({ width: 0, alignment: 'right' })
  })

  it('writes tab metrics and preserves the matched tab stop alignment', () => {
    const metrics: IElementMetrics = {
      width: 0,
      height: 0,
      boundingBoxAscent: 0,
      boundingBoxDescent: 0
    }
    const layout = new TabElementLayout()

    expect(
      layout.measure({
        element: { type: ElementType.TAB, value: '' },
        metrics,
        scale: 2,
        defaultSize: 12,
        defaultTabWidth: 24,
        currentRowWidth: 10,
        availableWidth: 100,
        nextRunWidth: 0,
        tabStops: [{ position: 30, alignment: 'bar' }]
      })
    ).to.eq(true)
    expect(metrics).to.deep.eq({
      width: 50,
      height: 24,
      boundingBoxAscent: 24,
      boundingBoxDescent: 0,
      tabStopAlignment: 'bar'
    })
  })

  it('leaves non-tab metrics untouched', () => {
    const metrics: IElementMetrics = {
      width: 5,
      height: 6,
      boundingBoxAscent: 4,
      boundingBoxDescent: 2,
      tabStopAlignment: 'right'
    }
    const layout = new TabElementLayout()

    expect(
      layout.measure({
        element: { value: 'A' },
        metrics,
        scale: 2,
        defaultSize: 12,
        defaultTabWidth: 24,
        currentRowWidth: 10,
        availableWidth: 100,
        nextRunWidth: 0
      })
    ).to.eq(false)
    expect(metrics).to.deep.eq({
      width: 5,
      height: 6,
      boundingBoxAscent: 4,
      boundingBoxDescent: 2,
      tabStopAlignment: 'right'
    })
  })
})
