interface HersheyEntry {
  w: number
  xmin: number
  xmax: number
  ymin: number
  ymax: number
  polylines: Array<Array<Array<number>>>
}

const ordR = 'R'.charCodeAt(0)

export function HERSHEY(i: number): HersheyEntry {
  if (data[i] == null) {
    compile(i)
  }
  return data[i]
}

function compile(i: number): void {
  const entry: string = raw[i]
  if (entry == null) {
    return
  }
  const bound: string = entry.substring(3, 5)
  const xmin: number = 1 * bound.charCodeAt(0) - ordR
  const xmax: number = 1 * bound.charCodeAt(1) - ordR
  const content: string = entry.substring(5)

  const polylines: Array<Array<Array<number>>> = [[]]
  let ymin = Infinity
  let ymax = -Infinity
  let zmin = Infinity
  let zmax = -Infinity
  let j = 0
  while (j < content.length) {
    const digit: string = content.substring(j, j + 2)
    if (digit == ' R') {
      polylines.push([])
    } else {
      const x: number = digit.charCodeAt(0) - ordR - xmin
      const y: number = digit.charCodeAt(1) - ordR
      ymin = Math.min(y, ymin)
      ymax = Math.max(y, ymax)
      zmin = Math.min(x, zmin)
      zmax = Math.max(x, zmax)
      polylines[polylines.length - 1].push([x, y])
    }
    j += 2
  }
  data[i] = {
    w: xmax - xmin,
    xmin: zmin,
    xmax: zmax,
    ymin: ymin,
    ymax: ymax,
    polylines: polylines
  }
}
const data: Record<number, HersheyEntry> = {}
import { raw1 } from './hersheyRawA'
import { raw2 } from './hersheyRawB'

const raw: Record<number, string> = {
  ...raw1,
  ...raw2
}
