# 控件业务融合 Demo 使用说明

本文档说明 demo 工具栏中“控件”和“API 控件业务融合测试”的字段含义、配置方式和 API 使用方式。

## 入口

- 普通控件插入：顶部工具栏点击“控件”图标，选择“文本控件、数值控件、下拉控件、日期控件、复选框控件、单选框控件”。
- 业务融合测试：顶部工具栏点击带 `API` 角标的控件图标，会自动生成一份控件测试文档，并执行远程选项加载和校验高亮。

## 通用字段

这些字段适用于所有控件类型。

| 字段 | 含义 | 使用建议 |
| --- | --- | --- |
| 控件ID | 写入元素的 `controlId`，用于唯一定位一个控件。 | 模板内唯一，例如 `patient-name`。 |
| 概念ID | 写入 `control.conceptId`，表示同一业务语义。 | 同一类字段可复用，例如 `patientName`。 |
| 业务字段 | 写入元素的 `externalId`，用于和外部系统字段绑定。 | 推荐业务回填优先使用，例如 `patient.name`。 |
| 前缀 | 写入 `control.prefix`，显示在控件值前。 | 医疗模板常用 `{`。 |
| 后缀 | 写入 `control.postfix`，显示在控件值后。 | 医疗模板常用 `}`。 |
| 必填 | 写入 `control.required`。 | 提交前调用校验 API，可高亮未填写控件。 |

## 文本控件

用于姓名、主诉补充、诊断描述等普通文本输入。

| 字段 | 含义 |
| --- | --- |
| 占位符 | 写入 `control.placeholder`，空值时显示提示。 |
| 默认值 | 写入 `control.value`。 |
| 正则校验 | 写入 `control.validateRules[].pattern`。 |
| 失败提示 | 写入 `control.validateRules[].message`。 |

示例：

```json
{
  "controlId": "patient-name",
  "externalId": "patient.name",
  "control": {
    "type": "text",
    "placeholder": "请输入患者姓名",
    "required": true
  }
}
```

## 数值控件

用于年龄、体温、剂量、工艺参数等数值输入。

数值控件默认提供正则：

```text
^-?\d+(\.\d+)?$
```

表示允许整数、小数和负数。

## 下拉控件

用于字典选项，例如省份、城市、诊断等级、风险等级。

| 字段 | 含义 |
| --- | --- |
| 默认编码 | 写入 `control.code`，对应选中项的 `code`。 |
| 值集 | 写入 `control.valueSets`，必须是 JSON 数组。 |
| 远程源 | 写入 `control.remote.source`，用于远程选项加载器识别字典来源。 |

值集示例：

```json
[
  {
    "value": "广东",
    "code": "gd"
  },
  {
    "value": "浙江",
    "code": "zj"
  }
]
```

## 日期控件

用于出生日期、就诊时间、记录时间。

| 字段 | 含义 |
| --- | --- |
| 日期格式 | 写入 `control.dateFormat`。 |
| 默认值 | 写入 `control.value`。 |

支持格式：

- `yyyy`
- `yyyy-MM`
- `yyyy-MM-dd`
- `yyyy-MM-dd hh:mm:ss`

## 复选框控件

用于多选业务项，例如症状、过敏史、检查项目。

| 字段 | 含义 |
| --- | --- |
| 默认编码 | 写入 `control.code`，多个值使用英文逗号分隔。 |
| 值集 | 写入 `control.valueSets`。 |

示例：

```json
[
  {
    "value": "发热",
    "code": "fever"
  },
  {
    "value": "咳嗽",
    "code": "cough"
  }
]
```

## 单选框控件

用于互斥选择，例如“有/无”“男/女”“通过/不通过”。

字段和复选框一致，但默认编码只建议填写一个值。

## controlSchema 用法

`controlSchema` 适合做模板级配置。外部可以直接在 `properties.valueSets` 里传入候选项。模板打开时先应用 schema，再应用实例级初始化值。

```ts
const editor = new Editor(container, data, {
  controlSchema: [
    {
      conceptId: 'diagnosisLevel',
      elementProperties: {
        externalId: 'patient.diagnosis.level'
      },
      properties: {
        required: true,
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
})
```

最终控件显示为“中度”，因为实例级 `controlInitialValues` 会覆盖 schema 默认值。

## 外部初始化传入 valueSets

如果业务系统在创建编辑器时已经拿到了候选项，推荐通过 `controlInitialProperties` 直接传入 `valueSets`。

```ts
const editor = new Editor(container, data, {
  controlInitialProperties: [
    {
      externalId: 'patient.city',
      properties: {
        valueSets: [
          { value: '深圳', code: 'sz' },
          { value: '广州', code: 'gz' }
        ],
        remote: {
          loading: false,
          source: 'city-dict',
          requestId: 'init-city'
        }
      }
    },
    {
      externalId: 'patient.department',
      properties: {
        valueSets: [
          { value: '内科', code: 'internal' },
          { value: '外科', code: 'surgery' }
        ]
      }
    }
  ],
  controlInitialValues: [
    {
      externalId: 'patient.city',
      value: 'sz'
    },
    {
      externalId: 'patient.department',
      value: 'internal'
    }
  ]
})
```

初始化顺序是：

1. 先写入 `controlInitialProperties` 中的 `valueSets`。
2. 再写入 `controlInitialValues` 中的选中值。
3. 选择类控件会用 `code` 到 `valueSets` 中匹配显示文本。

上面示例最终会显示：

- 城市：深圳
- 科室：内科

## 创建后批量传入 valueSets

如果候选项是在编辑器创建后才拿到，可以使用 `executeSetControlPropertiesList()` 批量写入。

```ts
editor.command.executeSetControlPropertiesList([
  {
    externalId: 'patient.city',
    properties: {
      valueSets: [
        { value: '深圳', code: 'sz' },
        { value: '广州', code: 'gz' }
      ]
    },
    isSubmitHistory: false
  },
  {
    externalId: 'patient.department',
    properties: {
      valueSets: [
        { value: '内科', code: 'internal' },
        { value: '外科', code: 'surgery' }
      ]
    },
    isSubmitHistory: false
  }
])

editor.command.executeSetControlValueList([
  {
    externalId: 'patient.city',
    value: 'sz',
    isSubmitHistory: false
  },
  {
    externalId: 'patient.department',
    value: 'internal',
    isSubmitHistory: false
  }
])
```

## 批量回填

推荐业务系统使用 `externalId` 回填。

```ts
editor.command.executeSetControlValueList([
  {
    externalId: 'patient.name',
    value: '张三'
  },
  {
    externalId: 'patient.phone',
    value: '13800138000'
  }
])
```

返回值包含成功数量和失败项：

```ts
{
  successCount: 2,
  failureList: []
}
```

## 远程选项加载

先在编辑器配置里提供加载器：

```ts
editor.command.executeUpdateOptions({
  controlRemoteOptionLoader: async ({ option }) => {
    if (option.source === 'city-dict') {
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
    throw new Error('未知远程字典')
  }
})
```

再加载指定控件：

```ts
await editor.command.executeLoadControlRemoteOptions({
  externalId: 'patient.city',
  source: 'city-dict',
  requestId: `city-${Date.now()}`,
  params: {
    province: 'gd'
  }
})
```

## 多个远程选项初始化

多个控件要初始化远程选项时，使用批量入口 `executeLoadControlRemoteOptionsList()`。

```ts
const result = await editor.command.executeLoadControlRemoteOptionsList([
  {
    externalId: 'patient.city',
    source: 'city-dict',
    requestId: `city-${Date.now()}`,
    params: {
      province: 'gd'
    }
  },
  {
    externalId: 'patient.department',
    source: 'department-dict',
    requestId: `department-${Date.now()}`,
    params: {
      hospitalId: 'hospital-001'
    }
  },
  {
    externalId: 'patient.diagnosis.level',
    source: 'diagnosis-level-dict',
    requestId: `diagnosis-${Date.now()}`
  }
])

console.log(result.successCount)
console.log(result.failureList)
```

加载器按 `source` 区分不同接口：

```ts
editor.command.executeUpdateOptions({
  controlRemoteOptionLoader: async ({ option }) => {
    switch (option.source) {
      case 'city-dict':
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
      case 'department-dict':
        return {
          valueSets: [
            { value: '内科', code: 'internal' },
            { value: '外科', code: 'surgery' }
          ],
          remote: {
            source: option.source,
            requestId: option.requestId
          }
        }
      case 'diagnosis-level-dict':
        return {
          valueSets: [
            { value: '轻度', code: 'mild' },
            { value: '中度', code: 'moderate' },
            { value: '重度', code: 'severe' }
          ],
          remote: {
            source: option.source,
            requestId: option.requestId
          }
        }
      default:
        throw new Error('未知远程字典')
    }
  }
})
```

如果控件已经通过 `controlInitialValues` 或 `executeSetControlValueList()` 写入了 `code`，远程选项加载完成后会根据新 `valueSets` 回显对应文本。

加载成功后会写入：

- `control.valueSets`
- `control.remote.loading`
- `control.remote.error`
- `control.remote.source`
- `control.remote.requestId`

## 校验与高亮

提交前可执行校验：

```ts
const result = editor.command.executeValidateControl({
  isApplyHighlight: true,
  highlightColor: '#ff4d4f',
  highlightAlpha: 0.28
})
```

结果示例：

```ts
{
  isValid: false,
  failureList: [
    {
      controlId: 'patient-name',
      reason: 'required',
      message: '请输入患者姓名'
    }
  ]
}
```

`isApplyHighlight: true` 时，失败控件会在页面上高亮；校验通过后，校验来源的高亮会自动清理。

## 手动测试流程

1. 打开 demo 页面。
2. 点击顶部工具栏“控件”图标。
3. 选择任意控件类型，填写业务字段、必填、默认值和值集。
4. 插入后可用控制台调用 `editor.command.getControlValue({ externalId: '字段名' })` 查看。
5. 点击带 `API` 角标的控件图标，可直接加载完整业务融合测试文档。
6. 查看控制台输出的远程选项加载结果和校验结果。
