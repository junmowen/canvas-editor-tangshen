import {
  EDITOR_COMPONENT,
  EDITOR_PREFIX
} from '../../../../../dataset/constant/Editor'
import { EditorComponent } from '../../../../../dataset/enum/Editor'
import { IElementPosition } from '../../../../../interface/Element'
import { I18n } from '../../../../extension/i18n/I18n'
import { Draw } from '../../../../draw/Draw'

/** datepicker语言包结构，约束界面文案的本地化键。 */
export interface IDatePickerLang {
  /** 当前日期或当前按钮节点，用于日期选择器快速回到今天。 */
  now: string
  /** 确认按钮文案，用于日期选择器操作区。 */
  confirm: string
  /** 返回按钮文案，用于日期选择器操作区。 */
  return: string
  /** 时间选择文案，用于日期选择器时间区域。 */
  timeSelect: string
  /** 星期文案集合，用于渲染日期选择器表头。 */
  weeks: {
    /** sun文本，用于标识、展示或匹配当前对象。 */
    sun: string
    /** mon文本，用于标识、展示或匹配当前对象。 */
    mon: string
    /** tue文本，用于标识、展示或匹配当前对象。 */
    tue: string
    /** wed文本，用于标识、展示或匹配当前对象。 */
    wed: string
    /** thu文本，用于标识、展示或匹配当前对象。 */
    thu: string
    /** fri文本，用于标识、展示或匹配当前对象。 */
    fri: string
    /** sat文本，用于标识、展示或匹配当前对象。 */
    sat: string
  }
  /** 年份值，用于日期时间控件。 */
  year: string
  /** 月份值，用于日期时间控件。 */
  month: string
  /** 小时值，用于日期时间控件。 */
  hour: string
  /** 分钟值，用于日期时间控件。 */
  minute: string
  /** 秒值，用于日期时间控件。 */
  second: string
}

/** datepicker选项，用于约束调用方可传入的可选配置。 */
export interface IDatePickerOption {
  /** 提交回调，用于把日期选择结果传回调用方。 */
  onSubmit?: (date: string) => any
}

/** datepickerdom契约，用于约束内部流程中传递的数据结构。 */
interface IDatePickerDom {
  /** 容器节点，用于挂载当前组件的 DOM 结构。 */
  container: HTMLDivElement
  /** 日期面板容器，用于承载日历主体。 */
  dateWrap: HTMLDivElement
  /** 星期标题容器，用于渲染日期选择器周栏。 */
  datePickerWeek: HTMLDivElement
  /** 时间面板容器，用于承载时间选择控件。 */
  timeWrap: HTMLUListElement
  /** 标题文本或标题容器，用于渲染面板标题。 */
  title: {
    /** 上一年按钮节点，用于切换日期选择器年份。 */
    preYear: HTMLSpanElement
    /** 上一月按钮节点，用于切换日期选择器月份。 */
    preMonth: HTMLSpanElement
    /** 当前日期或当前按钮节点，用于日期选择器快速回到今天。 */
    now: HTMLSpanElement
    /** 下一月按钮节点，用于切换日期选择器月份。 */
    nextMonth: HTMLSpanElement
    /** 下一年按钮节点，用于切换日期选择器年份。 */
    nextYear: HTMLSpanElement
  }
  /** 日期网格容器，用于渲染当月天数。 */
  day: HTMLDivElement
  /** 时间选择容器，用于渲染时分秒输入区域。 */
  time: {
    /** 小时值，用于日期时间控件。 */
    hour: HTMLOListElement
    /** 分钟值，用于日期时间控件。 */
    minute: HTMLOListElement
    /** 秒值，用于日期时间控件。 */
    second: HTMLOListElement
  }
  menu: {
    /** 时间选择容器，用于渲染时分秒输入区域。 */
    time: HTMLButtonElement
    /** 当前日期或当前按钮节点，用于日期选择器快速回到今天。 */
    now: HTMLButtonElement
    /** 提交按钮节点，用于确认日期选择结果。 */
    submit: HTMLButtonElement
  }
}

/** 渲染选项，用于约束调用方可传入的可选配置。 */
interface IRenderOption {
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position: IElementPosition
  /** 日期格式模板，用于格式化日期控件显示值。 */
  dateFormat?: string
}

/** datepickermode，限定当前功能可切换的运行模式。 */
type DatePickerMode = 'year' | 'month' | 'date' | 'datetime'

export class DatePicker {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 国际化服务实例，用于读取当前语言文案。 */
  private i18n: I18n
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: IDatePickerOption
  /** 当前日期对象，用作日期选择器的显示基准。 */
  private now: Date
  /** 当前组件创建并维护的 DOM 根节点。 */
  private dom: IDatePickerDom
  private renderOptions: IRenderOption | null
  private isDatePicker: boolean
  private pickDate: Date | null
  /** 当前组件的视图或交互模式。 */
  private mode: DatePickerMode
  /** 当前日期/时间选择器使用的语言配置。 */
  private lang: IDatePickerLang

  /** 初始化 DatePicker 实例并注入运行依赖。 */
  constructor(draw: Draw, i18n: I18n, options: IDatePickerOption = {}) {
    this.draw = draw
    this.i18n = i18n
    this.options = options
    this.lang = this._getLang()
    this.now = new Date()
    this.dom = this._createDom()
    this.renderOptions = null
    this.isDatePicker = true
    this.pickDate = null
    this.mode = 'datetime'
    this._bindEvent()
  }

  /** 获取modeclass，向调用方返回当前状态或计算结果。 */
  private _getModeClass(mode = this.mode) {
    return `${EDITOR_PREFIX}-date-container--${mode}`
  }

  /** 更新modeclass，同步内部状态并触发必要的界面刷新。 */
  private _setModeClass() {
    (['year', 'month', 'date', 'datetime'] as DatePickerMode[]).forEach(mode =>
      this.dom.container.classList.remove(this._getModeClass(mode))
    )
    this.dom.container.classList.add(this._getModeClass())
  }

  private _syncModeUI() {
    const isGridMode = this.mode === 'year' || this.mode === 'month'
    const isDateMode = this.mode === 'date' || this.mode === 'datetime'
    const isDatetimeMode = this.mode === 'datetime'
    const showDatePanel = isGridMode || this.isDatePicker
    const showTimePanel = isDatetimeMode && !this.isDatePicker

    this._setModeClass()
    this.dom.dateWrap.classList.toggle('active', showDatePanel)
    this.dom.timeWrap.classList.toggle('active', showTimePanel)
    this.dom.datePickerWeek.style.display = isGridMode ? 'none' : ''
    this.dom.day.classList.toggle(`${EDITOR_PREFIX}-date-day--grid`, isGridMode)
    this.dom.title.preYear.style.display = isGridMode ? '' : 'none'
    this.dom.title.nextYear.style.display = isGridMode ? '' : 'none'
    this.dom.title.preMonth.style.display = isDateMode ? '' : 'none'
    this.dom.title.nextMonth.style.display = isDateMode ? '' : 'none'
    this.dom.title.now.style.width = isGridMode ? '70%' : '40%'
    this.dom.menu.time.style.display = isDatetimeMode ? '' : 'none'
    this.dom.menu.now.style.display = isDatetimeMode ? '' : 'none'
    this.dom.menu.submit.style.display = ''
    this.dom.menu.time.innerText = showTimePanel
      ? this.lang.return
      : this.lang.timeSelect
  }

  /** 创建dom，组装后续流程需要的对象或 DOM 结构。 */
  private _createDom(): IDatePickerDom {
    const datePickerContainer = document.createElement('div')
    datePickerContainer.classList.add(`${EDITOR_PREFIX}-date-container`)
    datePickerContainer.setAttribute(EDITOR_COMPONENT, EditorComponent.POPUP)
    // title-切换年月、年月显示
    const dateWrap = document.createElement('div')
    dateWrap.classList.add(`${EDITOR_PREFIX}-date-wrap`)
    const datePickerTitle = document.createElement('div')
    datePickerTitle.classList.add(`${EDITOR_PREFIX}-date-title`)
    const preYearTitle = document.createElement('span')
    preYearTitle.classList.add(`${EDITOR_PREFIX}-date-title__pre-year`)
    preYearTitle.innerText = `<<`
    const preMonthTitle = document.createElement('span')
    preMonthTitle.classList.add(`${EDITOR_PREFIX}-date-title__pre-month`)
    preMonthTitle.innerText = `<`
    const nowTitle = document.createElement('span')
    nowTitle.classList.add(`${EDITOR_PREFIX}-date-title__now`)
    const nextMonthTitle = document.createElement('span')
    nextMonthTitle.classList.add(`${EDITOR_PREFIX}-date-title__next-month`)
    nextMonthTitle.innerText = `>`
    const nextYearTitle = document.createElement('span')
    nextYearTitle.classList.add(`${EDITOR_PREFIX}-date-title__next-year`)
    nextYearTitle.innerText = `>>`
    datePickerTitle.append(preYearTitle)
    datePickerTitle.append(preMonthTitle)
    datePickerTitle.append(nowTitle)
    datePickerTitle.append(nextMonthTitle)
    datePickerTitle.append(nextYearTitle)
    // week-星期显示
    const datePickerWeek = document.createElement('div')
    datePickerWeek.classList.add(`${EDITOR_PREFIX}-date-week`)
    const {
      weeks: { sun, mon, tue, wed, thu, fri, sat }
    } = this.lang
    const weekList = [sun, mon, tue, wed, thu, fri, sat]
    weekList.forEach(week => {
      const weekDom = document.createElement('span')
      weekDom.innerText = `${week}`
      datePickerWeek.append(weekDom)
    })
    // day-天数显示
    const datePickerDay = document.createElement('div')
    datePickerDay.classList.add(`${EDITOR_PREFIX}-date-day`)
    // 日期内容构建
    dateWrap.append(datePickerTitle)
    dateWrap.append(datePickerWeek)
    dateWrap.append(datePickerDay)
    // time-时间选择
    const timeWrap = document.createElement('ul')
    timeWrap.classList.add(`${EDITOR_PREFIX}-time-wrap`)
    let hourTime: HTMLOListElement
    let minuteTime: HTMLOListElement
    let secondTime: HTMLOListElement
    const timeList = [this.lang.hour, this.lang.minute, this.lang.second]
    timeList.forEach((t, i) => {
      const li = document.createElement('li')
      const timeText = document.createElement('span')
      timeText.innerText = t
      li.append(timeText)
      const ol = document.createElement('ol')
      const isHour = i === 0
      const isMinute = i === 1
      const endIndex = isHour ? 24 : 60
      for (let i = 0; i < endIndex; i++) {
        const time = document.createElement('li')
        time.innerText = `${String(i).padStart(2, '0')}`
        time.setAttribute('data-id', `${i}`)
        ol.append(time)
      }
      if (isHour) {
        hourTime = ol
      } else if (isMinute) {
        minuteTime = ol
      } else {
        secondTime = ol
      }
      li.append(ol)
      timeWrap.append(li)
    })
    // menu-选择时间、现在、确定
    const datePickerMenu = document.createElement('div')
    datePickerMenu.classList.add(`${EDITOR_PREFIX}-date-menu`)
    const timeMenu = document.createElement('button')
    timeMenu.classList.add(`${EDITOR_PREFIX}-date-menu__time`)
    timeMenu.innerText = this.lang.timeSelect
    const nowMenu = document.createElement('button')
    nowMenu.classList.add(`${EDITOR_PREFIX}-date-menu__now`)
    nowMenu.innerText = this.lang.now
    const submitMenu = document.createElement('button')
    submitMenu.classList.add(`${EDITOR_PREFIX}-date-menu__submit`)
    submitMenu.innerText = this.lang.confirm
    datePickerMenu.append(timeMenu)
    datePickerMenu.append(nowMenu)
    datePickerMenu.append(submitMenu)
    // 构建
    datePickerContainer.append(dateWrap)
    datePickerContainer.append(timeWrap)
    datePickerContainer.append(datePickerMenu)
    this.draw.getPageCanvasHost().getContainer().append(datePickerContainer)
    return {
      container: datePickerContainer,
      dateWrap,
      datePickerWeek,
      timeWrap,
      title: {
        preYear: preYearTitle,
        preMonth: preMonthTitle,
        now: nowTitle,
        nextMonth: nextMonthTitle,
        nextYear: nextYearTitle
      },
      day: datePickerDay,
      time: {
        hour: hourTime!,
        minute: minuteTime!,
        second: secondTime!
      },
      menu: {
        time: timeMenu,
        now: nowMenu,
        submit: submitMenu
      }
    }
  }

  /** 绑定事件，注册当前组件需要响应的事件。 */
  private _bindEvent() {
    this.dom.title.preYear.onclick = () => {
      this._preYear()
    }
    this.dom.title.preMonth.onclick = () => {
      this._preMonth()
    }
    this.dom.title.nextMonth.onclick = () => {
      this._nextMonth()
    }
    this.dom.title.nextYear.onclick = () => {
      this._nextYear()
    }
    this.dom.menu.time.onclick = () => {
      this.isDatePicker = !this.isDatePicker
      this._toggleDateTimePicker()
    }
    this.dom.menu.now.onclick = () => {
      this._now()
      this._submit()
    }
    this.dom.menu.submit.onclick = () => {
      this.dispose()
      this._submit()
    }
    this.dom.time.hour.onclick = evt => {
      if (!this.pickDate) return
      const li = <HTMLLIElement>evt.target
      const id = li.dataset.id
      if (!id) return
      this.pickDate.setHours(Number(id))
      this._setTimePick(false)
    }
    this.dom.time.minute.onclick = evt => {
      if (!this.pickDate) return
      const li = <HTMLLIElement>evt.target
      const id = li.dataset.id
      if (!id) return
      this.pickDate.setMinutes(Number(id))
      this._setTimePick(false)
    }
    this.dom.time.second.onclick = evt => {
      if (!this.pickDate) return
      const li = <HTMLLIElement>evt.target
      const id = li.dataset.id
      if (!id) return
      this.pickDate.setSeconds(Number(id))
      this._setTimePick(false)
    }
  }

  /** 更新位置，同步内部状态并触发必要的界面刷新。 */
  private _setPosition() {
    if (!this.renderOptions) return
    const {
      position: {
        coordinate: {
          leftTop: [left, top]
        },
        lineHeight,
        pageNo
      }
    } = this.renderOptions
    const currentPageNo = pageNo ?? this.draw.getPageNo()
    const preY = this.draw.getPageCanvasHost().getPageTop(currentPageNo)
    // 位置
    this.dom.container.style.left = `${left}px`
    this.dom.container.style.top = `${top + preY + lineHeight}px`
  }

  public isInvalidDate(value: Date): boolean {
    return value.toDateString() === 'Invalid Date'
  }

  /** 更新值，同步内部状态并触发必要的界面刷新。 */
  private _setValue() {
    const value = this.renderOptions?.value
    this.mode = this._resolveMode(this.renderOptions?.dateFormat)
    if (value) {
      // 创建 set Date 实例。
      const setDate = new Date(value)
      this.now = this.isInvalidDate(setDate) ? new Date() : setDate
    } else {
      this.now = new Date()
    }
    this.pickDate = new Date(this.now)
  }

  /** 获取lang，向调用方返回当前状态或计算结果。 */
  private _getLang() {
    const i18n = this.i18n
    const t = i18n.t.bind(i18n)
    return {
      now: t('datePicker.now'),
      confirm: t('datePicker.confirm'),
      return: t('datePicker.return'),
      timeSelect: t('datePicker.timeSelect'),
      weeks: {
        sun: t('datePicker.weeks.sun'),
        mon: t('datePicker.weeks.mon'),
        tue: t('datePicker.weeks.tue'),
        wed: t('datePicker.weeks.wed'),
        thu: t('datePicker.weeks.thu'),
        fri: t('datePicker.weeks.fri'),
        sat: t('datePicker.weeks.sat')
      },
      year: t('datePicker.year'),
      month: t('datePicker.month'),
      hour: t('datePicker.hour'),
      minute: t('datePicker.minute'),
      second: t('datePicker.second')
    }
  }

  /** 解析mode，把输入位置或状态转换为可执行结果。 */
  private _resolveMode(dateFormat?: string): DatePickerMode {
    if (dateFormat === 'yyyy') return 'year'
    if (dateFormat === 'yyyy-MM') return 'month'
    if (dateFormat === 'yyyy-MM-dd') return 'date'
    return 'datetime'
  }

  /** 更新daygridmode，同步内部状态并触发必要的界面刷新。 */
  private _setDayGridMode(mode: 'year' | 'month') {
    this._syncModeUI()
    this.dom.day.innerHTML = ''
    if (mode === 'year') {
      const year = this.now.getFullYear()
      const startYear = Math.floor(year / 12) * 12
      this.dom.title.now.innerText = `${startYear}${this.lang.year} - ${
        startYear + 11
      }${this.lang.year}`
      for (let i = 0; i < 12; i++) {
        const curYear = startYear + i
        const yearDom = document.createElement('div')
        yearDom.innerText = `${curYear}`
        if (curYear === year) {
          yearDom.classList.add('select')
        }
        yearDom.onclick = () => {
          this.now.setFullYear(curYear)
          this.pickDate?.setFullYear(curYear)
          if (this.renderOptions?.dateFormat === 'yyyy') {
            this._submit()
            this.dispose()
            return
          }
          this.mode = 'month'
          this._update()
        }
        this.dom.day.append(yearDom)
      }
      return
    }
    const year = this.now.getFullYear()
    const month = this.now.getMonth() + 1
    this.dom.title.now.innerText = `${year}${this.lang.year}`
    for (let i = 1; i <= 12; i++) {
      const monthDom = document.createElement('div')
      monthDom.innerText = `${String(i).padStart(2, '0')}`
      if (i === month) {
        monthDom.classList.add('select')
      }
      monthDom.onclick = () => {
        this.now.setMonth(i - 1)
        this.pickDate?.setMonth(i - 1)
        if (this.renderOptions?.dateFormat === 'yyyy-MM') {
          this._submit()
          this.dispose()
          return
        }
        this.mode = 'date'
        this._update()
      }
      this.dom.day.append(monthDom)
    }
  }

  /** 更新langchange，同步内部状态并触发必要的界面刷新。 */
  private _setLangChange() {
    this.dom.menu.time.innerText = this.lang.timeSelect
    this.dom.menu.now.innerText = this.lang.now
    this.dom.menu.submit.innerText = this.lang.confirm
    const {
      weeks: { sun, mon, tue, wed, thu, fri, sat }
    } = this.lang
    const weekList = [sun, mon, tue, wed, thu, fri, sat]
    this.dom.datePickerWeek.childNodes.forEach((child, i) => {
      const childElement = <HTMLSpanElement>child
      childElement.innerText = weekList[i]
    })
    const hourTitle = <HTMLSpanElement>this.dom.time.hour.previousElementSibling
    hourTitle.innerText = this.lang.hour
    const minuteTitle = <HTMLSpanElement>(
      this.dom.time.minute.previousElementSibling
    )
    minuteTitle.innerText = this.lang.minute
    const secondTitle = <HTMLSpanElement>(
      this.dom.time.second.previousElementSibling
    )
    secondTitle.innerText = this.lang.second
  }

  /** 更新当前项，根据最新数据刷新运行态。 */
  private _update() {
    this._syncModeUI()
    // 本地年月日
    const localDate = new Date()
    const localYear = localDate.getFullYear()
    const localMonth = localDate.getMonth() + 1
    const localDay = localDate.getDate()
    // 选择年月日
    let pickYear: number | null = null
    let pickMonth: number | null = null
    let pickDay: number | null = null
    if (this.pickDate) {
      pickYear = this.pickDate.getFullYear()
      pickMonth = this.pickDate.getMonth() + 1
      pickDay = this.pickDate.getDate()
    }
    // 当前年月日
    const year = this.now.getFullYear()
    const month = this.now.getMonth() + 1
    if (this.mode === 'year' || this.mode === 'month') {
      this._setDayGridMode(this.mode)
      return
    }
    this.dom.title.now.innerText = `${year}${this.lang.year} ${String(
      month
    ).padStart(2, '0')}${this.lang.month}`
    // 日期补差
    const curDate = new Date(year, month, 0) // 当月日期
    const curDay = curDate.getDate() // 当月总天数
    let curWeek = new Date(year, month - 1, 1).getDay() // 当月第一天星期几
    if (curWeek === 0) {
      curWeek = 7
    }
    const preDay = new Date(year, month - 1, 0).getDate() // 上个月天数
    this.dom.day.innerHTML = ''
    // 渲染上个月日期
    const preStartDay = preDay - curWeek + 1
    for (let i = preStartDay; i <= preDay; i++) {
      const dayDom = document.createElement('div')
      dayDom.classList.add('disable')
      dayDom.innerText = `${i}`
      dayDom.onclick = () => {
        const newMonth = month - 2
        this.now = new Date(year, newMonth, i)
        this._setDatePick(year, newMonth, i)
      }
      this.dom.day.append(dayDom)
    }
    // 渲染当月日期
    for (let i = 1; i <= curDay; i++) {
      const dayDom = document.createElement('div')
      if (localYear === year && localMonth === month && localDay === i) {
        dayDom.classList.add('active')
      }
      if (
        this.pickDate &&
        pickYear === year &&
        pickMonth === month &&
        pickDay === i
      ) {
        dayDom.classList.add('select')
      }
      dayDom.innerText = `${i}`
      dayDom.onclick = evt => {
        const newMonth = month - 1
        this.now = new Date(year, newMonth, i)
        this._setDatePick(year, newMonth, i)
        evt.stopPropagation()
      }
      this.dom.day.append(dayDom)
    }
    // 渲染下月日期
    const nextEndDay = 6 * 7 - curWeek - curDay
    for (let i = 1; i <= nextEndDay; i++) {
      const dayDom = document.createElement('div')
      dayDom.classList.add('disable')
      dayDom.innerText = `${i}`
      dayDom.onclick = () => {
        this.now = new Date(year, month, i)
        this._setDatePick(year, month, i)
      }
      this.dom.day.append(dayDom)
    }
  }

  /** 切换datetimepicker，在不同显示或交互状态之间切换。 */
  private _toggleDateTimePicker() {
    this._syncModeUI()
    if (this.mode === 'datetime' && !this.isDatePicker) {
      // 设置时分秒选择
      this._setTimePick()
    }
  }

  /** 更新datepick，同步内部状态并触发必要的界面刷新。 */
  private _setDatePick(year: number, month: number, day: number) {
    this.now = new Date(year, month, day)
    this.pickDate?.setFullYear(year)
    this.pickDate?.setMonth(month)
    this.pickDate?.setDate(day)
    this._update()
  }

  /** 更新timepick，同步内部状态并触发必要的界面刷新。 */
  private _setTimePick(isIntoView = true) {
    const hour = this.pickDate?.getHours() || 0
    const minute = this.pickDate?.getMinutes() || 0
    const second = this.pickDate?.getSeconds() || 0
    const {
      hour: hourDom,
      minute: minuteDom,
      second: secondDom
    } = this.dom.time
    const timeDomList = [hourDom, minuteDom, secondDom]
    // 清空
    timeDomList.forEach(timeDom => {
      timeDom
        .querySelectorAll('li')
        .forEach(li => li.classList.remove('active'))
    })
    const pickList: [HTMLOListElement, number][] = [
      [hourDom, hour],
      [minuteDom, minute],
      [secondDom, second]
    ]
    pickList.forEach(([dom, time]) => {
      const pickDom = dom.querySelector<HTMLLIElement>(`[data-id='${time}']`)!
      pickDom.classList.add('active')
      if (isIntoView) {
        this._scrollIntoView(dom, pickDom)
      }
    })
  }

  private _scrollIntoView(container: HTMLElement, selected: HTMLElement) {
    if (!selected) {
      container.scrollTop = 0
      return
    }
    // 初始化 offset Parents 列表。
    const offsetParents: HTMLElement[] = []
    let pointer = <HTMLElement>selected.offsetParent
    while (pointer && container !== pointer && container.contains(pointer)) {
      offsetParents.push(pointer)
      pointer = <HTMLElement>pointer.offsetParent
    }
    const top =
      selected.offsetTop +
      offsetParents.reduce((prev, curr) => prev + curr.offsetTop, 0)
    const bottom = top + selected.offsetHeight
    const viewRectTop = container.scrollTop
    const viewRectBottom = viewRectTop + container.clientHeight
    if (top < viewRectTop) {
      container.scrollTop = top
    } else if (bottom > viewRectBottom) {
      container.scrollTop = bottom - container.clientHeight
    }
  }

  private _preMonth() {
    this.now.setMonth(this.now.getMonth() - 1)
    this._update()
  }

  private _nextMonth() {
    this.now.setMonth(this.now.getMonth() + 1)
    this._update()
  }

  private _preYear() {
    this.now.setFullYear(
      this.now.getFullYear() - (this.mode === 'year' ? 12 : 1)
    )
    this._update()
  }

  private _nextYear() {
    this.now.setFullYear(
      this.now.getFullYear() + (this.mode === 'year' ? 12 : 1)
    )
    this._update()
  }

  private _now() {
    this.pickDate = new Date()
    this.dispose()
  }

  /** 切换visible，在不同显示或交互状态之间切换。 */
  private _toggleVisible(isVisible: boolean) {
    if (isVisible) {
      this.dom.container.classList.add('active')
    } else {
      this.dom.container.classList.remove('active')
    }
  }

  private _submit() {
    if (this.options.onSubmit && this.pickDate) {
      const format = this.renderOptions?.dateFormat
      const pickDateString = this.formatDate(this.pickDate, format)
      this.options.onSubmit(pickDateString)
    }
  }

  /** 格式化date，生成界面显示或提交需要的文本。 */
  public formatDate(date: Date, format = 'yyyy-MM-dd hh:mm:ss'): string {
    let dateString = format
    const dateOption = {
      'y+': date.getFullYear().toString(),
      'M+': (date.getMonth() + 1).toString(),
      'd+': date.getDate().toString(),
      'h+': date.getHours().toString(),
      'm+': date.getMinutes().toString(),
      's+': date.getSeconds().toString()
    }
    for (const k in dateOption) {
      const reg = new RegExp('(' + k + ')').exec(format)
      const key = <keyof typeof dateOption>k
      if (reg) {
        dateString = dateString.replace(
          reg[1],
          reg[1].length === 1
            ? dateOption[key]
            : dateOption[key].padStart(reg[1].length, '0')
        )
      }
    }
    return dateString
  }

  public render(option: IRenderOption) {
    this.renderOptions = option
    this.lang = this._getLang()
    this._setLangChange()
    this._setValue()
    this._update()
    this._setPosition()
    this.isDatePicker = true
    this._toggleDateTimePicker()
    this._toggleVisible(true)
  }

  /** 销毁dispose相关资源，解除事件监听并释放持有对象。 */
  public dispose() {
    this._toggleVisible(false)
  }

  /** 销毁destroy相关资源，解除事件监听并释放持有对象。 */
  public destroy() {
    this.dom.container.remove()
  }
}
