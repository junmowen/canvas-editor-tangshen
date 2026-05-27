import { Editor, ElementType, IElement } from '../editor'

export function setupTrackChange(instance: Editor, container: HTMLDivElement) {
  const trackChangeDom = document.querySelector<HTMLDivElement>(
    '.menu-item__track-change'
  )!
  const trackChangeOptionDom =
    trackChangeDom.querySelector<HTMLDivElement>('.options')!
  const trackChangePanelDom = document.querySelector<HTMLDivElement>(
    '.track-change-panel'
  )!
  const trackChangeLinkLayerDom = document.querySelector<SVGSVGElement>(
    '.track-change-link-layer'
  )!
  const trackChangeListDom = trackChangePanelDom.querySelector<HTMLDivElement>(
    '.track-change-panel__list'
  )!
  const trackChangeCloseDom =
    trackChangePanelDom.querySelector<HTMLButtonElement>(
      '.track-change-panel__close'
    )!
  const commentDom = document.querySelector<HTMLDivElement>('.comment')!
  let isTrackChangeEnabled = !!instance.command.getOptions().trackChange.enabled
  let isTrackChangePanelManuallyClosed = false
  let trackChangeLinkFrame: number | null = null
  const trackChangeAuthor = '君莫问'
  function setTrackChangePanelVisible(visible: boolean) {
    trackChangePanelDom.classList.toggle('is-visible', visible)
    isTrackChangePanelManuallyClosed = !visible
    updateTrackChangeMenu()
    scheduleReviewLinksRender(visible ? undefined : [])
  }
  function updateTrackChangeMenu() {
    trackChangeDom.classList.toggle('active', isTrackChangeEnabled)
    const toggleDom = trackChangeOptionDom.querySelector<HTMLLIElement>(
      '[data-track-change="toggle"]'
    )!
    toggleDom.innerText = isTrackChangeEnabled ? '关闭留痕' : '开启留痕'
    const panelDom = trackChangeOptionDom.querySelector<HTMLLIElement>(
      '[data-track-change="panel"]'
    )!
    panelDom.innerText = trackChangePanelDom.classList.contains('is-visible')
      ? '关闭留痕面板'
      : '显示留痕'
  }
  function formatTrackChangeTime(timestamp: number) {
    const date = new Date(timestamp)
    const pad = (value: number) => `${value}`.padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )} ${pad(date.getHours())}:${pad(date.getMinutes())}`
  }
  function getTrackChangeText(elementList: IElement[]) {
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
  type TrackChangeRecord = ReturnType<
    typeof instance.command.getTrackChangeList
  >[number]
  type ReviewRect = TrackChangeRecord['rectList'][number]
  interface ReviewAnchor {
    pageContainerRect: DOMRect
    sourcePoint: {
      x: number
      y: number
    }
  }
  function getVisibleReviewAnchor(rectList: ReviewRect[]): ReviewAnchor | null {
    const pageContainerDom =
      container.querySelector<HTMLDivElement>('.ce-page-container')
    if (!pageContainerDom || !rectList.length) return null
    const pageContainerRect = pageContainerDom.getBoundingClientRect()
    const viewportTop = 60
    const viewportBottom = window.innerHeight
    const viewportCenterY = (viewportTop + viewportBottom) / 2
    let matchedRect: (typeof rectList)[number] | null = null
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
  function getVisibleTrackChangeAnchor(record: TrackChangeRecord) {
    return getVisibleReviewAnchor(record.rectList || [])
  }
  function getVisibleCommentAnchor(commentId: string) {
    return getVisibleReviewAnchor(instance.command.getGroupRectList(commentId))
  }
  function createReviewLinkPath(
    sourcePoint: { x: number; y: number },
    cardRect: DOMRect
  ) {
    const targetPoint = {
      x: cardRect.left,
      y: cardRect.top + Math.min(24, Math.max(14, cardRect.height / 2))
    }
    if (
      sourcePoint.x < 0 ||
      sourcePoint.y < 0 ||
      sourcePoint.y > window.innerHeight
    ) {
      return null
    }
    const controlX =
      sourcePoint.x + Math.max(80, targetPoint.x - sourcePoint.x) * 0.55
    return [
      `M ${sourcePoint.x} ${sourcePoint.y}`,
      `C ${controlX} ${sourcePoint.y},`,
      `${controlX} ${targetPoint.y},`,
      `${targetPoint.x} ${targetPoint.y}`
    ].join(' ')
  }
  function layoutReviewCards(
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
      console.log('[track-change-ui] card layout placed', {
        recordId: placement.cardDom.dataset.id || '',
        top,
        left: placement.left,
        cardHeight,
        stableTop,
        maxTop
      })
      nextTop = top + cardHeight + 10
    })
  }
  function getReviewCardLeft(pageContainerRect: DOMRect, cardWidth: number) {
    const pageRight = pageContainerRect.left + pageContainerRect.width
    return Math.min(
      Math.max(pageRight + 24, 12),
      window.innerWidth - cardWidth - 12
    )
  }
  function positionReviewCards(
    recordList: ReturnType<typeof instance.command.getTrackChangeList>
  ) {
    console.log('[track-change-ui] positionReviewCards start', {
      recordCount: recordList.length,
      visiblePanel: trackChangePanelDom.classList.contains('is-visible'),
      commentCount: commentDom.querySelectorAll('.comment-item').length
    })
    const placementList: Array<{
      cardDom: HTMLDivElement
      top: number
      left: number
    }> = []
    recordList.forEach(record => {
      const cardDom = trackChangeListDom.querySelector<HTMLDivElement>(
        `.track-change-card[data-id='${record.id}']`
      )
      if (!cardDom) {
        console.log('[track-change-ui] card missing', {
          recordId: record.id,
          type: record.type,
          elementCount: record.elementList.length,
          rectCount: record.rectList.length
        })
        return
      }
      const anchor = getVisibleTrackChangeAnchor(record)
      console.log('[track-change-ui] card anchor resolve', {
        recordId: record.id,
        type: record.type,
        elementCount: record.elementList.length,
        rectCount: record.rectList.length,
        visibleAnchor: !!anchor
      })
      if (!anchor) {
        cardDom.style.display = 'none'
        console.log('[track-change-ui] card hidden no visible anchor', {
          recordId: record.id
        })
        return
      }
      cardDom.style.display = 'block'
      const { pageContainerRect, sourcePoint } = anchor
      const cardWidth = cardDom.offsetWidth || 392
      console.log('[track-change-ui] card placement', {
        recordId: record.id,
        sourcePoint,
        cardWidth,
        pageContainerLeft: pageContainerRect.left,
        pageContainerTop: pageContainerRect.top
      })
      placementList.push({
        cardDom,
        top: sourcePoint.y - 18,
        left: getReviewCardLeft(pageContainerRect, cardWidth)
      })
    })
    commentDom.querySelectorAll<HTMLDivElement>('.comment-item').forEach(cardDom => {
      const commentId = cardDom.dataset.id
      if (!commentId) return
      const anchor = getVisibleCommentAnchor(commentId)
      if (!anchor) {
        cardDom.style.display = 'none'
        console.log('[track-change-ui] comment hidden no visible anchor', {
          commentId
        })
        return
      }
      cardDom.style.display = 'block'
      const { pageContainerRect, sourcePoint } = anchor
      const cardWidth = cardDom.offsetWidth || 250
      placementList.push({
        cardDom,
        top: sourcePoint.y - 18,
        left: getReviewCardLeft(pageContainerRect, cardWidth)
      })
    })
    layoutReviewCards(placementList)
    console.log('[track-change-ui] positionReviewCards done', {
      placementCount: placementList.length
    })
  }
  function renderReviewLinks(
    recordList: ReturnType<typeof instance.command.getTrackChangeList>
  ) {
    trackChangeLinkLayerDom.innerHTML = ''
    const isTrackChangePanelVisible =
      trackChangePanelDom.classList.contains('is-visible')
    const hasComment = !!commentDom.querySelector('.comment-item')
    trackChangeLinkLayerDom.classList.toggle(
      'is-visible',
      hasComment || (isTrackChangePanelVisible && !!recordList.length)
    )
    console.log('[track-change-ui] renderReviewLinks', {
      recordCount: recordList.length,
      isTrackChangePanelVisible,
      hasComment,
      linkLayerVisible: trackChangeLinkLayerDom.classList.contains('is-visible')
    })
    trackChangePanelDom
      .querySelectorAll<HTMLDivElement>('.track-change-card')
      .forEach(cardDom => {
        cardDom.style.display = isTrackChangePanelVisible ? 'block' : 'none'
      })
    if (!hasComment && (!isTrackChangePanelVisible || !recordList.length)) return
    positionReviewCards(recordList)
    if (isTrackChangePanelVisible) {
      recordList.forEach(record => {
        const cardDom = trackChangeListDom.querySelector<HTMLDivElement>(
          `.track-change-card[data-id='${record.id}']`
        )
        if (!cardDom || cardDom.style.display === 'none') return
        const cardRect = cardDom.getBoundingClientRect()
        const anchor = getVisibleTrackChangeAnchor(record)
        if (!anchor) return
        const sourcePoint = anchor.sourcePoint
        const pathData = createReviewLinkPath(sourcePoint, cardRect)
        if (!pathData) return
        const pathDom = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'path'
        )
        pathDom.setAttribute('d', pathData)
        trackChangeLinkLayerDom.append(pathDom)
      })
    }
    commentDom.querySelectorAll<HTMLDivElement>('.comment-item').forEach(cardDom => {
      if (cardDom.style.display === 'none') return
      const commentId = cardDom.dataset.id
      if (!commentId) return
      const anchor = getVisibleCommentAnchor(commentId)
      if (!anchor) return
      const pathData = createReviewLinkPath(
        anchor.sourcePoint,
        cardDom.getBoundingClientRect()
      )
      if (!pathData) return
      const pathDom = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path'
      )
      pathDom.setAttribute('d', pathData)
      trackChangeLinkLayerDom.append(pathDom)
    })
  }
  function scheduleReviewLinksRender(
    recordList?: ReturnType<typeof instance.command.getTrackChangeList>
  ) {
    if (trackChangeLinkFrame !== null) {
      window.cancelAnimationFrame(trackChangeLinkFrame)
    }
    trackChangeLinkFrame = window.requestAnimationFrame(() => {
      trackChangeLinkFrame = null
      renderReviewLinks(recordList || instance.command.getTrackChangeList())
    })
  }
  function updateTrackChangePanel() {
    const recordList = instance.command.getTrackChangeList()
    console.log('[track-change-ui] updateTrackChangePanel', {
      recordCount: recordList.length,
      isTrackChangeEnabled,
      panelVisible: trackChangePanelDom.classList.contains('is-visible'),
      records: recordList.map(record => ({
        id: record.id,
        type: record.type,
        elementCount: record.elementList.length,
        rectCount: record.rectList.length,
        hasTable: record.elementList.some(
          element => element.type === ElementType.TABLE
        )
      }))
    })
    if (recordList.length && !isTrackChangePanelManuallyClosed) {
      trackChangePanelDom.classList.add('is-visible')
    }
    updateTrackChangeMenu()
    trackChangeListDom.innerHTML = ''
    if (!recordList.length) {
      const emptyDom = document.createElement('div')
      emptyDom.className = 'track-change-panel__empty'
      emptyDom.innerText = '暂无修订'
      trackChangeListDom.append(emptyDom)
      scheduleReviewLinksRender(recordList)
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
      authorDom.innerText = record.author || trackChangeAuthor
      const timeDom = document.createElement('span')
      timeDom.className = 'track-change-card__time'
      timeDom.innerText = formatTrackChangeTime(record.timestamp)
      const actionsDom = document.createElement('div')
      actionsDom.className = 'track-change-card__actions'
      const acceptDom = document.createElement('button')
      acceptDom.type = 'button'
      acceptDom.className = 'track-change-card__accept'
      acceptDom.title = '接受修订'
      acceptDom.innerText = '✓'
      acceptDom.onclick = evt => {
        evt.stopPropagation()
        instance.command.executeAcceptTrackChange(record.id)
        updateTrackChangePanel()
      }
      const rejectDom = document.createElement('button')
      rejectDom.type = 'button'
      rejectDom.className = 'track-change-card__reject'
      rejectDom.title = '拒绝修订'
      rejectDom.innerText = '×'
      rejectDom.onclick = evt => {
        evt.stopPropagation()
        instance.command.executeRejectTrackChange(record.id)
        updateTrackChangePanel()
      }
      actionsDom.append(acceptDom, rejectDom)
      headerDom.append(authorDom, timeDom, actionsDom)
      const contentDom = document.createElement('div')
      contentDom.className = 'track-change-card__content'
      const actionText = record.type === 'delete' ? '删除' : '插入'
      contentDom.innerText = `${actionText}: ${getTrackChangeText(
        record.elementList
      ) || '空内容'}`
      cardDom.append(headerDom, contentDom)
      trackChangeListDom.append(cardDom)
    })
    scheduleReviewLinksRender(recordList)
  }
  trackChangeDom.onclick = function (evt) {
    const target = evt.target as HTMLElement
    if (target.closest('.options')) return
    trackChangeOptionDom.classList.toggle('visible')
  }
  trackChangeOptionDom.onclick = function (evt) {
    const li = (evt.target as HTMLElement).closest<HTMLLIElement>(
      '[data-track-change]'
    )
    if (!li) return
    const action = li.dataset.trackChange
    if (action === 'toggle') {
      isTrackChangeEnabled = !isTrackChangeEnabled
      instance.command.executeSetTrackChange({
        enabled: isTrackChangeEnabled,
        author: trackChangeAuthor
      })
      updateTrackChangeMenu()
      if (isTrackChangeEnabled) {
        isTrackChangePanelManuallyClosed = false
        trackChangePanelDom.classList.add('is-visible')
      } else {
        trackChangePanelDom.classList.remove('is-visible')
        isTrackChangePanelManuallyClosed = true
      }
      updateTrackChangePanel()
    } else if (action === 'panel') {
      setTrackChangePanelVisible(
        !trackChangePanelDom.classList.contains('is-visible')
      )
      updateTrackChangePanel()
    } else if (action === 'accept-all') {
      instance.command.executeAcceptAllTrackChange()
      updateTrackChangePanel()
    } else if (action === 'reject-all') {
      instance.command.executeRejectAllTrackChange()
      updateTrackChangePanel()
    }
    trackChangeOptionDom.classList.remove('visible')
  }
  trackChangeCloseDom.onclick = function () {
    setTrackChangePanelVisible(false)
  }
  window.addEventListener('scroll', () => scheduleReviewLinksRender(), true)
  window.addEventListener('resize', () => scheduleReviewLinksRender())
  trackChangePanelDom.addEventListener('scroll', () =>
    scheduleReviewLinksRender()
  )
  updateTrackChangeMenu()
  updateTrackChangePanel()

  return {
    updateTrackChangeMenu,
    updateTrackChangePanel,
    commentDom,
    scheduleReviewLinksRender
  }
}
