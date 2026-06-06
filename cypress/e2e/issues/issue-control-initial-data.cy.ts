import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { EditorZone } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

/** 覆盖 TS-02 创建编辑器时注入控件选项、规则和值的能力。 */
describe('control initial data', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证构造函数 options 可以初始化选择控件的选项、禁用状态和选中值。 */
  it('applies initial control properties and values from editor options', () => {
    cy.window().then(win => {
      const baseEditor = (win as any).editor
      const container = win.document.createElement('div')
      container.style.width = '794px'
      container.style.height = '1123px'
      win.document.body.appendChild(container)

      const EditorCtor = baseEditor.constructor
      const editor = new EditorCtor(
        container,
        {
          main: [
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'initial-select',
              control: {
                type: ControlType.SELECT,
                value: null,
                placeholder: '请选择',
                conceptId: 'symptom'
              }
            }
          ]
        },
        {
          controlInitialProperties: [
            {
              id: 'initial-select',
              properties: {
                disabled: true,
                valueSets: [
                  { value: '有', code: 'yes' },
                  { value: '无', code: 'no' }
                ]
              }
            }
          ],
          controlInitialValues: [
            {
              conceptId: 'symptom',
              value: 'yes'
            }
          ]
        }
      )

      expect(editor.command.getOptions().controlInitialValues).to.have.length(1)
      expect(editor.command.getOptions().controlInitialProperties).to.have.length(1)
      const [controlValue] = editor.command.getControlValue({
        id: 'initial-select'
      })
      expect(controlValue.valueSets).to.have.length(2)
      expect(controlValue.disabled).to.eq(true)
      expect(controlValue.value).to.eq('yes')
      expect(controlValue.innerText).to.eq('有')
      editor.destroy()
      container.remove()
    })
  })

  /** 验证初始化和公开控件查询支持 externalId/code 业务字段匹配。 */
  it('matches initial control data by externalId and code', () => {
    cy.window().then(win => {
      const baseEditor = (win as any).editor
      const container = win.document.createElement('div')
      container.style.width = '794px'
      container.style.height = '1123px'
      win.document.body.appendChild(container)

      const EditorCtor = baseEditor.constructor
      const editor = new EditorCtor(
        container,
        {
          main: [
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'patient-name-control',
              externalId: 'patient.name',
              control: {
                type: ControlType.TEXT,
                value: null,
                placeholder: '姓名'
              }
            },
            { value: '\n' },
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'record-no-control',
              control: {
                type: ControlType.TEXT,
                value: null,
                placeholder: '编号',
                code: 'record.no'
              }
            }
          ]
        },
        {
          controlInitialValues: [
            {
              externalId: 'patient.name',
              value: '张三'
            },
            {
              code: 'record.no',
              value: 'A-001'
            }
          ]
        }
      )

      expect(editor.command.getControlValue({
        externalId: 'patient.name'
      })[0].innerText).to.eq('张三')
      expect(editor.command.getControlValue({
        code: 'record.no'
      })[0].innerText).to.eq('A-001')
      editor.destroy()
      container.remove()
    })
  })

  /** 验证 controlSchema 可在模板级声明业务绑定、默认选项、默认规则和默认值。 */
  it('applies control schema before instance initial values', () => {
    cy.window().then(win => {
      const baseEditor = (win as any).editor
      const container = win.document.createElement('div')
      container.style.width = '794px'
      container.style.height = '1123px'
      win.document.body.appendChild(container)

      const EditorCtor = baseEditor.constructor
      const editor = new EditorCtor(
        container,
        {
          main: [
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'schema-level-control',
              control: {
                type: ControlType.SELECT,
                value: null,
                placeholder: '等级',
                conceptId: 'diagnosisLevel'
              }
            }
          ]
        },
        {
          controlSchema: [
            {
              conceptId: 'diagnosisLevel',
              elementProperties: {
                externalId: 'patient.diagnosis.level'
              },
              properties: {
                required: true,
                extension: {
                  fieldName: '诊断等级'
                },
                valueSets: [
                  { value: '轻度', code: 'mild' },
                  { value: '中度', code: 'moderate' }
                ]
              },
              defaultValue: 'mild'
            }
          ],
          controlInitialValues: [
            {
              externalId: 'patient.diagnosis.level',
              value: 'moderate'
            }
          ]
        }
      )

      const [controlValue] = editor.command.getControlValue({
        externalId: 'patient.diagnosis.level'
      })
      expect(controlValue.required).to.eq(true)
      expect(controlValue.valueSets.map((item: any) => item.code)).to.deep.eq([
        'mild',
        'moderate'
      ])
      expect(controlValue.value).to.eq('moderate')
      expect(controlValue.innerText).to.eq('中度')
      expect(controlValue.extension.fieldName).to.eq('诊断等级')
      editor.destroy()
      container.remove()
    })
  })

  /** 验证批量控件 API 会返回未匹配的失败项，方便业务侧定位字段问题。 */
  it('returns failed items for batch control writes', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'batch-name-control',
            externalId: 'batch.name',
            control: {
              type: ControlType.TEXT,
              value: null,
              placeholder: '姓名'
            }
          }
        ]
      })

      const valueResult = editor.command.executeSetControlValueList([
        {
          externalId: 'batch.name',
          value: '李四'
        },
        {
          externalId: 'missing.name',
          value: '未命中'
        }
      ])
      const propertyResult = editor.command.executeSetControlPropertiesList([
        {
          externalId: 'batch.name',
          properties: {
            disabled: true
          }
        },
        {
          externalId: 'missing.name',
          properties: {
            disabled: true
          }
        }
      ])

      expect(valueResult.successCount).to.eq(1)
      expect(valueResult.failureList).to.have.length(1)
      expect(valueResult.failureList[0].reason).to.eq('not_found')
      expect(propertyResult.successCount).to.eq(1)
      expect(propertyResult.failureList).to.have.length(1)
      expect(editor.command.getControlValue({
        externalId: 'batch.name'
      })[0].innerText).to.eq('李四')
    })
  })

  /** 验证父控件通过 API 改值后，子控件可按级联映射刷新候选项，并保留远程选项状态。 */
  it('refreshes cascade options and keeps remote option status', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'province-control',
            control: {
              type: ControlType.SELECT,
              value: null,
              code: null,
              valueSets: [
                { value: '广东', code: 'gd' },
                { value: '浙江', code: 'zj' }
              ]
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'city-control',
            control: {
              type: ControlType.SELECT,
              value: null,
              code: null,
              valueSets: [],
              cascade: {
                parentId: 'province-control',
                valueSetMap: {
                  gd: [
                    { value: '广州', code: 'gz' },
                    { value: '深圳', code: 'sz' }
                  ],
                  zj: [
                    { value: '杭州', code: 'hz' },
                    { value: '宁波', code: 'nb' }
                  ]
                }
              },
              remote: {
                loading: true,
                source: 'city-dict',
                requestId: 'req-1'
              }
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        id: 'province-control',
        value: 'gd'
      })
      let cityControl = editor.command.getControlValue({
        id: 'city-control'
      })[0]
      expect(cityControl.valueSets.map((item: any) => item.value)).to.deep.eq([
        '广州',
        '深圳'
      ])

      editor.command.executeSetControlValue({
        id: 'province-control',
        value: 'zj'
      })
      cityControl = editor.command.getControlValue({
        id: 'city-control'
      })[0]
      expect(cityControl.valueSets.map((item: any) => item.code)).to.deep.eq([
        'hz',
        'nb'
      ])

      editor.command.executeSetControlProperties({
        id: 'city-control',
        properties: {
          remote: {
            loading: false,
            error: '远程字典加载失败',
            source: 'city-dict',
            requestId: 'req-2'
          }
        }
      })
      cityControl = editor.command.getControlValue({
        id: 'city-control'
      })[0]
      expect(cityControl.remote.loading).to.eq(false)
      expect(cityControl.remote.error).to.eq('远程字典加载失败')
      expect(cityControl.remote.requestId).to.eq('req-2')
    })
  })

  /** 验证控件校验 API 可返回必填和格式失败项，并派发校验事件。 */
  it('validates required and pattern rules with event payload', () => {
    cy.getEditor().then((editor: any) => {
      let validateEventPayload: any = null
      editor.eventBus.on('controlValidate', (payload: any) => {
        validateEventPayload = payload
      })
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'required-name-control',
            control: {
              type: ControlType.TEXT,
              value: null,
              required: true,
              placeholder: '请输入姓名'
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'phone-control',
            control: {
              type: ControlType.TEXT,
              value: [{ value: 'abc' }],
              validateRules: [
                {
                  pattern: '^1\\d{10}$',
                  message: '手机号格式不正确'
                }
              ]
            }
          }
        ]
      })

      const result = editor.command.executeValidateControl()
      expect(result.isValid).to.eq(false)
      expect(result.failureList.map((item: any) => item.reason)).to.deep.eq([
        'required',
        'pattern'
      ])
      expect(result.failureList[0].message).to.eq('请输入姓名')
      expect(validateEventPayload.failureList).to.have.length(2)

      editor.command.executeSetControlValue({
        id: 'required-name-control',
        value: '张三'
      })
      editor.command.executeSetControlValue({
        id: 'phone-control',
        value: '13800138000'
      })
      const validResult = editor.command.executeValidateControl({
        isEmitEvent: false
      })
      expect(validResult.isValid).to.eq(true)
      expect(validResult.failureList).to.have.length(0)
    })
  })

  /** 验证异步业务校验器可追加失败项，并与同步校验共用 controlValidate 事件。 */
  it('supports async business validator results', () => {
    cy.window().then(async win => {
      const baseEditor = (win as any).editor
      const container = win.document.createElement('div')
      container.style.width = '794px'
      container.style.height = '1123px'
      win.document.body.appendChild(container)

      const EditorCtor = baseEditor.constructor
      let editor: any = null
      editor = new EditorCtor(
        container,
        {
          main: [
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'async-name-control',
              control: {
                type: ControlType.TEXT,
                value: [{ value: '张三' }]
              }
            }
          ]
        },
        {
          controlValidator: async () => {
            const [controlValue] = editor.command.getControlValue({
              id: 'async-name-control'
            })
            return {
              isValid: false,
              failureList: [
                {
                  controlId: 'async-name-control',
                  control: controlValue,
                  value: controlValue.innerText,
                  zone: EditorZone.MAIN,
                  reason: 'pattern',
                  message: '业务系统校验未通过'
                }
              ]
            }
          }
        }
      )

      let validateEventPayload: any = null
      editor.eventBus.on('controlValidate', (payload: any) => {
        validateEventPayload = payload
      })
      const result = await editor.command.executeValidateControlAsync()
      expect(result.isValid).to.eq(false)
      expect(result.failureList).to.have.length(1)
      expect(result.failureList[0].message).to.eq('业务系统校验未通过')
      expect(validateEventPayload.failureList[0].controlId).to.eq(
        'async-name-control'
      )
      editor.destroy()
      container.remove()
    })
  })

  /** 验证声明式跨字段规则可覆盖常见联动必填和值一致场景。 */
  it('validates declarative cross field rules with filtered validation', () => {
    cy.window().then(win => {
      const baseEditor = (win as any).editor
      const container = win.document.createElement('div')
      container.style.width = '794px'
      container.style.height = '1123px'
      win.document.body.appendChild(container)

      const EditorCtor = baseEditor.constructor
      const editor = new EditorCtor(
        container,
        {
          main: [
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'has-fever-control',
              control: {
                type: ControlType.SELECT,
                value: null,
                code: 'yes',
                valueSets: [
                  { value: '是', code: 'yes' },
                  { value: '否', code: 'no' }
                ]
              }
            },
            { value: '\n' },
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'temperature-control',
              control: {
                type: ControlType.TEXT,
                value: null
              }
            },
            { value: '\n' },
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'phone-control',
              control: {
                type: ControlType.TEXT,
                value: [{ value: '13800138000' }]
              }
            },
            { value: '\n' },
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'confirm-phone-control',
              control: {
                type: ControlType.TEXT,
                value: [{ value: '13900139000' }]
              }
            }
          ]
        },
        {
          controlCrossValidateRules: [
            {
              type: 'requiredWhen',
              target: { id: 'temperature-control' },
              dependency: { id: 'has-fever-control' },
              dependencyValue: '是',
              message: '发热时必须填写体温'
            },
            {
              type: 'equals',
              target: { id: 'confirm-phone-control' },
              dependency: { id: 'phone-control' },
              message: '确认手机号必须一致'
            }
          ]
        }
      )

      const filteredResult = editor.command.executeValidateControl({
        id: 'temperature-control'
      })
      expect(filteredResult.isValid).to.eq(false)
      expect(filteredResult.failureList).to.have.length(1)
      expect(filteredResult.failureList[0]).to.include({
        controlId: 'temperature-control',
        reason: 'cross_field',
        message: '发热时必须填写体温'
      })

      const allResult = editor.command.executeValidateControl()
      expect(allResult.isValid).to.eq(false)
      expect(allResult.failureList.map((item: any) => item.message)).to.deep.eq([
        '发热时必须填写体温',
        '确认手机号必须一致'
      ])

      editor.command.executeSetControlValue({
        id: 'temperature-control',
        value: '38.5'
      })
      editor.command.executeSetControlValue({
        id: 'confirm-phone-control',
        value: '13800138000'
      })
      const validResult = editor.command.executeValidateControl()
      expect(validResult.isValid).to.eq(true)
      expect(validResult.failureList).to.have.length(0)

      editor.destroy()
      container.remove()
    })
  })

  /** 验证远程选项加载器可异步刷新候选项，并返回未命中、类型不支持和加载失败项。 */
  it('loads remote control options and reports failed items', () => {
    cy.window().then(async win => {
      const baseEditor = (win as any).editor
      const container = win.document.createElement('div')
      container.style.width = '794px'
      container.style.height = '1123px'
      win.document.body.appendChild(container)

      const EditorCtor = baseEditor.constructor
      const editor = new EditorCtor(
        container,
        {
          main: [
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'remote-city-control',
              control: {
                type: ControlType.SELECT,
                value: null,
                code: 'sz',
                valueSets: [],
                remote: {
                  source: 'city-dict',
                  loading: false
                }
              }
            },
            { value: '\n' },
            {
              type: ElementType.CONTROL,
              value: '',
              controlId: 'remote-text-control',
              control: {
                type: ControlType.TEXT,
                value: null
              }
            }
          ]
        },
        {
          controlRemoteOptionLoader: async ({ option }: any) => {
            if (option.source === 'fail-dict') {
              throw new Error('远程字典不可用')
            }
            expect(option.params?.province).to.eq('gd')
            return {
              valueSets: [
                { value: '深圳', code: 'sz' },
                { value: '广州', code: 'gz' }
              ],
              remote: {
                source: option.source,
                requestId: option.requestId
              }
            }
          }
        }
      )

      const result =
        await editor.command.executeLoadControlRemoteOptionsList([
          {
            id: 'remote-city-control',
            source: 'city-dict',
            requestId: 'req-ok',
            params: {
              province: 'gd'
            },
            isSubmitHistory: false
          },
          {
            id: 'remote-text-control',
            params: {
              province: 'gd'
            }
          },
          {
            id: 'missing-control',
            params: {
              province: 'gd'
            }
          }
        ])
      expect(result.successCount).to.eq(1)
      expect(result.failureList.map((item: any) => item.reason).sort()).to.deep.eq([
        'not_found',
        'unsupported'
      ])

      let [cityControl] = editor.command.getControlValue({
        id: 'remote-city-control'
      })
      expect(cityControl.valueSets.map((item: any) => item.code)).to.deep.eq([
        'sz',
        'gz'
      ])
      expect(cityControl.innerText).to.eq('深圳')
      expect(cityControl.remote.loading).to.eq(false)
      expect(cityControl.remote.error).to.eq(null)
      expect(cityControl.remote.requestId).to.eq('req-ok')

      const failedResult =
        await editor.command.executeLoadControlRemoteOptions({
          id: 'remote-city-control',
          source: 'fail-dict',
          requestId: 'req-fail',
          params: {
            province: 'gd'
          },
          isSubmitHistory: false
        })
      expect(failedResult.successCount).to.eq(0)
      expect(failedResult.failureList[0].reason).to.eq('load_failed')
      cityControl = editor.command.getControlValue({
        id: 'remote-city-control'
      })[0]
      expect(cityControl.remote.loading).to.eq(false)
      expect(cityControl.remote.error).to.eq('远程字典不可用')
      expect(cityControl.remote.requestId).to.eq('req-fail')

      editor.destroy()
      container.remove()
    })
  })

  /** 验证校验 API 可把失败控件同步到覆盖层高亮，并在通过后清理校验来源高亮。 */
  it('applies validation highlight for failed controls', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'highlight-required-control',
            control: {
              type: ControlType.TEXT,
              value: null,
              required: true,
              placeholder: '必填项'
            }
          }
        ]
      })

      const invalidResult = editor.command.executeValidateControl({
        isApplyHighlight: true,
        highlightColor: '#ff0000',
        highlightAlpha: 0.3
      })
      expect(invalidResult.isValid).to.eq(false)
      const controlSearch = (editor as any).draw.getControl().controlSearch
      const highlightList = controlSearch.getHighlightList()
      expect(highlightList[0].source).to.eq('control-validate')
      expect(highlightList[0].ruleList[0].isFullControl).to.eq(true)
      expect(controlSearch.getHighlightMatchResult().length).to.be.greaterThan(0)

      editor.command.executeSetControlValue({
        id: 'highlight-required-control',
        value: '已填写'
      })
      const validResult = editor.command.executeValidateControl({
        isApplyHighlight: true
      })
      expect(validResult.isValid).to.eq(true)
      expect(
        controlSearch
          .getHighlightList()
          .some((item: any) => item.source === 'control-validate')
      ).to.eq(false)
    })
  })
})
