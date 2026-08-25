import {
  DentalSurface,
  DentalToothStatus
} from '../model/ChartGraphic'

export type DentalStatusMarker =
  | 'cross'
  | 'corner-dot'
  | 'horizontal-band'
  | 'vertical-line'
  | 'top-band'
  | 'implant'

export interface IDentalStatusVisual {
  status: DentalToothStatus
  label: string
  fill: string
  stroke: string
  marker: DentalStatusMarker
}

export const DENTAL_STATUS_VISUAL_LIST: IDentalStatusVisual[] = [
  {
    status: 'missing',
    label: '缺失',
    fill: '#f3f4f6',
    stroke: '#dc2626',
    marker: 'cross'
  },
  {
    status: 'caries',
    label: '龋坏',
    fill: '#fee2e2',
    stroke: '#dc2626',
    marker: 'corner-dot'
  },
  {
    status: 'filled',
    label: '充填',
    fill: '#dbeafe',
    stroke: '#2563eb',
    marker: 'horizontal-band'
  },
  {
    status: 'rootCanal',
    label: '根管',
    fill: '#ede9fe',
    stroke: '#7c3aed',
    marker: 'vertical-line'
  },
  {
    status: 'crown',
    label: '冠修复',
    fill: '#fef3c7',
    stroke: '#d97706',
    marker: 'top-band'
  },
  {
    status: 'implant',
    label: '种植',
    fill: '#dcfce7',
    stroke: '#16a34a',
    marker: 'implant'
  }
]

export interface IDentalSurfaceRect {
  surface: DentalSurface
  x: number
  y: number
  width: number
  height: number
}

export interface IDentalPoint {
  x: number
  y: number
}

export interface IDentalSurfacePath {
  surface: DentalSurface
  pointList: IDentalPoint[]
  path: string
}

export interface IDentalToothPathGeometry {
  toothPath: string
  toothHitPointList: IDentalPoint[]
  surfaceList: IDentalSurfacePath[]
}

export function resolveDentalStatusVisualList(
  statusList: DentalToothStatus[] = []
) {
  return DENTAL_STATUS_VISUAL_LIST.filter(visual =>
    statusList.includes(visual.status)
  )
}

export function resolveDentalToothFill(statusList: DentalToothStatus[] = []) {
  return resolveDentalStatusVisualList(statusList)[0]?.fill || '#ffffff'
}

function resolveDentalMesialSide(code: string) {
  const quadrant = Number(code.charAt(0))
  return quadrant === 1 || quadrant === 4 ? 'right' : 'left'
}

function resolveDentalVerticalSurfaceMap(isTopRow: boolean) {
  return isTopRow
    ? {
        top: 'buccal' as DentalSurface,
        bottom: 'lingual' as DentalSurface
      }
    : {
        top: 'lingual' as DentalSurface,
        bottom: 'buccal' as DentalSurface
      }
}

function createClosedPolygonPath(pointList: IDentalPoint[]) {
  if (!pointList.length) return ''
  return `${pointList
    .map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`)
    .join(' ')} Z`
}

/** 生成牙冠轮廓和 5 个牙面的共享路径几何。 */
export function resolveDentalToothPathGeometry(payload: {
  toothCode: string
  x: number
  y: number
  width: number
  height: number
  isTopRow: boolean
}): IDentalToothPathGeometry {
  const { toothCode, x, y, width, height, isTopRow } = payload
  const cx = x + width / 2
  const innerLeft = x + width * 0.31
  const innerRight = x + width * 0.69
  const innerTop = y + height * 0.35
  const innerBottom = y + height * 0.65
  const outerLeft = x + width * 0.08
  const outerRight = x + width * 0.92
  const outerTop = y + height * 0.1
  const outerBottom = y + height * 0.9
  const mesialSide = resolveDentalMesialSide(toothCode)
  const verticalMap = resolveDentalVerticalSurfaceMap(isTopRow)
  const leftSurface = mesialSide === 'left' ? 'mesial' : 'distal'
  const rightSurface = mesialSide === 'right' ? 'mesial' : 'distal'
  const surfaceList: IDentalSurfacePath[] = [
    {
      surface: leftSurface,
      pointList: [
        { x: outerLeft, y: y + height * 0.24 },
        { x: innerLeft, y: innerTop },
        { x: innerLeft, y: innerBottom },
        { x: outerLeft, y: y + height * 0.76 }
      ],
      path: ''
    },
    {
      surface: rightSurface,
      pointList: [
        { x: innerRight, y: innerTop },
        { x: outerRight, y: y + height * 0.24 },
        { x: outerRight, y: y + height * 0.76 },
        { x: innerRight, y: innerBottom }
      ],
      path: ''
    },
    {
      surface: verticalMap.top,
      pointList: [
        { x: x + width * 0.24, y: outerTop },
        { x: x + width * 0.76, y: outerTop },
        { x: innerRight, y: innerTop },
        { x: innerLeft, y: innerTop }
      ],
      path: ''
    },
    {
      surface: verticalMap.bottom,
      pointList: [
        { x: innerLeft, y: innerBottom },
        { x: innerRight, y: innerBottom },
        { x: x + width * 0.76, y: outerBottom },
        { x: x + width * 0.24, y: outerBottom }
      ],
      path: ''
    },
    {
      surface: 'occlusal',
      pointList: [
        { x: innerLeft, y: innerTop },
        { x: innerRight, y: innerTop },
        { x: innerRight, y: innerBottom },
        { x: innerLeft, y: innerBottom }
      ],
      path: ''
    }
  ]
  surfaceList.forEach(surface => {
    surface.path = createClosedPolygonPath(surface.pointList)
  })
  const toothHitPointList = [
    { x: x + width * 0.16, y },
    { x: x + width * 0.84, y },
    { x: x + width, y: y + height * 0.18 },
    { x: x + width * 0.96, y: y + height * 0.72 },
    { x: x + width * 0.72, y: y + height },
    { x: x + width * 0.28, y: y + height },
    { x, y: y + height * 0.72 },
    { x, y: y + height * 0.18 }
  ]
  const toothPath = [
    `M ${x + width * 0.16} ${y}`,
    `C ${x + width * 0.04} ${y} ${x} ${y + height * 0.08} ${x} ${y + height * 0.2}`,
    `L ${x + width * 0.04} ${y + height * 0.72}`,
    `C ${x + width * 0.06} ${y + height * 0.9} ${x + width * 0.18} ${y + height} ${cx} ${y + height}`,
    `C ${x + width * 0.82} ${y + height} ${x + width * 0.94} ${y + height * 0.9} ${x + width * 0.96} ${y + height * 0.72}`,
    `L ${x + width} ${y + height * 0.2}`,
    `C ${x + width} ${y + height * 0.08} ${x + width * 0.96} ${y} ${x + width * 0.84} ${y}`,
    `C ${x + width * 0.68} ${y + height * 0.04} ${x + width * 0.62} ${y + height * 0.07} ${cx} ${y + height * 0.04}`,
    `C ${x + width * 0.38} ${y + height * 0.07} ${x + width * 0.32} ${y + height * 0.04} ${x + width * 0.16} ${y}`,
    'Z'
  ].join(' ')
  return {
    toothPath,
    toothHitPointList,
    surfaceList
  }
}

/** 判断点是否位于牙冠或牙面多边形内。 */
export function isPointInDentalPolygon(
  point: IDentalPoint,
  polygon: IDentalPoint[]
) {
  let inside = false
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index++) {
    const current = polygon[index]
    const previous = polygon[previousIndex]
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x
    if (intersects) inside = !inside
  }
  return inside
}

/** 兼容旧调用，返回 5 个牙面路径的包围矩形。 */
export function resolveDentalSurfaceRectList(payload: {
  toothCode: string
  x: number
  y: number
  width: number
  height: number
  isTopRow: boolean
}): IDentalSurfaceRect[] {
  return resolveDentalToothPathGeometry(payload).surfaceList.map(surface => {
    const xList = surface.pointList.map(point => point.x)
    const yList = surface.pointList.map(point => point.y)
    const x = Math.min(...xList)
    const y = Math.min(...yList)
    return {
      surface: surface.surface,
      x,
      y,
      width: Math.max(...xList) - x,
      height: Math.max(...yList) - y
    }
  })
}
