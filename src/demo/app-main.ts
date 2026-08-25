import { createCanvasEditorApp } from '../app'
import { commentList, data, options as demoEditorOptions } from './mock'
import { ElementType, RowFlex } from '../editor'
import type { IElement } from '../editor'
import { Dialog } from '../components/dialog/Dialog'
import { createDemoPdfFonts } from './pdfFonts'
import { getDialogValue } from './menus/dialogValue'

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

type DemoComment = (typeof commentList)[number]

function promptComment(draft: { id: string; rangeText: string }) {
  return new Promise<DemoComment | false>(resolve => {
    const settle = (value: DemoComment | false) => {
      resolve(value)
    }
    new Dialog({
      title: '批注',
      data: [
        {
          type: 'textarea',
          label: '批注',
          height: 100,
          name: 'value',
          required: true,
          placeholder: '请输入批注'
        }
      ],
      onClose: () => settle(false),
      onCancel: () => settle(false),
      onConfirm: payload => {
        const value = getDialogValue(payload, 'value')
        if (!value) {
          settle(false)
          return
        }
        const comment = {
          id: draft.id,
          content: value,
          userName: 'Hufe',
          rangeText: draft.rangeText,
          createdDate: new Date().toLocaleString()
        }
        commentList.push(comment)
        settle(comment)
      }
    })
  })
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
    getTrackChangeAuthor: () => '君莫问',
    getComments: () => commentList,
    createComment: draft => promptComment(draft),
    deleteComment: commentId => {
      const index = commentList.findIndex(comment => comment.id === commentId)
      if (index >= 0) {
        commentList.splice(index, 1)
      }
    },
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
