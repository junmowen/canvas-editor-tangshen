import { data, options } from './mock'
import './styles/style.css'
import { setupInsertMenus } from './menus/setupInsertMenus'
import { setupTrackChange } from './menus/setupTrackChange'
import { setupFooterOptions } from './menus/setupFooterOptions'
import { commentList } from './mock'
import {
  Editor,
  Command,
  ControlState,
  EditorZone,
  ElementType,
  IElement,
  ITabStop,
  KeyMap,
  ListStyle,
  ListType,
  PageMode,
  RowFlex,
  TextDecorationStyle,
  TitleLevel,
} from '../editor'
import { IContextMenuContext } from '../editor/interface/contextmenu/ContextMenu'
import { IControlChangeResult } from '../editor/interface/Control'
import {
  IRangeStyle
} from '../editor/interface/Listener'
import { IEditorResult } from '../editor/interface/Editor'
import { Dialog } from '../components/dialog/Dialog'
import { Signature } from './components/signature/Signature'
import { debounce, nextTick } from './utils'

window.onload = function () {
  const isApple =
    typeof navigator !== 'undefined' && /Mac OS X/.test(navigator.userAgent)

  // 1. 初始化编辑器
  const container = document.querySelector<HTMLDivElement>('.editor')!
  const instance = new Editor(
    container,
    {
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
      main: <IElement[]>data,
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
    options
  )
  console.log('实例: ', instance)
  // cypress使用
  Reflect.set(window, 'editor', instance)

  // 菜单弹窗销毁
  window.addEventListener(
    'click',
    evt => {
      const visibleDom = document.querySelector('.visible')
      if (!visibleDom || visibleDom.contains(<Node>evt.target)) return
      visibleDom.classList.remove('visible')
    },
    {
      capture: true
    }
  )

  // 2. | 撤销 | 重做 | 格式刷 | 清除格式 |
  const undoDom = document.querySelector<HTMLDivElement>('.menu-item__undo')!
  undoDom.title = `撤销(${isApple ? '⌘' : 'Ctrl'}+Z)`
  undoDom.onclick = function () {
    console.log('undo')
    instance.command.executeUndo()
  }

  const redoDom = document.querySelector<HTMLDivElement>('.menu-item__redo')!
  redoDom.title = `重做(${isApple ? '⌘' : 'Ctrl'}+Y)`
  redoDom.onclick = function () {
    console.log('redo')
    instance.command.executeRedo()
  }

  const painterDom = document.querySelector<HTMLDivElement>(
    '.menu-item__painter'
  )!

  let isFirstClick = true
  let painterTimeout: number
  painterDom.onclick = function () {
    if (isFirstClick) {
      isFirstClick = false
      painterTimeout = window.setTimeout(() => {
        console.log('painter-click')
        isFirstClick = true
        instance.command.executePainter({
          isDblclick: false
        })
      }, 200)
    } else {
      window.clearTimeout(painterTimeout)
    }
  }

  painterDom.ondblclick = function () {
    console.log('painter-dblclick')
    isFirstClick = true
    window.clearTimeout(painterTimeout)
    instance.command.executePainter({
      isDblclick: true
    })
  }

  document.querySelector<HTMLDivElement>('.menu-item__format')!.onclick =
    function () {
      console.log('format')
      instance.command.executeFormat()
    }

  const formatMarkerDom =
    document.querySelector<HTMLDivElement>('.menu-item__format-marker')!
  /** 同步格式标记按钮状态，空格灰点和换行符都由 lineBreak 配置控制。 */
  const syncFormatMarkerState = () => {
    formatMarkerDom.classList.toggle(
      'active',
      !instance.command.getOptions().lineBreak.disabled
    )
  }
  syncFormatMarkerState()
  formatMarkerDom.onclick = function () {
    const options = instance.command.getOptions()
    const nextDisabled = !options.lineBreak.disabled
    instance.command.executeUpdateOptions({
      lineBreak: {
        ...options.lineBreak,
        disabled: nextDisabled
      }
    })
    syncFormatMarkerState()
  }

  // 3. | 字体 | 字体变大 | 字体变小 | 加粗 | 斜体 | 下划线 | 删除线 | 上标 | 下标 | 字体颜色 | 背景色 |
  const fontDom = document.querySelector<HTMLDivElement>('.menu-item__font')!
  const fontSelectDom = fontDom.querySelector<HTMLDivElement>('.select')!
  const fontOptionDom = fontDom.querySelector<HTMLDivElement>('.options')!
  fontDom.onclick = function () {
    console.log('font')
    fontOptionDom.classList.toggle('visible')
  }
  fontOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeFont(li.dataset.family!)
  }

  const sizeSetDom = document.querySelector<HTMLDivElement>('.menu-item__size')!
  const sizeSelectDom = sizeSetDom.querySelector<HTMLDivElement>('.select')!
  const sizeOptionDom = sizeSetDom.querySelector<HTMLDivElement>('.options')!
  let currentRangeSize = 16
  sizeSetDom.title = `设置字号`
  sizeSetDom.onclick = function () {
    console.log('size')
    sizeOptionDom.classList.toggle('visible')
  }
  sizeOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeSize(Number(li.dataset.size!))
  }

  const sizeAddDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-add'
  )!
  sizeAddDom.title = `增大字号(${isApple ? '⌘' : 'Ctrl'}+[)`
  sizeAddDom.onclick = function () {
    console.log('size-add')
    instance.command.executeSizeAdd()
  }

  const sizeMinusDom = document.querySelector<HTMLDivElement>(
    '.menu-item__size-minus'
  )!
  sizeMinusDom.title = `减小字号(${isApple ? '⌘' : 'Ctrl'}+])`
  sizeMinusDom.onclick = function () {
    console.log('size-minus')
    instance.command.executeSizeMinus()
  }

  const boldDom = document.querySelector<HTMLDivElement>('.menu-item__bold')!
  boldDom.title = `加粗(${isApple ? '⌘' : 'Ctrl'}+B)`
  boldDom.onclick = function () {
    console.log('bold')
    instance.command.executeBold()
  }

  const italicDom =
    document.querySelector<HTMLDivElement>('.menu-item__italic')!
  italicDom.title = `斜体(${isApple ? '⌘' : 'Ctrl'}+I)`
  italicDom.onclick = function () {
    console.log('italic')
    instance.command.executeItalic()
  }

  const underlineDom = document.querySelector<HTMLDivElement>(
    '.menu-item__underline'
  )!
  underlineDom.title = `下划线(${isApple ? '⌘' : 'Ctrl'}+U)`
  const underlineOptionDom =
    underlineDom.querySelector<HTMLDivElement>('.options')!
  underlineDom.querySelector<HTMLSpanElement>('.select')!.onclick =
    function () {
      underlineOptionDom.classList.toggle('visible')
    }
  underlineDom.querySelector<HTMLElement>('i')!.onclick = function () {
    console.log('underline')
    instance.command.executeUnderline()
    underlineOptionDom.classList.remove('visible')
  }
  underlineDom.querySelector<HTMLUListElement>('ul')!.onmousedown = function (
    evt
  ) {
    const li = evt.target as HTMLLIElement
    const decorationStyle = <TextDecorationStyle>li.dataset.decorationStyle
    instance.command.executeUnderline({
      style: decorationStyle
    })
    underlineOptionDom.classList.remove('visible')
  }

  const strikeoutDom = document.querySelector<HTMLDivElement>(
    '.menu-item__strikeout'
  )!
  strikeoutDom.onclick = function () {
    console.log('strikeout')
    instance.command.executeStrikeout()
  }

  const superscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__superscript'
  )!
  superscriptDom.title = `上标(${isApple ? '⌘' : 'Ctrl'}+Shift+,)`
  superscriptDom.onclick = function () {
    console.log('superscript')
    instance.command.executeSuperscript()
  }

  const subscriptDom = document.querySelector<HTMLDivElement>(
    '.menu-item__subscript'
  )!
  subscriptDom.title = `下标(${isApple ? '⌘' : 'Ctrl'}+Shift+.)`
  subscriptDom.onclick = function () {
    console.log('subscript')
    instance.command.executeSubscript()
  }

  const colorControlDom = document.querySelector<HTMLInputElement>('#color')!
  colorControlDom.oninput = function () {
    instance.command.executeColor(colorControlDom.value)
  }
  const colorDom = document.querySelector<HTMLDivElement>('.menu-item__color')!
  const colorSpanDom = colorDom.querySelector('span')!
  colorDom.onclick = function () {
    console.log('color')
    colorControlDom.click()
  }

  const highlightControlDom =
    document.querySelector<HTMLInputElement>('#highlight')!
  highlightControlDom.oninput = function () {
    instance.command.executeHighlight(highlightControlDom.value)
  }
  const highlightDom = document.querySelector<HTMLDivElement>(
    '.menu-item__highlight'
  )!
  const highlightSpanDom = highlightDom.querySelector('span')!
  highlightDom.onclick = function () {
    console.log('highlight')
    highlightControlDom?.click()
  }

  const titleDom = document.querySelector<HTMLDivElement>('.menu-item__title')!
  const titleSelectDom = titleDom.querySelector<HTMLDivElement>('.select')!
  const titleOptionDom = titleDom.querySelector<HTMLDivElement>('.options')!
  titleOptionDom.querySelectorAll('li').forEach((li, index) => {
    li.title = `Ctrl+${isApple ? 'Option' : 'Alt'}+${index}`
  })

  titleDom.onclick = function () {
    console.log('title')
    titleOptionDom.classList.toggle('visible')
  }
  titleOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const level = <TitleLevel>li.dataset.level
    instance.command.executeTitle(level || null)
  }

  const leftDom = document.querySelector<HTMLDivElement>('.menu-item__left')!
  leftDom.title = `左对齐(${isApple ? '⌘' : 'Ctrl'}+L)`
  leftDom.onclick = function () {
    console.log('left')
    instance.command.executeRowFlex(RowFlex.LEFT)
  }

  const centerDom =
    document.querySelector<HTMLDivElement>('.menu-item__center')!
  centerDom.title = `居中对齐(${isApple ? '⌘' : 'Ctrl'}+E)`
  centerDom.onclick = function () {
    console.log('center')
    instance.command.executeRowFlex(RowFlex.CENTER)
  }

  const rightDom = document.querySelector<HTMLDivElement>('.menu-item__right')!
  rightDom.title = `右对齐(${isApple ? '⌘' : 'Ctrl'}+R)`
  rightDom.onclick = function () {
    console.log('right')
    instance.command.executeRowFlex(RowFlex.RIGHT)
  }

  const alignmentDom = document.querySelector<HTMLDivElement>(
    '.menu-item__alignment'
  )!
  alignmentDom.title = `两端对齐(${isApple ? '⌘' : 'Ctrl'}+J)`
  alignmentDom.onclick = function () {
    console.log('alignment')
    instance.command.executeRowFlex(RowFlex.ALIGNMENT)
  }

  const justifyDom = document.querySelector<HTMLDivElement>(
    '.menu-item__justify'
  )!
  justifyDom.title = `分散对齐(${isApple ? '⌘' : 'Ctrl'}+Shift+J)`
  justifyDom.onclick = function () {
    console.log('justify')
    instance.command.executeRowFlex(RowFlex.JUSTIFY)
  }

  const rowMarginDom = document.querySelector<HTMLDivElement>(
    '.menu-item__row-margin'
  )!
  const rowOptionDom = rowMarginDom.querySelector<HTMLDivElement>('.options')!
  rowMarginDom.onclick = function () {
    console.log('row-margin')
    rowOptionDom.classList.toggle('visible')
  }
  rowOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    instance.command.executeRowMargin(Number(li.dataset.rowmargin!))
  }

  const rowIndentDom =
    document.querySelector<HTMLDivElement>('.menu-item__row-indent')!
  const rowIndentOptionDom =
    rowIndentDom.querySelector<HTMLDivElement>('.options')!
  const rowIndentLeftInput = rowIndentDom.querySelector<HTMLInputElement>(
    '.row-indent-left-input'
  )!
  const rowIndentRightInput = rowIndentDom.querySelector<HTMLInputElement>(
    '.row-indent-right-input'
  )!
  const rowIndentInput = rowIndentDom.querySelector<HTMLInputElement>(
    '.row-indent-input'
  )!
  const rowHangingIndentInput = rowIndentDom.querySelector<HTMLInputElement>(
    '.row-hanging-indent-input'
  )!
  const rowIndentApplyDom = rowIndentDom.querySelector<HTMLButtonElement>(
    '.row-indent-apply'
  )!
  const toIndentChars = (value?: number | null) => {
    if (!value || !currentRangeSize) return ''
    return `${Number((value / currentRangeSize).toFixed(2))}`
  }
  const parseIndentChars = (input: string) => {
    const value = Number(input)
    if (!Number.isFinite(value) || value <= 0) return null
    return Math.round(value * currentRangeSize)
  }
  rowIndentDom.onclick = function (evt) {
    const target = evt.target as HTMLElement
    if (target.closest('.options')) return
    rowIndentOptionDom.classList.toggle('visible')
  }
  rowIndentOptionDom.onmousedown = function (evt) {
    const target = evt.target as HTMLElement
    if (target.closest('input') || target.closest('button')) {
      evt.stopPropagation()
      return
    }
    const li = target.closest('li')
    if (!li?.dataset.rowindent && !li?.dataset.rowindentChars) return
    evt.preventDefault()
    const rowIndent =
      li.dataset.rowindentChars !== undefined
        ? parseIndentChars(li.dataset.rowindentChars)
        : Number(li.dataset.rowindent)
    instance.command.executeRowIndent(rowIndent)
    rowIndentOptionDom.classList.remove('visible')
  }
  rowIndentApplyDom.onclick = function (evt) {
    evt.preventDefault()
    evt.stopPropagation()
    instance.command.executeRowIndent({
      left: parseIndentChars(rowIndentLeftInput.value),
      right: parseIndentChars(rowIndentRightInput.value),
      firstLine: parseIndentChars(rowIndentInput.value),
      hanging: parseIndentChars(rowHangingIndentInput.value)
    })
    rowIndentOptionDom.classList.remove('visible')
  }

  const tabStopsDom =
    document.querySelector<HTMLDivElement>('.menu-item__tab-stops')!
  const tabStopsOptionDom =
    tabStopsDom.querySelector<HTMLDivElement>('.options')!
  const tabStopsRulerTrackDom = tabStopsDom.querySelector<HTMLDivElement>(
    '.tab-stops-ruler__track'
  )!
  const TAB_STOPS_RULER_MAX_POSITION = 240
  const TAB_STOPS_RULER_DUPLICATE_DISTANCE = 4
  let currentTabStops: ITabStop[] = []

  /** 归一化制表位列表，保证 demo 菜单和命令 API 使用同一份排序规则。 */
  const normalizeMenuTabStops = (tabStops: ITabStop[]) => {
    return tabStops
      .filter(tabStop => Number.isFinite(tabStop.position) && tabStop.position >= 0)
      .map(tabStop => ({
        position: tabStop.position,
        alignment: tabStop.alignment || 'left'
      }))
      .sort((a, b) => a.position - b.position)
  }

  /** 把当前段落制表位格式化成自定义弹窗中的多行文本。 */
  const formatTabStopsText = (tabStops: ITabStop[]) => {
    return normalizeMenuTabStops(tabStops)
      .map(tabStop => `${tabStop.position}:${tabStop.alignment || 'left'}`)
      .join('\n')
  }

  /** 解析自定义弹窗输入，格式为 position:alignment，一行一个制表位。 */
  const parseTabStopsText = (value: string): ITabStop[] => {
    return normalizeMenuTabStops(
      value
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => {
          const [positionText, alignmentText = 'left'] = line.split(':')
          const alignment = alignmentText.trim()
          return {
            position: Number(positionText),
            alignment: ['left', 'right', 'center', 'decimal', 'bar'].includes(
              alignment
            )
              ? (alignment as ITabStop['alignment'])
              : 'left'
          }
        })
    )
  }

  /** 同步顶部制表位菜单回显，当前段落有制表位时按钮高亮并标记匹配快捷项。 */
  const syncTabStopsMenu = (tabStops: ITabStop[] | null | undefined) => {
    currentTabStops = normalizeMenuTabStops(tabStops || [])
    tabStopsDom.classList.toggle('active', currentTabStops.length > 0)
    renderTabStopsRulerHandles()
    tabStopsOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    if (currentTabStops.length !== 1 || currentTabStops[0].position !== 120) {
      return
    }
    const alignment = currentTabStops[0].alignment || 'left'
    tabStopsOptionDom
      .querySelector<HTMLLIElement>(`[data-tab-stop-preset='${alignment}']`)
      ?.classList.add('active')
  }

  /** 根据当前制表位列表重绘所有标尺手柄。 */
  const renderTabStopsRulerHandles = () => {
    tabStopsRulerTrackDom
      .querySelectorAll('.tab-stops-ruler__handle')
      .forEach(handle => handle.remove())
    const trackWidth = tabStopsRulerTrackDom.clientWidth || 1
    currentTabStops.forEach((tabStop, index) => {
      const handle = document.createElement('span')
      handle.className = 'tab-stops-ruler__handle'
      handle.dataset.tabStopIndex = `${index}`
      handle.title = '拖动调整，双击删除'
      handle.style.left = `${resolveRulerHandleLeft(tabStop.position, trackWidth)}px`
      tabStopsRulerTrackDom.append(handle)
    })
  }

  /** 把制表位位置换算成标尺手柄 left 坐标。 */
  const resolveRulerHandleLeft = (position: number, trackWidth: number) => {
    return (
      (Math.min(position, TAB_STOPS_RULER_MAX_POSITION) /
        TAB_STOPS_RULER_MAX_POSITION) *
      trackWidth
    )
  }

  /** 把标尺上的鼠标位置转换为文档制表位位置。 */
  const resolveTabStopPositionFromRulerEvent = (evt: MouseEvent) => {
    const rect = tabStopsRulerTrackDom.getBoundingClientRect()
    const offset = Math.min(Math.max(evt.clientX - rect.left, 0), rect.width)
    return Math.round((offset / Math.max(rect.width, 1)) * TAB_STOPS_RULER_MAX_POSITION)
  }

  /** 写入标尺上的制表位列表并刷新回显。 */
  const applyRulerTabStops = (tabStops: ITabStop[]) => {
    const nextTabStops = normalizeMenuTabStops(tabStops)
    instance.command.executeSetTabStops(nextTabStops)
    syncTabStopsMenu(nextTabStops)
  }

  /** 应用标尺产生的制表位位置：命中旧手柄则移动，否则新增。 */
  const applyRulerTabStopPosition = (position: number, targetIndex?: number) => {
    const nextTabStops = currentTabStops.slice()
    if (targetIndex !== undefined && nextTabStops[targetIndex]) {
      nextTabStops[targetIndex] = {
        ...nextTabStops[targetIndex],
        position
      }
      applyRulerTabStops(nextTabStops)
      return
    }
    const nearestIndex = nextTabStops.findIndex(
      tabStop => Math.abs(tabStop.position - position) <= TAB_STOPS_RULER_DUPLICATE_DISTANCE
    )
    if (nearestIndex >= 0) {
      nextTabStops[nearestIndex] = {
        ...nextTabStops[nearestIndex],
        position
      }
    } else {
      nextTabStops.push({
        position,
        alignment: currentTabStops[0]?.alignment || 'left'
      })
    }
    applyRulerTabStops(nextTabStops)
  }

  /** 启动标尺拖拽配置，只允许拖动已有手柄，空白区域由 click 负责新增。 */
  const startTabStopsRulerDrag = (evt: MouseEvent) => {
    const target = evt.target as HTMLElement
    const handle = target.closest<HTMLElement>('.tab-stops-ruler__handle')
    if (!handle) return
    const handleIndex = Number(handle.dataset.tabStopIndex)
    let hasMoved = false
    const onMouseMove = (moveEvt: MouseEvent) => {
      hasMoved = true
      applyRulerTabStopPosition(
        resolveTabStopPositionFromRulerEvent(moveEvt),
        handleIndex
      )
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      // 未移动时保留普通点击/双击语义，避免按下手柄就重绘导致双击删除丢失目标。
      if (!hasMoved) return
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  /** 打开制表位自定义配置弹窗，支持批量输入多个制表位。 */
  const openTabStopsDialog = () => {
    new Dialog({
      title: '制表位',
      data: [
        {
          type: 'textarea',
          label: '制表位',
          name: 'tabStops',
          width: 300,
          height: 120,
          value: formatTabStopsText(currentTabStops),
          placeholder: '每行一个，例如：120:left'
        }
      ],
      onConfirm: payload => {
        const text = String(
          payload.find(item => item.name === 'tabStops')?.value || ''
        )
        const tabStops = parseTabStopsText(text)
        instance.command.executeSetTabStops(tabStops.length ? tabStops : null)
        syncTabStopsMenu(tabStops)
      }
    })
  }

  tabStopsDom.onclick = function (evt) {
    const target = evt.target as HTMLElement
    if (target.closest('.options')) return
    tabStopsOptionDom.classList.toggle('visible')
    renderTabStopsRulerHandles()
  }
  tabStopsRulerTrackDom.addEventListener('mousedown', startTabStopsRulerDrag)
  tabStopsRulerTrackDom.addEventListener('click', evt => {
    evt.preventDefault()
    evt.stopPropagation()
    const handle = (evt.target as HTMLElement).closest('.tab-stops-ruler__handle')
    if (handle) return
    applyRulerTabStopPosition(resolveTabStopPositionFromRulerEvent(evt))
  })
  tabStopsRulerTrackDom.addEventListener('dblclick', evt => {
    evt.preventDefault()
    evt.stopPropagation()
    const handle = (evt.target as HTMLElement).closest<HTMLElement>(
      '.tab-stops-ruler__handle'
    )
    if (!handle) return
    const targetIndex = Number(handle.dataset.tabStopIndex)
    applyRulerTabStops(currentTabStops.filter((_, index) => index !== targetIndex))
  })
  tabStopsOptionDom.onclick = function (evt) {
    evt.stopPropagation()
    const li = (evt.target as HTMLElement).closest<HTMLLIElement>('li')
    const preset = li?.dataset.tabStopPreset
    if (!preset) return
    if (preset === 'custom') {
      openTabStopsDialog()
      tabStopsOptionDom.classList.remove('visible')
      return
    }
    if (preset === 'clear') {
      instance.command.executeSetTabStops(null)
      syncTabStopsMenu(null)
      tabStopsOptionDom.classList.remove('visible')
      return
    }
    const tabStops = [
      {
        position: 120,
        alignment: preset as ITabStop['alignment']
      }
    ]
    instance.command.executeSetTabStops(tabStops)
    syncTabStopsMenu(tabStops)
    tabStopsOptionDom.classList.remove('visible')
  }

  const listDom = document.querySelector<HTMLDivElement>('.menu-item__list')!
  listDom.title = `列表(${isApple ? '⌘' : 'Ctrl'}+Shift+U)`
  const listOptionDom = listDom.querySelector<HTMLDivElement>('.options')!
  listDom.onclick = function () {
    console.log('list')
    listOptionDom.classList.toggle('visible')
  }
  listOptionDom.onclick = function (evt) {
    const li = evt.target as HTMLLIElement
    const listType = <ListType>li.dataset.listType || null
    const listStyle = <ListStyle>(<unknown>li.dataset.listStyle)
    instance.command.executeList(listType, listStyle)
  }

  const { separatorDom, separatorOptionDom } = setupInsertMenus(instance)

  // 5. | 搜索&替换 | 打印 |
  const searchCollapseDom = document.querySelector<HTMLDivElement>(
    '.menu-item__search__collapse'
  )!
  const searchInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__search input'
  )!
  const replaceInputDom = document.querySelector<HTMLInputElement>(
    '.menu-item__search__collapse__replace input'
  )!
  const searchDom =
    document.querySelector<HTMLDivElement>('.menu-item__search')!
  searchDom.title = `搜索与替换(${isApple ? '⌘' : 'Ctrl'}+F)`
  const searchResultDom =
    searchCollapseDom.querySelector<HTMLLabelElement>('.search-result')!
  function setSearchResult() {
    const result = instance.command.getSearchNavigateInfo()
    if (result) {
      const { index, count } = result
      searchResultDom.innerText = `${index}/${count}`
    } else {
      searchResultDom.innerText = ''
    }
  }
  searchDom.onclick = function () {
    console.log('search')
    searchCollapseDom.style.display = 'block'
    const bodyRect = document.body.getBoundingClientRect()
    const searchRect = searchDom.getBoundingClientRect()
    const searchCollapseRect = searchCollapseDom.getBoundingClientRect()
    if (searchRect.left + searchCollapseRect.width > bodyRect.width) {
      searchCollapseDom.style.right = '0px'
      searchCollapseDom.style.left = 'unset'
    } else {
      searchCollapseDom.style.right = 'unset'
    }
    searchInputDom.focus()
  }
  searchCollapseDom.querySelector<HTMLSpanElement>('span')!.onclick =
    function () {
      searchCollapseDom.style.display = 'none'
      searchInputDom.value = ''
      replaceInputDom.value = ''
      instance.command.executeSearch(null)
      setSearchResult()
    }
  searchInputDom.oninput = function () {
    instance.command.executeSearch(searchInputDom.value || null)
    setSearchResult()
  }
  searchInputDom.onkeydown = function (evt) {
    if (evt.key === 'Enter') {
      instance.command.executeSearch(searchInputDom.value || null)
      setSearchResult()
    }
  }
  searchCollapseDom.querySelector<HTMLButtonElement>('button')!.onclick =
    function () {
      const searchValue = searchInputDom.value
      const replaceValue = replaceInputDom.value
      if (searchValue && searchValue !== replaceValue) {
        instance.command.executeReplace(replaceValue)
      }
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-left')!.onclick =
    function () {
      instance.command.executeSearchNavigatePre()
      setSearchResult()
    }
  searchCollapseDom.querySelector<HTMLDivElement>('.arrow-right')!.onclick =
    function () {
      instance.command.executeSearchNavigateNext()
      setSearchResult()
    }

  const printDom = document.querySelector<HTMLDivElement>('.menu-item__print')!
  printDom.title = `打印(${isApple ? '⌘' : 'Ctrl'}+P)`
  printDom.onclick = function () {
    console.log('print')
    instance.command.executePrint()
  }
  const docxDom = document.querySelector<HTMLDivElement>('.menu-item__docx')!
  docxDom.title = '导出DOCX'
  docxDom.onclick = function () {
    // DOCX 导出使用命令层最小 OOXML Blob，方便手动用 WPS/ONLYOFFICE 打开验证。
    const blob = instance.command.getOoxmlDocxBlob()
    const href = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = href
    downloadLink.download = `canvas-editor-${Date.now()}.docx`
    downloadLink.click()
    URL.revokeObjectURL(href)
  }

  const {
    updateTrackChangePanel,
    commentDom,
    scheduleReviewLinksRender
  } = setupTrackChange(instance, container)

  const {
    pageModeOptionsDom,
    getIsCatalogShow,
    updateCatalog,
    updateComment
  } = setupFooterOptions(instance, {
    commentDom,
    scheduleReviewLinksRender
  })

  // 8. 内部事件监听
  instance.listener.rangeStyleChange = function (payload: IRangeStyle) {
    // 控件类型
    payload.type === ElementType.SUBSCRIPT
      ? subscriptDom.classList.add('active')
      : subscriptDom.classList.remove('active')
    payload.type === ElementType.SUPERSCRIPT
      ? superscriptDom.classList.add('active')
      : superscriptDom.classList.remove('active')
    payload.type === ElementType.SEPARATOR
      ? separatorDom.classList.add('active')
      : separatorDom.classList.remove('active')
    separatorOptionDom
      .querySelectorAll('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.type === ElementType.SEPARATOR) {
      const separator = payload.dashArray.join(',') || '0,0'
      const curSeparatorDom = separatorOptionDom.querySelector<HTMLLIElement>(
        `[data-separator='${separator}']`
      )!
      if (curSeparatorDom) {
        curSeparatorDom.classList.add('active')
      }
    }

    // 富文本
    fontOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    const curFontDom = fontOptionDom.querySelector<HTMLLIElement>(
      `[data-family='${payload.font}']`
    )
    if (curFontDom) {
      fontSelectDom.innerText = curFontDom.innerText
      fontSelectDom.style.fontFamily = payload.font
      curFontDom.classList.add('active')
    }
    sizeOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    const curSizeDom = sizeOptionDom.querySelector<HTMLLIElement>(
      `[data-size='${payload.size}']`
    )
    if (curSizeDom) {
      sizeSelectDom.innerText = curSizeDom.innerText
      curSizeDom.classList.add('active')
    } else {
      sizeSelectDom.innerText = `${payload.size}`
    }
    currentRangeSize = payload.size || 16
    payload.bold
      ? boldDom.classList.add('active')
      : boldDom.classList.remove('active')
    payload.italic
      ? italicDom.classList.add('active')
      : italicDom.classList.remove('active')
    payload.underline
      ? underlineDom.classList.add('active')
      : underlineDom.classList.remove('active')
    payload.strikeout
      ? strikeoutDom.classList.add('active')
      : strikeoutDom.classList.remove('active')
    if (payload.color) {
      colorDom.classList.add('active')
      colorControlDom.value = payload.color
      colorSpanDom.style.backgroundColor = payload.color
    } else {
      colorDom.classList.remove('active')
      colorControlDom.value = '#000000'
      colorSpanDom.style.backgroundColor = '#000000'
    }
    if (payload.highlight) {
      highlightDom.classList.add('active')
      highlightControlDom.value = payload.highlight
      highlightSpanDom.style.backgroundColor = payload.highlight
    } else {
      highlightDom.classList.remove('active')
      highlightControlDom.value = '#ffff00'
      highlightSpanDom.style.backgroundColor = '#ffff00'
    }

    // 行布局
    leftDom.classList.remove('active')
    centerDom.classList.remove('active')
    rightDom.classList.remove('active')
    alignmentDom.classList.remove('active')
    justifyDom.classList.remove('active')
    if (payload.rowFlex && payload.rowFlex === 'right') {
      rightDom.classList.add('active')
    } else if (payload.rowFlex && payload.rowFlex === 'center') {
      centerDom.classList.add('active')
    } else if (payload.rowFlex && payload.rowFlex === 'alignment') {
      alignmentDom.classList.add('active')
    } else if (payload.rowFlex && payload.rowFlex === 'justify') {
      justifyDom.classList.add('active')
    } else {
      leftDom.classList.add('active')
    }

    // 行间距
    rowOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    const curRowMarginDom = rowOptionDom.querySelector<HTMLLIElement>(
      `[data-rowmargin='${payload.rowMargin}']`
    )!
    curRowMarginDom.classList.add('active')
    rowIndentLeftInput.value = toIndentChars(payload.rowIndentLeft)
    rowIndentRightInput.value = toIndentChars(payload.rowIndentRight)
    rowIndentInput.value = toIndentChars(payload.rowIndent)
    rowHangingIndentInput.value = toIndentChars(payload.rowHangingIndent)
    rowIndentOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    const activeRowIndent =
      payload.rowIndent && currentRangeSize
        ? Number((payload.rowIndent / currentRangeSize).toFixed(2))
        : 0
    const curRowIndentDom =
      rowIndentOptionDom.querySelector<HTMLLIElement>(
        `[data-rowindent='${payload.rowIndent || 0}']`
      ) ||
      rowIndentOptionDom.querySelector<HTMLLIElement>(
        `[data-rowindent-chars='${activeRowIndent}']`
      )
    curRowIndentDom?.classList.add('active')
    syncTabStopsMenu(payload.tabStops)

    // 功能
    payload.undo
      ? undoDom.classList.remove('no-allow')
      : undoDom.classList.add('no-allow')
    payload.redo
      ? redoDom.classList.remove('no-allow')
      : redoDom.classList.add('no-allow')
    payload.painter
      ? painterDom.classList.add('active')
      : painterDom.classList.remove('active')

    // 标题
    titleOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.level) {
      const curTitleDom = titleOptionDom.querySelector<HTMLLIElement>(
        `[data-level='${payload.level}']`
      )!
      titleSelectDom.innerText = curTitleDom.innerText
      curTitleDom.classList.add('active')
    } else {
      titleSelectDom.innerText = '正文'
      titleOptionDom.querySelector('li:first-child')!.classList.add('active')
    }

    // 列表
    listOptionDom
      .querySelectorAll<HTMLLIElement>('li')
      .forEach(li => li.classList.remove('active'))
    if (payload.listType) {
      listDom.classList.add('active')
      const listType = payload.listType
      const listStyle =
        payload.listType === ListType.OL ? ListStyle.DECIMAL : payload.listType
      const curListDom = listOptionDom.querySelector<HTMLLIElement>(
        `[data-list-type='${listType}'][data-list-style='${listStyle}']`
      )
      if (curListDom) {
        curListDom.classList.add('active')
      }
    } else {
      listDom.classList.remove('active')
    }

    // 批注
    commentDom
      .querySelectorAll<HTMLDivElement>('.comment-item')
      .forEach(commentItemDom => {
        commentItemDom.classList.remove('active')
      })
    if (payload.groupIds) {
      const [id] = payload.groupIds
      const activeCommentDom = commentDom.querySelector<HTMLDivElement>(
        `.comment-item[data-id='${id}']`
      )
      if (activeCommentDom) {
        activeCommentDom.classList.add('active')
        scheduleReviewLinksRender()
      }
    }

    // 行列信息
    const rangeContext = instance.command.getRangeContext()
    if (rangeContext) {
      document.querySelector<HTMLSpanElement>('.row-no')!.innerText = `${
        rangeContext.startRowNo + 1
      }`
      document.querySelector<HTMLSpanElement>('.col-no')!.innerText = `${
        rangeContext.startColNo + 1
      }`
    }
  }

  instance.listener.visiblePageNoListChange = function (payload: number[]) {
    const text = payload.map((i: number) => i + 1).join('、')
    document.querySelector<HTMLSpanElement>('.page-no-list')!.innerText = text
  }

  instance.listener.pageSizeChange = function (payload: number) {
    document.querySelector<HTMLSpanElement>(
      '.page-size'
    )!.innerText = `${payload}`
  }

  instance.listener.intersectionPageNoChange = function (payload: number) {
    document.querySelector<HTMLSpanElement>('.page-no')!.innerText = `${
      payload + 1
    }`
  }

  instance.listener.pageScaleChange = function (payload: number) {
    document.querySelector<HTMLSpanElement>(
      '.page-scale-percentage'
    )!.innerText = `${Math.floor(payload * 10 * 10)}%`
  }

  instance.listener.controlChange = function (payload: IControlChangeResult) {
    const disableMenusInControlContext = [
      'table',
      'hyperlink',
      'separator',
      'page-break'
    ]
    // 菜单操作权限
    disableMenusInControlContext.forEach(menu => {
      const menuDom = document.querySelector<HTMLDivElement>(
        `.menu-item__${menu}`
      )!
      payload.state === ControlState.ACTIVE
        ? menuDom.classList.add('disable')
        : menuDom.classList.remove('disable')
    })
  }

  instance.listener.pageModeChange = function (payload: PageMode) {
    const activeMode = pageModeOptionsDom.querySelector<HTMLLIElement>(
      `[data-page-mode='${payload}']`
    )!
    pageModeOptionsDom
      .querySelectorAll('li')
      .forEach(li => li.classList.remove('active'))
    activeMode.classList.add('active')
  }

  const handleContentChange = async function () {
    // 字数
    const wordCount = await instance.command.getWordCount()
    document.querySelector<HTMLSpanElement>('.word-count')!.innerText = `${
      wordCount || 0
    }`
    // 目录
    if (getIsCatalogShow()) {
      nextTick(() => {
        updateCatalog()
      })
    }
    // 批注
    nextTick(() => {
      updateComment()
    })
    // 留痕列表按内容变化直接刷新，避免开关状态和文档已有留痕不同步时右侧一直空白。
    nextTick(() => {
      updateTrackChangePanel()
    })
  }
  instance.listener.contentChange = debounce(handleContentChange, 200)
  handleContentChange()

  instance.listener.saved = function (payload: IEditorResult) {
    console.log('elementList: ', payload)
  }

  // 9. 右键菜单注册
  instance.register.contextMenuList([
    {
      name: '批注',
      when: (payload: IContextMenuContext) => {
        return (
          !payload.isReadonly &&
          payload.editorHasSelection &&
          payload.zone === EditorZone.MAIN
        )
      },
      callback: (command: Command) => {
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
          onConfirm: (payload: any) => {
            const value = payload.find((p: any) => p.name === 'value')?.value
            if (!value) return
            const groupId = command.executeSetGroup()
            if (!groupId) return
            commentList.push({
              id: groupId,
              content: value,
              userName: 'Hufe',
              rangeText: command.getRangeText(),
              createdDate: new Date().toLocaleString()
            })
          }
        })
      }
    },
    {
      name: '签名',
      icon: 'signature',
      when: (payload: IContextMenuContext) => {
        return !payload.isReadonly && payload.editorTextFocus
      },
      callback: (command: Command) => {
        new Signature({
          onConfirm(payload: any) {
            if (!payload) return
            const { value, width, height } = payload
            if (!value || !width || !height) return
            command.executeInsertElementList([
              {
                value,
                width,
                height,
                type: ElementType.IMAGE
              }
            ])
          }
        })
      }
    },
    {
      name: '格式整理',
      icon: 'word-tool',
      when: (payload: IContextMenuContext) => {
        return !payload.isReadonly
      },
      callback: (command: Command) => {
        command.executeWordTool()
      }
    }
  ])

  // 10. 快捷键注册
  instance.register.shortcutList([
    {
      key: KeyMap.P,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePrint()
      }
    },
    {
      key: KeyMap.F,
      mod: true,
      isGlobal: true,
      callback: (command: Command) => {
        const text = command.getRangeText()
        searchDom.click()
        if (text) {
          searchInputDom.value = text
          instance.command.executeSearch(text)
          setSearchResult()
        }
      }
    },
    {
      key: KeyMap.MINUS,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleMinus()
      }
    },
    {
      key: KeyMap.EQUAL,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleAdd()
      }
    },
    {
      key: KeyMap.ZERO,
      ctrl: true,
      isGlobal: true,
      callback: (command: Command) => {
        command.executePageScaleRecovery()
      }
    }
  ])
}
