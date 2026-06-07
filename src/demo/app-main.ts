import { createCanvasEditorApp } from '../app'
import { data, options as demoEditorOptions } from './mock'
import { ElementType, RowFlex } from '../editor'
import type { IElement } from '../editor'
import { createDemoPdfFonts } from './pdfFonts'

const host = document.querySelector<HTMLElement>('#app')!

function resolveDemoPublicAssetUrl(path: string) {
  const pathname = window.location.pathname
  const appBase = pathname.includes('/canvas-editor/')
    ? `${window.location.origin}/canvas-editor/`
    : `${window.location.origin}/`
  return new URL(path, appBase).href
}

function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = href
  downloadLink.download = filename
  downloadLink.click()
  URL.revokeObjectURL(href)
}

const app = createCanvasEditorApp({
  container: host,
  value: {
    headerPageScopes: [
      {
        pageScope: 'all',
        elementList: [
          {
            value: '第一人民医院',
            size: 32,
            rowFlex: RowFlex.CENTER
          },
          {
            value: '\n门诊病历',
            size: 18,
            rowFlex: RowFlex.CENTER
          },
          {
            value: '\n',
            type: ElementType.SEPARATOR
          }
        ]
      }
    ],
    main: data as IElement[],
    footerPageScopes: [
      {
        pageScope: 'all',
        elementList: [
          {
            value: 'canvas-editor',
            size: 12
          }
        ]
      }
    ]
  },
  editor: {
    ...demoEditorOptions,
    defaultFont: demoEditorOptions.defaultFont || 'Microsoft YaHei',
    defaultSize: demoEditorOptions.defaultSize || 16,
    width: demoEditorOptions.width || 794,
    height: demoEditorOptions.height || 1123
  },
  ui: {
    preset: 'standard'
  },
  handlers: {
    save: ctx => {
      Reflect.set(window, 'lastSavedDocument', ctx.editor.command.getValue())
    },
    exportPdf: async ctx => {
      const blob = await ctx.editor.command.getPdfBlob({
        fonts: createDemoPdfFonts(resolveDemoPublicAssetUrl)
      })
      downloadBlob(blob, `canvas-editor-${Date.now()}.pdf`)
    },
    onError: error => {
      const message = error instanceof Error ? error.message : String(error)
      window.alert(message)
    }
  }
})

Reflect.set(window, 'canvasEditorApp', app)
Reflect.set(window, 'editor', app.editor)
