import { EditorZone, ElementType } from '../editor'
import type { IElement, IRangeStyle } from '../editor'
import type { IRegisterContextMenu } from '../editor/interface/contextmenu/ContextMenu'
import type {
  CanvasEditorAppComment,
  CanvasEditorAppContext,
  CreateCanvasEditorAppOptions
} from './types'

interface ReviewRect {
  x: number
  y: number
  width: number
  height: number
}

interface AppCatalogItem {
  id: string
  name: string
  subCatalog?: AppCatalogItem[]
}

type TrackChangeRecord = ReturnType<
  CanvasEditorAppContext['editor']['command']['getTrackChangeList']
>[number]

export class CanvasEditorAppReviewPanels {
  private root: HTMLElement
  private editorHost: HTMLElement
  private context: CanvasEditorAppContext
  private getOptions: () => CreateCanvasEditorAppOptions
  private catalogDom: HTMLDivElement
  private catalogMainDom: HTMLDivElement
  private commentDom: HTMLDivElement
  private trackChangePanelDom: HTMLDivElement
  private trackChangeListDom: HTMLDivElement
  private trackChangeLinkLayerDom: SVGSVGElement
  private internalCommentList: CanvasEditorAppComment[]
  private isTrackChangePanelManuallyClosed: boolean
  private trackChangeLinkFrame: number | null
  private disposers: Array<() => void>

  constructor(payload: {
    root: HTMLElement
    editorHost: HTMLElement
    context: CanvasEditorAppContext
    getOptions: () => CreateCanvasEditorAppOptions
  }) {
    this.root = payload.root
    this.editorHost = payload.editorHost
    this.context = payload.context
    this.getOptions = payload.getOptions
    this.internalCommentList = []
    this.isTrackChangePanelManuallyClosed = false
    this.trackChangeLinkFrame = null
    this.disposers = []

    this.catalogDom = document.createElement('div')
    this.catalogDom.className = 'catalog'
    this.catalogDom.innerHTML = [
      '<div class="catalog__header">',
      '<span>目录</span>',
      '<div class="catalog__header__close"><i></i></div>',
      '</div>',
      '<div class="catalog__main"></div>'
    ].join('')
    this.catalogMainDom =
      this.catalogDom.querySelector<HTMLDivElement>('.catalog__main')!

    this.commentDom = document.createElement('div')
    this.commentDom.className = 'comment'

    this.trackChangePanelDom = document.createElement('div')
    this.trackChangePanelDom.className = 'track-change-panel'
    this.trackChangePanelDom.innerHTML = [
      '<div class="track-change-panel__header">',
      '<span>留痕</span>',
      '<button type="button" class="track-change-panel__close">×</button>',
      '</div>',
      '<div class="track-change-panel__list"></div>'
    ].join('')
    this.trackChangeListDom =
      this.trackChangePanelDom.querySelector<HTMLDivElement>(
        '.track-change-panel__list'
      )!

    this.trackChangeLinkLayerDom = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    )
    this.trackChangeLinkLayerDom.classList.add('track-change-link-layer')

    this.root.append(
      this.catalogDom,
      this.commentDom,
      this.trackChangePanelDom,
      this.trackChangeLinkLayerDom
    )
    this.bindEvents()
    this.syncLayout()
    this.updateTrackChangePanel()
    this.updateComment()
  }

  public getContextMenus(): IRegisterContextMenu[] {
    if (!this.isLayoutEnabled('comment') || !this.context.handlers.createComment) {
      return []
    }
    return [
      {
        key: 'appComment',
        name: '批注',
        when: payload => {
          return (
            !payload.isReadonly &&
            payload.editorHasSelection &&
            payload.zone === EditorZone.MAIN
          )
        },
        callback: async command => {
          const groupId = command.executeSetGroup()
          if (!groupId) return
          try {
            const result = await this.context.handlers.createComment?.(
              {
                id: groupId,
                rangeText: command.getRangeText()
              },
              this.context
            )
            if (result === false || result === null) {
              command.executeDeleteGroup(groupId)
              await this.updateComment()
              return
            }
            if (result && !this.context.handlers.getComments) {
              this.internalCommentList.push(result)
            }
            await this.updateComment()
          } catch (error) {
            command.executeDeleteGroup(groupId)
            this.handleError(error)
          }
        }
      }
    ]
  }

  public dispose() {
    this.disposers.forEach(dispose => dispose())
    this.disposers = []
    if (this.trackChangeLinkFrame !== null) {
      window.cancelAnimationFrame(this.trackChangeLinkFrame)
      this.trackChangeLinkFrame = null
    }
  }

  public syncLayout() {
    this.catalogDom.hidden = !this.isLayoutEnabled('catalog')
    this.commentDom.hidden = !this.isLayoutEnabled('comment')
    this.trackChangePanelDom.hidden = !this.isLayoutEnabled('trackChange')
    this.trackChangeLinkLayerDom.toggleAttribute(
      'hidden',
      !this.isLayoutEnabled('comment') && !this.isLayoutEnabled('trackChange')
    )
    if (this.catalogDom.hidden) {
      this.catalogDom.classList.remove('is-visible')
    }
    if (this.trackChangePanelDom.hidden) {
      this.trackChangePanelDom.classList.remove('is-visible')
    }
    this.scheduleReviewLinksRender()
  }

  public toggleCatalog() {
    if (!this.isLayoutEnabled('catalog')) return
    const nextVisible = !this.catalogDom.classList.contains('is-visible')
    this.catalogDom.classList.toggle('is-visible', nextVisible)
    if (nextVisible) {
      this.renderCatalog()
    }
  }

  public setTrackChangePanelVisible(visible?: boolean) {
    if (!this.isLayoutEnabled('trackChange')) return
    const nextVisible =
      visible ?? !this.trackChangePanelDom.classList.contains('is-visible')
    this.trackChangePanelDom.classList.toggle('is-visible', nextVisible)
    this.isTrackChangePanelManuallyClosed = !nextVisible
    this.updateTrackChangePanel()
    this.scheduleReviewLinksRender(nextVisible ? undefined : [])
  }

  public handleContentChange() {
    window.requestAnimationFrame(() => {
      this.updateComment()
      this.updateTrackChangePanel()
      if (this.catalogDom.classList.contains('is-visible')) {
        this.renderCatalog()
      }
    })
  }

  public scheduleReviewLinksRender(recordList?: TrackChangeRecord[]) {
    if (this.trackChangeLinkFrame !== null) {
      window.cancelAnimationFrame(this.trackChangeLinkFrame)
    }
    this.trackChangeLinkFrame = window.requestAnimationFrame(() => {
      this.trackChangeLinkFrame = null
      this.renderReviewLinks(
        recordList || this.context.editor.command.getTrackChangeList()
      )
    })
  }

  public syncActiveComment(payload: IRangeStyle) {
    const [activeGroupId] = payload.groupIds || []
    this.setActiveComment(activeGroupId)
  }

  private setActiveComment(activeGroupId?: string) {
    this.commentDom
      .querySelectorAll<HTMLDivElement>('.comment-item')
      .forEach(commentItemDom => {
        commentItemDom.classList.remove('active')
      })
    if (!activeGroupId) {
      this.scheduleReviewLinksRender()
      return
    }
    const activeCommentDom = this.commentDom.querySelector<HTMLDivElement>(
      `.comment-item[data-id='${activeGroupId}']`
    )
    activeCommentDom?.classList.add('active')
    this.scheduleReviewLinksRender()
  }

  public async updateComment() {
    if (!this.isLayoutEnabled('comment')) {
      this.commentDom.innerHTML = ''
      this.scheduleReviewLinksRender()
      return
    }
    const groupIds = await this.context.editor.command.getGroupIds()
    const commentList = await this.getCommentList()
    const visibleCommentIdSet = new Set(
      commentList
        .filter(comment => groupIds.includes(comment.id))
        .map(comment => comment.id)
    )
    this.commentDom
      .querySelectorAll<HTMLDivElement>('.comment-item')
      .forEach(commentItemDom => {
        const commentId = commentItemDom.dataset.id
        if (!commentId || !visibleCommentIdSet.has(commentId)) {
          commentItemDom.remove()
        }
      })
    commentList.forEach(comment => {
      if (!visibleCommentIdSet.has(comment.id)) return
      this.upsertCommentCard(comment)
    })
    this.scheduleReviewLinksRender()
  }

  public updateTrackChangePanel() {
    if (!this.isLayoutEnabled('trackChange')) {
      this.trackChangeListDom.innerHTML = ''
      this.scheduleReviewLinksRender([])
      return
    }
    const recordList = this.context.editor.command.getTrackChangeList()
    if (recordList.length && !this.isTrackChangePanelManuallyClosed) {
      this.trackChangePanelDom.classList.add('is-visible')
    }
    this.trackChangeListDom.innerHTML = ''
    if (!recordList.length) {
      const emptyDom = document.createElement('div')
      emptyDom.className = 'track-change-panel__empty'
      emptyDom.innerText = '暂无修订'
      this.trackChangeListDom.append(emptyDom)
      this.scheduleReviewLinksRender(recordList)
      return
    }
    recordList.forEach(record => {
      const cardDom = document.createElement('div')
      cardDom.className = 'track-change-card'
      cardDom.dataset.id = record.id

      const headerDom = document.createElement('div')
      headerDom.className = 'track-change-card__header'
      const authorDom = document.createElement('span')
      authorDom.className = 'track-change-card__author'
      authorDom.innerText =
        record.author ||
        this.context.handlers.getTrackChangeAuthor?.(this.context) ||
        this.context.editor.command.getOptions().trackChange.author ||
        '未知'
      const timeDom = document.createElement('span')
      timeDom.className = 'track-change-card__time'
      timeDom.innerText = this.formatTrackChangeTime(record.timestamp)
      const actionsDom = document.createElement('div')
      actionsDom.className = 'track-change-card__actions'

      const acceptDom = document.createElement('button')
      acceptDom.type = 'button'
      acceptDom.className = 'track-change-card__accept'
      acceptDom.title = '接受修订'
      acceptDom.innerText = '✓'
      acceptDom.onclick = evt => {
        evt.stopPropagation()
        this.context.editor.command.executeAcceptTrackChange(record.id)
        this.updateTrackChangePanel()
      }

      const rejectDom = document.createElement('button')
      rejectDom.type = 'button'
      rejectDom.className = 'track-change-card__reject'
      rejectDom.title = '拒绝修订'
      rejectDom.innerText = '×'
      rejectDom.onclick = evt => {
        evt.stopPropagation()
        this.context.editor.command.executeRejectTrackChange(record.id)
        this.updateTrackChangePanel()
      }
      actionsDom.append(acceptDom, rejectDom)
      headerDom.append(authorDom, timeDom, actionsDom)

      const contentDom = document.createElement('div')
      contentDom.className = 'track-change-card__content'
      const actionText = record.type === 'delete' ? '删除' : '插入'
      contentDom.innerText = `${actionText}: ${
        this.getTrackChangeText(record.elementList) || '空内容'
      }`
      cardDom.append(headerDom, contentDom)
      this.trackChangeListDom.append(cardDom)
    })
    this.scheduleReviewLinksRender(recordList)
  }

  public async renderCatalog() {
    if (!this.isLayoutEnabled('catalog')) return
    const catalog = await this.context.editor.command.getCatalog()
    this.catalogMainDom.innerHTML = ''
    if (!catalog) return
    const appendCatalog = (
      parent: HTMLElement,
      catalogItems: AppCatalogItem[]
    ) => {
      catalogItems.forEach(catalogItem => {
        const catalogItemDom = document.createElement('div')
        catalogItemDom.className = 'catalog-item'
        const contentDom = document.createElement('div')
        contentDom.className = 'catalog-item__content'
        const labelDom = document.createElement('span')
        labelDom.innerText = catalogItem.name
        contentDom.append(labelDom)
        contentDom.onclick = () => {
          this.context.editor.command.executeLocationCatalog(catalogItem.id)
        }
        catalogItemDom.append(contentDom)
        if (catalogItem.subCatalog?.length) {
          appendCatalog(catalogItemDom, catalogItem.subCatalog)
        }
        parent.append(catalogItemDom)
      })
    }
    appendCatalog(this.catalogMainDom, catalog as AppCatalogItem[])
  }

  private bindEvents() {
    const trackChangeCloseDom =
      this.trackChangePanelDom.querySelector<HTMLButtonElement>(
        '.track-change-panel__close'
      )!
    trackChangeCloseDom.onclick = () => this.setTrackChangePanelVisible(false)
    this.catalogDom
      .querySelector('.catalog__header__close')!
      .addEventListener('click', () => this.toggleCatalog())

    const schedule = () => this.scheduleReviewLinksRender()
    this.editorHost.addEventListener('scroll', schedule)
    window.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)
    this.disposers.push(() => {
      this.editorHost.removeEventListener('scroll', schedule)
      window.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
    })
  }

  private isLayoutEnabled(
    key: 'catalog' | 'comment' | 'trackChange'
  ): boolean {
    return this.getOptions().ui?.layout?.[key] !== false
  }

  private handleError(error: unknown) {
    if (this.context.handlers.onError) {
      this.context.handlers.onError(error, this.context)
      return
    }
    throw error
  }

  private async getCommentList() {
    const commentList = await this.context.handlers.getComments?.(this.context)
    return commentList || this.internalCommentList
  }

  private upsertCommentCard(comment: CanvasEditorAppComment) {
    const existingDom = this.commentDom.querySelector<HTMLDivElement>(
      `.comment-item[data-id='${comment.id}']`
    )
    const commentItemDom = existingDom || document.createElement('div')
    commentItemDom.className = 'comment-item'
    commentItemDom.dataset.id = comment.id
    commentItemDom.onclick = () => {
      this.context.editor.command.executeLocationGroup(comment.id)
      this.setActiveComment(comment.id)
    }
    commentItemDom.innerHTML = ''

    const titleDom = document.createElement('div')
    titleDom.className = 'comment-item__title'
    titleDom.append(document.createElement('span'))
    const titleTextDom = document.createElement('span')
    titleTextDom.innerText = comment.rangeText || ''
    titleDom.append(titleTextDom)

    const closeDom = document.createElement('i')
    closeDom.onclick = async evt => {
      evt.stopPropagation()
      this.context.editor.command.executeDeleteGroup(comment.id)
      await this.context.handlers.deleteComment?.(comment.id, this.context)
      await this.updateComment()
    }
    titleDom.append(closeDom)

    const infoDom = document.createElement('div')
    infoDom.className = 'comment-item__info'
    const userNameDom = document.createElement('span')
    userNameDom.innerText = comment.userName || ''
    const createdDateDom = document.createElement('span')
    createdDateDom.innerText = comment.createdDate || ''
    infoDom.append(userNameDom, createdDateDom)

    const contentDom = document.createElement('div')
    contentDom.className = 'comment-item__content'
    contentDom.innerText = comment.content
    commentItemDom.append(titleDom, infoDom, contentDom)

    if (!existingDom) {
      this.commentDom.append(commentItemDom)
    }
  }

  private renderReviewLinks(recordList: TrackChangeRecord[]) {
    this.trackChangeLinkLayerDom.innerHTML = ''
    const isTrackChangePanelVisible =
      this.isLayoutEnabled('trackChange') &&
      this.trackChangePanelDom.classList.contains('is-visible')
    const hasComment =
      this.isLayoutEnabled('comment') &&
      !!this.commentDom.querySelector('.comment-item')
    this.trackChangeLinkLayerDom.classList.toggle(
      'is-visible',
      hasComment || (isTrackChangePanelVisible && !!recordList.length)
    )
    this.trackChangePanelDom
      .querySelectorAll<HTMLDivElement>('.track-change-card')
      .forEach(cardDom => {
        cardDom.style.display = isTrackChangePanelVisible ? 'block' : 'none'
      })
    if (!hasComment && (!isTrackChangePanelVisible || !recordList.length)) return
    this.positionReviewCards(recordList)
    if (isTrackChangePanelVisible) {
      recordList.forEach(record => {
        const cardDom = this.trackChangeListDom.querySelector<HTMLDivElement>(
          `.track-change-card[data-id='${record.id}']`
        )
        if (!cardDom || cardDom.style.display === 'none') return
        const anchor = this.getVisibleReviewAnchor(record.rectList || [])
        if (!anchor) return
        const pathData = this.createReviewLinkPath(
          anchor.sourcePoint,
          cardDom.getBoundingClientRect()
        )
        if (!pathData) return
        this.appendReviewLinkPath(pathData)
      })
    }
    this.commentDom
      .querySelectorAll<HTMLDivElement>('.comment-item')
      .forEach(cardDom => {
        if (cardDom.style.display === 'none') return
        const commentId = cardDom.dataset.id
        if (!commentId) return
        const anchor = this.getVisibleCommentAnchor(commentId)
        if (!anchor) return
        const pathData = this.createReviewLinkPath(
          anchor.sourcePoint,
          cardDom.getBoundingClientRect()
        )
        if (!pathData) return
        this.appendReviewLinkPath(pathData)
      })
  }

  private positionReviewCards(recordList: TrackChangeRecord[]) {
    const placementList: Array<{
      cardDom: HTMLDivElement
      top: number
      left: number
    }> = []
    if (this.isLayoutEnabled('trackChange')) {
      recordList.forEach(record => {
        const cardDom = this.trackChangeListDom.querySelector<HTMLDivElement>(
          `.track-change-card[data-id='${record.id}']`
        )
        if (!cardDom) return
        const anchor = this.getVisibleReviewAnchor(record.rectList || [])
        if (!anchor) {
          cardDom.style.display = 'none'
          return
        }
        cardDom.style.display = 'block'
        const { pageContainerRect, sourcePoint } = anchor
        const cardWidth = cardDom.offsetWidth || 392
        placementList.push({
          cardDom,
          top: sourcePoint.y - 18,
          left: this.getReviewCardLeft(pageContainerRect, cardWidth)
        })
      })
    }
    if (this.isLayoutEnabled('comment')) {
      this.commentDom
        .querySelectorAll<HTMLDivElement>('.comment-item')
        .forEach(cardDom => {
          const commentId = cardDom.dataset.id
          if (!commentId) return
          const anchor = this.getVisibleCommentAnchor(commentId)
          if (!anchor) {
            cardDom.style.display = 'none'
            return
          }
          cardDom.style.display = 'block'
          const { pageContainerRect, sourcePoint } = anchor
          const cardWidth = cardDom.offsetWidth || 250
          placementList.push({
            cardDom,
            top: sourcePoint.y - 18,
            left: this.getReviewCardLeft(pageContainerRect, cardWidth)
          })
        })
    }
    this.layoutReviewCards(placementList)
  }

  private layoutReviewCards(
    placementList: Array<{
      cardDom: HTMLDivElement
      top: number
      left: number
    }>
  ) {
    placementList.sort((pre, next) => pre.top - next.top)
    let nextTop = Number.NEGATIVE_INFINITY
    placementList.forEach(placement => {
      const cardHeight = placement.cardDom.offsetHeight || 66
      const stableTop = placement.top
      const minTop = 60
      const maxTop = Math.max(minTop, window.innerHeight - cardHeight - 12)
      const top = Math.min(Math.max(stableTop, nextTop, minTop), maxTop)
      placement.cardDom.style.top = `${top}px`
      placement.cardDom.style.left = `${placement.left}px`
      nextTop = top + cardHeight + 10
    })
  }

  private getVisibleCommentAnchor(commentId: string) {
    return this.getVisibleReviewAnchor(
      this.context.editor.command.getGroupRectList(commentId)
    )
  }

  private getVisibleReviewAnchor(rectList: ReviewRect[]) {
    const pageContainerDom =
      this.editorHost.querySelector<HTMLDivElement>('.ce-page-container')
    if (!pageContainerDom || !rectList.length) return null
    const pageContainerRect = pageContainerDom.getBoundingClientRect()
    const viewportTop = 60
    const viewportBottom = window.innerHeight
    const viewportCenterY = (viewportTop + viewportBottom) / 2
    let matchedRect: ReviewRect | null = null
    let matchedDistance = Number.POSITIVE_INFINITY
    for (const rect of rectList) {
      const rectCenterY = pageContainerRect.top + rect.y + rect.height / 2
      const rectTop = pageContainerRect.top + rect.y
      const rectBottom = rectTop + rect.height
      if (rectBottom < viewportTop || rectTop > viewportBottom) continue
      const distance = Math.abs(rectCenterY - viewportCenterY)
      if (distance < matchedDistance) {
        matchedRect = rect
        matchedDistance = distance
      }
    }
    if (!matchedRect) return null
    return {
      pageContainerRect,
      sourcePoint: {
        x: pageContainerRect.left + matchedRect.x + matchedRect.width,
        y: pageContainerRect.top + matchedRect.y + matchedRect.height / 2
      }
    }
  }

  private createReviewLinkPath(
    sourcePoint: { x: number; y: number },
    cardRect: DOMRect
  ) {
    const cardIsLeftOfSource = cardRect.right <= sourcePoint.x
    const targetPoint = {
      x: cardIsLeftOfSource ? cardRect.right : cardRect.left,
      y: cardRect.top + Math.min(24, Math.max(14, cardRect.height / 2))
    }
    if (
      sourcePoint.x < 0 ||
      sourcePoint.y < 0 ||
      sourcePoint.y > window.innerHeight
    ) {
      return null
    }
    const horizontalDistance = targetPoint.x - sourcePoint.x
    const controlX =
      sourcePoint.x +
      Math.sign(horizontalDistance || 1) *
        Math.max(40, Math.abs(horizontalDistance) * 0.55)
    return [
      `M ${sourcePoint.x} ${sourcePoint.y}`,
      `C ${controlX} ${sourcePoint.y},`,
      `${controlX} ${targetPoint.y},`,
      `${targetPoint.x} ${targetPoint.y}`
    ].join(' ')
  }

  private appendReviewLinkPath(pathData: string) {
    const pathDom = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'path'
    )
    pathDom.setAttribute('d', pathData)
    this.trackChangeLinkLayerDom.append(pathDom)
  }

  private getReviewCardLeft(pageContainerRect: DOMRect, cardWidth: number) {
    const pageRight = pageContainerRect.left + pageContainerRect.width
    const viewportGap = window.innerWidth <= 600 ? 8 : 12
    const maxLeft = Math.max(viewportGap, window.innerWidth - cardWidth - viewportGap)
    return Math.min(Math.max(pageRight + 24, viewportGap), maxLeft)
  }

  private formatTrackChangeTime(timestamp: number) {
    const date = new Date(timestamp)
    const pad = (value: number) => `${value}`.padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  private getTrackChangeText(elementList: IElement[]) {
    return elementList
      .map(element => {
        if (element.type === ElementType.TABLE) return '表格'
        if (element.type === ElementType.IMAGE) return '图片'
        if (element.value === '\u200B') return ''
        return element.value || ''
      })
      .join('')
      .replace(/\n/g, '↵')
      .trim()
  }
}
