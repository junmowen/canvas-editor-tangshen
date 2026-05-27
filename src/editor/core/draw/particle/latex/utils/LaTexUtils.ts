import { SYMB } from './symbols'
import {
  CONFIG,
  environments,
  flatten,
  parse,
  plan,
  render,
  tokenize
} from './latexCore'
import type { Bbox, Expr } from './latexCore'

interface ExportOpt {
  MIN_CHAR_H?: number
  MAX_W?: number
  MAX_H?: number
  MARGIN_X?: number
  MARGIN_Y?: number
  SCALE_X?: number
  SCALE_Y?: number
  STROKE_W?: number
  FG_COLOR?: string
  BG_COLOR?: string
}

function nf(x: number): number {
  return Math.round(x * 100) / 100
}

export interface LaTexSVG {
  svg: string
  width: number
  height: number
}

export class LaTexUtils {
  _latex: string
  _tree: Expr
  _tokens: string[]
  _polylines: number[][][]

  constructor(latex: string) {
    this._latex = latex
    this._tokens = tokenize(latex)
    this._tree = parse(this._tokens)
    environments(this._tree.chld)
    plan(this._tree)
    flatten(this._tree)
    this._polylines = render(this._tree)
  }

  private resolveScale(opt?: ExportOpt): number[] {
    if (opt == undefined) {
      return [16, 16, 16, 16]
    }
    let sclx: number = opt.SCALE_X ?? 16
    let scly: number = opt.SCALE_Y ?? 16

    if (opt.MIN_CHAR_H != undefined) {
      let mh = 0
      for (let i = 0; i < this._tree.chld.length; i++) {
        const c: Expr = this._tree.chld[i]
        if (
          c.type == 'char' ||
          (SYMB[c.text] &&
            (SYMB[c.text].flags.txt || !Object.keys(SYMB[c.text].flags).length))
        ) {
          mh = Math.min(c.bbox.h, mh)
        }
      }
      const s: number = Math.max(1, opt.MIN_CHAR_H / mh)
      sclx *= s
      scly *= s
    }
    if (opt.MAX_W != undefined) {
      const s0 = sclx
      sclx = Math.min(sclx, opt.MAX_W / this._tree.bbox.w)
      scly *= sclx / s0
    }
    if (opt.MAX_H != undefined) {
      const s0 = scly
      scly = Math.min(scly, opt.MAX_H / this._tree.bbox.h)
      sclx *= scly / s0
    }
    const px: number = opt.MARGIN_X ?? sclx
    const py: number = opt.MARGIN_Y ?? scly
    return [px, py, sclx, scly]
  }

  polylines(opt?: ExportOpt): number[][][] {
    if (!opt) opt = {}
    const polylines: number[][][] = []
    const [px, py, sclx, scly] = this.resolveScale(opt)
    for (let i = 0; i < this._polylines.length; i++) {
      polylines.push([])
      for (let j = 0; j < this._polylines[i].length; j++) {
        const [x, y] = this._polylines[i][j]
        polylines[polylines.length - 1].push([px + x * sclx, py + y * scly])
      }
    }
    return polylines
  }

  pathd(opt?: ExportOpt): string {
    if (!opt) opt = {}
    let d = ''
    const [px, py, sclx, scly] = this.resolveScale(opt)
    for (let i = 0; i < this._polylines.length; i++) {
      for (let j = 0; j < this._polylines[i].length; j++) {
        const [x, y] = this._polylines[i][j]
        d += !j ? 'M' : 'L'
        d += `${nf(px + x * sclx)} ${nf(py + y * scly)}`
      }
    }
    return d
  }

  svg(opt: ExportOpt): LaTexSVG {
    if (!opt) opt = {}
    const [px, py, sclx, scly] = this.resolveScale(opt)
    const w = nf(this._tree.bbox.w * sclx + px * 2)
    const h = nf(this._tree.bbox.h * scly + py * 2)
    let o = `<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${w}" height="${h}"
      fill="none" stroke="${opt.FG_COLOR ?? 'black'}" stroke-width="${
      opt.STROKE_W ?? 1
    }"
      stroke-linecap="round" stroke-linejoin="round"
    >`
    if (opt.BG_COLOR) {
      o += `<rect x="${0}" y="${0}" width="${w}" height="${h}" fill="${
        opt.BG_COLOR
      }" stroke="none"></rect>`
    }
    o += `<path d="`
    for (let i = 0; i < this._polylines.length; i++) {
      o += 'M'
      for (let j = 0; j < this._polylines[i].length; j++) {
        const [x, y] = this._polylines[i][j]
        o += nf(px + x * sclx) + ' ' + nf(py + y * scly) + ' '
      }
    }
    o += `"/>`
    o += `</svg>`
    return {
      svg: `data:image/svg+xml;base64,${window.btoa(o)}`,
      width: Math.ceil(w),
      height: Math.ceil(h)
    }
  }

  pdf(opt: ExportOpt): string {
    if (!opt) opt = {}
    const [px, py, sclx, scly] = this.resolveScale(opt)

    const width = nf(this._tree.bbox.w * sclx + px * 2)
    const height = nf(this._tree.bbox.h * scly + py * 2)
    let head = `%PDF-1.1\n%%¥±ë\n1 0 obj\n<< /Type /Catalog\n/Pages 2 0 R\n>>endobj
    2 0 obj\n<< /Type /Pages\n/Kids [3 0 R]\n/Count 1\n/MediaBox [0 0 ${width} ${height}]\n>>\nendobj
    3 0 obj\n<< /Type /Page\n/Parent 2 0 R\n/Resources\n<< /Font\n<< /F1\n<< /Type /Font
    /Subtype /Type1\n/BaseFont /Times-Roman\n>>\n>>\n>>\n/Contents [`
    let pdf = ''
    let count = 4
    for (let i = 0; i < this._polylines.length; i++) {
      pdf += `${count} 0 obj \n<< /Length 0 >>\n stream\n 1 j 1 J ${
        opt.STROKE_W ?? 1
      } w\n`
      for (let j = 0; j < this._polylines[i].length; j++) {
        const [x, y] = this._polylines[i][j]
        pdf += `${nf(px + x * sclx)} ${nf(height - (py + y * scly))} ${
          j ? 'l' : 'm'
        } `
      }
      pdf += '\nS\nendstream\nendobj\n'
      head += `${count} 0 R `
      count++
    }
    head += ']\n>>\nendobj\n'
    pdf += '\ntrailer\n<< /Root 1 0 R \n /Size 0\n >>startxref\n\n%%EOF\n'
    return head + pdf
  }

  boxes(opt: ExportOpt): Bbox[] {
    if (!opt) opt = {}
    const [px, py, sclx, scly] = this.resolveScale(opt)
    const bs: Bbox[] = []
    for (let i = 0; i < this._tree.chld.length; i++) {
      const { x, y, w, h } = this._tree.chld[i].bbox
      bs.push({ x: px + x * sclx, y: py + y * scly, w: w * sclx, h: h * scly })
    }
    return bs
  }

  box(opt: ExportOpt): Bbox {
    if (!opt) opt = {}
    const [px, py, sclx, scly] = this.resolveScale(opt)
    return {
      x: px + this._tree.bbox.x * sclx,
      y: py + this._tree.bbox.y * scly,
      w: this._tree.bbox.w * sclx,
      h: this._tree.bbox.h * scly
    }
  }
}

const _impl: Record<string, Function> = {
  tokenize,
  parse,
  environments,
  plan,
  flatten,
  render
}

export { CONFIG, _impl }
