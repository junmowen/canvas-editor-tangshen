import { commentList } from '../mock'
import {
  Editor,
  EditorMode,
  ICatalogItem,
  PageMode,
  PaperDirection
} from '../../editor'
import { Dialog } from '../../components/dialog/Dialog'
import {
  getDialogValue,
  parseDialogNumberList,
  parseDialogOptionalInteger,
  parseDialogPositiveInteger
} from './dialogValue'

interface ReviewContext {
  commentDom: HTMLDivElement
  scheduleReviewLinksRender: () => void
}

export function setupFooterOptions(
  instance: Editor,
  reviewContext: ReviewContext
) {
  const { commentDom, scheduleReviewLinksRender } = reviewContext
  // 6. 目录显隐 | 页面模式 | 纸张缩放 | 纸张大小 | 纸张方向 | 页边距 | 全屏 | 设置
  const editorOptionDom =
    document.querySelector<HTMLDivElement>('.editor-option')!
  editorOptionDom.onclick = function () {
    const options = instance.command.getOptions()
    new Dialog({
      title: '编辑器配置',
      data: [
        {
          type: 'textarea',
          name: 'option',
          width: 350,
          height: 300,
          required: true,
          value: JSON.stringify(options, null, 2),
          placeholder: '请输入编辑器配置'
        }
      ],
      onConfirm: payload => {
        const newOptionValue = payload.find(p => p.name === 'option')?.value
        if (!newOptionValue) return
        const newOption = JSON.parse(newOptionValue)
        instance.command.executeUpdateOptions(newOption)
      }
    })
  }

  async function updateCatalog() {
    const catalog = await instance.command.getCatalog()
    const catalogMainDom =
      document.querySelector<HTMLDivElement>('.catalog__main')!
    catalogMainDom.innerHTML = ''
    if (catalog) {
      const appendCatalog = (
        parent: HTMLDivElement,
        catalogItems: ICatalogItem[]
      ) => {
        for (let c = 0; c < catalogItems.length; c++) {
          const catalogItem = catalogItems[c]
          const catalogItemDom = document.createElement('div')
          catalogItemDom.classList.add('catalog-item')
          // 渲染
          const catalogItemContentDom = document.createElement('div')
          catalogItemContentDom.classList.add('catalog-item__content')
          const catalogItemContentSpanDom = document.createElement('span')
          catalogItemContentSpanDom.innerText = catalogItem.name
          catalogItemContentDom.append(catalogItemContentSpanDom)
          // 定位
          catalogItemContentDom.onclick = () => {
            instance.command.executeLocationCatalog(catalogItem.id)
          }
          catalogItemDom.append(catalogItemContentDom)
          if (catalogItem.subCatalog && catalogItem.subCatalog.length) {
            appendCatalog(catalogItemDom, catalogItem.subCatalog)
          }
          // 追加
          parent.append(catalogItemDom)
        }
      }
      appendCatalog(catalogMainDom, catalog)
    }
  }
  let isCatalogShow = true
  const catalogDom = document.querySelector<HTMLElement>('.catalog')!
  const catalogModeDom =
    document.querySelector<HTMLDivElement>('.catalog-mode')!
  const catalogHeaderCloseDom = document.querySelector<HTMLDivElement>(
    '.catalog__header__close'
  )!
  const switchCatalog = () => {
    isCatalogShow = !isCatalogShow
    if (isCatalogShow) {
      catalogDom.style.display = 'block'
      updateCatalog()
    } else {
      catalogDom.style.display = 'none'
    }
  }
  catalogModeDom.onclick = switchCatalog
  catalogHeaderCloseDom.onclick = switchCatalog

  const pageModeDom = document.querySelector<HTMLDivElement>('.page-mode')!
  const pageModeOptionsDom =
    pageModeDom.querySelector<HTMLDivElement>('.options')!
  pageModeDom.onclick = function () {
    pageModeOptionsDom.classList.toggle('visible')
  }
  pageModeOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executePageMode(<PageMode>li.dataset.pageMode!)
  }

  document.querySelector<HTMLDivElement>('.page-scale-percentage')!.onclick =
    function () {
      console.log('page-scale-recovery')
      instance.command.executePageScaleRecovery()
    }

  document.querySelector<HTMLDivElement>('.page-scale-minus')!.onclick =
    function () {
      console.log('page-scale-minus')
      instance.command.executePageScaleMinus()
    }

  document.querySelector<HTMLDivElement>('.page-scale-add')!.onclick =
    function () {
      console.log('page-scale-add')
      instance.command.executePageScaleAdd()
    }

  // 纸张大小
  const paperSizeDom = document.querySelector<HTMLDivElement>('.paper-size')!
  const paperSizeDomOptionsDom =
    paperSizeDom.querySelector<HTMLDivElement>('.options')!
  paperSizeDom.onclick = function () {
    paperSizeDomOptionsDom.classList.toggle('visible')
  }
  paperSizeDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const paperType = li.dataset.paperSize!
    const [width, height] = paperType.split('*').map(Number)
    instance.command.executePaperSize(width, height)
    // 纸张状态回显
    paperSizeDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // 纸张方向
  const paperDirectionDom =
    document.querySelector<HTMLDivElement>('.paper-direction')!
  const paperDirectionDomOptionsDom =
    paperDirectionDom.querySelector<HTMLDivElement>('.options')!
  paperDirectionDom.onclick = function () {
    paperDirectionDomOptionsDom.classList.toggle('visible')
  }
  paperDirectionDomOptionsDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const paperDirection = li.dataset.paperDirection!
    instance.command.executePaperDirection(<PaperDirection>paperDirection)
    // 纸张方向状态回显
    paperDirectionDomOptionsDom
      .querySelectorAll('li')
      .forEach(child => child.classList.remove('active'))
    li.classList.add('active')
  }

  // 页面边距
  const paperMarginDom =
    document.querySelector<HTMLDivElement>('.paper-margin')!
  paperMarginDom.onclick = function () {
    const [topMargin, rightMargin, bottomMargin, leftMargin] =
      instance.command.getPaperMargin()
    new Dialog({
      title: '页边距',
      data: [
        {
          type: 'text',
          label: '上边距',
          name: 'top',
          required: true,
          value: `${topMargin}`,
          placeholder: '请输入上边距'
        },
        {
          type: 'text',
          label: '下边距',
          name: 'bottom',
          required: true,
          value: `${bottomMargin}`,
          placeholder: '请输入下边距'
        },
        {
          type: 'text',
          label: '左边距',
          name: 'left',
          required: true,
          value: `${leftMargin}`,
          placeholder: '请输入左边距'
        },
        {
          type: 'text',
          label: '右边距',
          name: 'right',
          required: true,
          value: `${rightMargin}`,
          placeholder: '请输入右边距'
        }
      ],
      onConfirm: payload => {
        const top = payload.find(p => p.name === 'top')?.value
        if (!top) return
        const bottom = payload.find(p => p.name === 'bottom')?.value
        if (!bottom) return
        const left = payload.find(p => p.name === 'left')?.value
        if (!left) return
        const right = payload.find(p => p.name === 'right')?.value
        if (!right) return
        instance.command.executeSetPaperMargin([
          Number(top),
          Number(right),
          Number(bottom),
          Number(left)
        ])
      }
    })
  }

  const pageNumberRangeDom =
    document.querySelector<HTMLDivElement>('.page-number-range')!
  pageNumberRangeDom.onclick = function () {
    const pageNumber = instance.command.getOptions().pageNumber || {}
    const fromPageNo = (pageNumber.fromPageNo ?? 0) + 1
    const isContinueMode =
      (pageNumber.startPageNo ?? 1) === 1 && (pageNumber.fromPageNo ?? 0) === 0

    new Dialog({
      title: '页码范围',
      data: [
        {
          type: 'select',
          label: '编号模式',
          name: 'mode',
          required: true,
          value: isContinueMode ? 'continue' : 'restart',
          options: [
            {
              label: '续编',
              value: 'continue'
            },
            {
              label: '重新编号',
              value: 'restart'
            }
          ]
        },
        {
          type: 'number',
          label: '起始页码',
          name: 'startPageNo',
          required: true,
          value: `${pageNumber.startPageNo ?? 1}`,
          placeholder: '请输入起始页码'
        },
        {
          type: 'number',
          label: '起始页（1起）',
          name: 'fromPageNo',
          required: true,
          value: `${fromPageNo}`,
          placeholder: '请输入起始页'
        },
        {
          type: 'number',
          label: '最大页数',
          name: 'maxPageNo',
          value: pageNumber.maxPageNo == null ? '' : `${pageNumber.maxPageNo}`,
          placeholder: '留空表示不限'
        }
      ],
      onConfirm: payload => {
        const mode = getDialogValue(payload, 'mode') || 'continue'
        const startPageNo = parseDialogPositiveInteger(
          getDialogValue(payload, 'startPageNo'),
          pageNumber.startPageNo ?? 1,
          1
        )
        const selectedFromPageNo = parseDialogPositiveInteger(
          getDialogValue(payload, 'fromPageNo'),
          fromPageNo,
          1
        )
        const maxPageNo = parseDialogOptionalInteger(
          getDialogValue(payload, 'maxPageNo')
        )

        if (mode === 'continue') {
          instance.command.executePageNumberContinue()
        } else {
          instance.command.executePageNumberRestart({
            startPageNo,
            fromPageNo: selectedFromPageNo - 1
          })
        }

        instance.command.executePageNumberRange({
          fromPageNo: selectedFromPageNo - 1,
          maxPageNo
        })
      }
    })
  }

  const pageColumnsDom =
    document.querySelector<HTMLDivElement>('.page-columns')!
  pageColumnsDom.onclick = function () {
    const columns = instance.command.getOptions().columns || {}
    new Dialog({
      title: '分栏',
      data: [
        {
          type: 'number',
          label: '栏数',
          name: 'count',
          required: true,
          value: `${columns.count ?? 1}`,
          placeholder: '请输入栏数'
        },
        {
          type: 'number',
          label: '栏间距',
          name: 'gap',
          required: true,
          value: `${columns.gap ?? 24}`,
          placeholder: '请输入栏间距'
        },
        {
          type: 'text',
          label: '栏宽（逗号分隔，可选）',
          name: 'widths',
          value: Array.isArray(columns.widths) ? columns.widths.join(',') : '',
          placeholder: '例如 120,100'
        }
      ],
      onConfirm: payload => {
        const count = parseDialogPositiveInteger(
          getDialogValue(payload, 'count'),
          columns.count ?? 1,
          1
        )
        const gap = parseDialogPositiveInteger(
          getDialogValue(payload, 'gap'),
          columns.gap ?? 24,
          0
        )
        const widths = parseDialogNumberList(getDialogValue(payload, 'widths'))

        instance.command.executeUpdateOptions({
          columns: {
            ...columns,
            count,
            gap,
            widths: widths.length > 0 ? widths : columns.widths || []
          }
        })
      }
    })
  }

  // 全屏
  const fullscreenDom = document.querySelector<HTMLDivElement>('.fullscreen')!
  fullscreenDom.onclick = toggleFullscreen
  window.addEventListener('keydown', evt => {
    if (evt.key === 'F11') {
      toggleFullscreen()
      evt.preventDefault()
    }
  })
  document.addEventListener('fullscreenchange', () => {
    fullscreenDom.classList.toggle('exist')
  })
  function toggleFullscreen() {
    console.log('fullscreen')
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  // 7. 编辑器使用模式
  let modeIndex = 0
  const modeList = [
    {
      mode: EditorMode.EDIT,
      name: '编辑模式'
    },
    {
      mode: EditorMode.CLEAN,
      name: '清洁模式'
    },
    {
      mode: EditorMode.READONLY,
      name: '只读模式'
    },
    {
      mode: EditorMode.FORM,
      name: '表单模式'
    },
    {
      mode: EditorMode.PRINT,
      name: '打印模式'
    },
    {
      mode: EditorMode.DESIGN,
      name: '设计模式'
    }
  ]
  const modeElement = document.querySelector<HTMLDivElement>('.editor-mode')!
  modeElement.onclick = function () {
    // 模式选择循环
    modeIndex === modeList.length - 1 ? (modeIndex = 0) : modeIndex++
    // 设置模式
    const { name, mode } = modeList[modeIndex]
    modeElement.innerText = name
    instance.command.executeMode(mode)
    // 设置菜单栏权限视觉反馈
    const isReadonly = mode === EditorMode.READONLY
    const enableMenuList = ['search', 'print']
    document.querySelectorAll<HTMLDivElement>('.menu-item>div').forEach(dom => {
      const menu = dom.dataset.menu
      isReadonly && (!menu || !enableMenuList.includes(menu))
        ? dom.classList.add('disable')
        : dom.classList.remove('disable')
    })
  }

  // 模拟批注
  async function updateComment() {
    const groupIds = await instance.command.getGroupIds()
    for (const comment of commentList) {
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${comment.id}']`
      )
      // 编辑器是否存在对应成组id
      if (groupIds.includes(comment.id)) {
        // 当前dom是否存在-不存在则追加
        if (!activeCommentDom) {
          const commentItem = document.createElement('div')
          commentItem.classList.add('comment-item')
          commentItem.setAttribute('data-id', comment.id)
          commentItem.onclick = () => {
            instance.command.executeLocationGroup(comment.id)
          }
          commentDom.append(commentItem)
          // 选区信息
          const commentItemTitle = document.createElement('div')
          commentItemTitle.classList.add('comment-item__title')
          commentItemTitle.append(document.createElement('span'))
          const commentItemTitleContent = document.createElement('span')
          commentItemTitleContent.innerText = comment.rangeText
          commentItemTitle.append(commentItemTitleContent)
          const closeDom = document.createElement('i')
          closeDom.onclick = () => {
            instance.command.executeDeleteGroup(comment.id)
            scheduleReviewLinksRender()
          }
          commentItemTitle.append(closeDom)
          commentItem.append(commentItemTitle)
          // 基础信息
          const commentItemInfo = document.createElement('div')
          commentItemInfo.classList.add('comment-item__info')
          const commentItemInfoName = document.createElement('span')
          commentItemInfoName.innerText = comment.userName
          const commentItemInfoDate = document.createElement('span')
          commentItemInfoDate.innerText = comment.createdDate
          commentItemInfo.append(commentItemInfoName)
          commentItemInfo.append(commentItemInfoDate)
          commentItem.append(commentItemInfo)
          // 详细评论
          const commentItemContent = document.createElement('div')
          commentItemContent.classList.add('comment-item__content')
          commentItemContent.innerText = comment.content
          commentItem.append(commentItemContent)
          commentDom.append(commentItem)
        }
      } else {
        // 编辑器内不存在对应成组id则dom则移除
        activeCommentDom?.remove()
      }
    }
    scheduleReviewLinksRender()
  }

  return {
    pageModeOptionsDom,
    getIsCatalogShow: () => isCatalogShow,
    updateCatalog,
    updateComment
  }
}
