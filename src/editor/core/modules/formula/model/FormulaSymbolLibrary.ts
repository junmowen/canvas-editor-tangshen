import {
  FormulaDomain,
  IFormulaSymbol
} from '../../../../interface/Formula'

/** 内置专业公式符号库，覆盖数学、物理、化学、医院和工厂第一批常用公式结构。 */
export const BUILTIN_FORMULA_SYMBOL_LIST: IFormulaSymbol[] = [
  {
    id: 'math-fraction',
    domain: 'math',
    category: '基础结构',
    label: '分式',
    latex: '\\frac{a}{b}',
    description: '基础分式结构',
    keywords: ['分式', 'fraction']
  },
  {
    id: 'math-nested-fraction',
    domain: 'math',
    category: '基础结构',
    label: '嵌套分式',
    latex: '\\frac{\\frac{a}{b}}{c}',
    description: '多层分式结构',
    keywords: ['嵌套分式', 'fraction', 'nested']
  },
  {
    id: 'math-sqrt',
    domain: 'math',
    category: '基础结构',
    label: '根式',
    latex: '\\sqrt{x}',
    description: '平方根或 n 次根结构',
    keywords: ['根式', 'sqrt']
  },
  {
    id: 'math-nth-root',
    domain: 'math',
    category: '基础结构',
    label: 'n 次根',
    latex: '\\sqrt[n]{x}',
    description: '带根指数的根式结构',
    keywords: ['根式', 'n次根', 'root']
  },
  {
    id: 'math-superscript',
    domain: 'math',
    category: '上下标',
    label: '上标',
    latex: 'x^{2}',
    description: '幂和上标结构',
    keywords: ['上标', '幂', 'power']
  },
  {
    id: 'math-subscript',
    domain: 'math',
    category: '上下标',
    label: '下标',
    latex: 'A_{i}',
    description: '下标结构',
    keywords: ['下标', 'subscript']
  },
  {
    id: 'math-subsup',
    domain: 'math',
    category: '上下标',
    label: '上下标',
    latex: 'A_{i}^{2}',
    description: '上下标组合结构',
    keywords: ['上下标', 'subsup']
  },
  {
    id: 'math-sum',
    domain: 'math',
    category: '大型运算',
    label: '求和',
    latex: '\\sum_{i=1}^{n}x_i',
    description: '带上下限的求和公式',
    keywords: ['求和', 'sum']
  },
  {
    id: 'math-integral',
    domain: 'math',
    category: '大型运算',
    label: '积分',
    latex: '\\int_{a}^{b}f(x)dx',
    description: '定积分结构',
    keywords: ['积分', 'integral']
  },
  {
    id: 'math-limit',
    domain: 'math',
    category: '大型运算',
    label: '极限',
    latex: '\\lim_{x\\to 0}f(x)',
    description: '极限表达式',
    keywords: ['极限', 'limit']
  },
  {
    id: 'math-matrix-2x2',
    domain: 'math',
    category: '矩阵',
    label: '2x2 矩阵',
    latex: '\\begin{matrix}a&b\\\\c&d\\end{matrix}',
    description: '二阶矩阵模板',
    keywords: ['矩阵', 'matrix']
  },
  {
    id: 'math-equation-group',
    domain: 'math',
    category: '方程',
    label: '方程组',
    latex: '\\begin{cases}x+y=1\\\\x-y=0\\end{cases}',
    description: '二元方程组模板',
    keywords: ['方程组', 'cases']
  },
  {
    id: 'math-vector',
    domain: 'math',
    category: '符号',
    label: '向量',
    latex: '\\vec{v}',
    description: '向量符号',
    keywords: ['向量', 'vector']
  },
  {
    id: 'math-average',
    domain: 'math',
    category: '统计',
    label: '均值',
    latex: '\\bar{x}',
    description: '样本均值符号',
    keywords: ['均值', '平均值', 'mean']
  },
  {
    id: 'math-standard-deviation',
    domain: 'math',
    category: '统计',
    label: '标准差',
    latex: '\\sigma',
    description: '标准差或总体标准差符号',
    keywords: ['标准差', 'sigma']
  },
  {
    id: 'math-pi',
    domain: 'math',
    category: '希腊字母',
    label: 'π',
    latex: '\\pi',
    description: '圆周率或希腊字母 pi',
    keywords: ['圆周率', 'pi']
  },
  {
    id: 'math-mu',
    domain: 'math',
    category: '希腊字母',
    label: 'μ',
    latex: '\\mu',
    description: '微、均值或摩擦系数常用符号',
    keywords: ['微', 'mu']
  },
  {
    id: 'math-alpha',
    domain: 'math',
    category: '希腊字母',
    label: 'α',
    latex: '\\alpha',
    description: '希腊字母 alpha',
    keywords: ['alpha', '显著性']
  },
  {
    id: 'math-beta',
    domain: 'math',
    category: '希腊字母',
    label: 'β',
    latex: '\\beta',
    description: '希腊字母 beta',
    keywords: ['beta', '系数']
  },
  {
    id: 'math-approx',
    domain: 'math',
    category: '关系符',
    label: '约等于',
    latex: '\\approx',
    description: '约等于关系符',
    keywords: ['约等于', 'approx']
  },
  {
    id: 'math-less-equal',
    domain: 'math',
    category: '关系符',
    label: '小于等于',
    latex: '\\le',
    description: '小于等于关系符',
    keywords: ['小于等于', 'le']
  },
  {
    id: 'math-greater-equal',
    domain: 'math',
    category: '关系符',
    label: '大于等于',
    latex: '\\ge',
    description: '大于等于关系符',
    keywords: ['大于等于', 'ge']
  },
  {
    id: 'hospital-dose',
    domain: 'hospital',
    category: '剂量',
    label: '剂量',
    latex: 'mg/kg',
    description: '按体重计算的药物剂量单位',
    keywords: ['医院', '剂量', 'mg/kg', 'dose']
  },
  {
    id: 'hospital-dose-day',
    domain: 'hospital',
    category: '剂量',
    label: '日剂量',
    latex: 'mg/(kg\\cdot d)',
    description: '按体重和天数计算的日剂量单位',
    keywords: ['医院', '日剂量', 'mg/kg/day']
  },
  {
    id: 'hospital-infusion-rate',
    domain: 'hospital',
    category: '剂量',
    label: '输注速度',
    latex: 'mL/h',
    description: '静脉输注速度单位',
    keywords: ['医院', '输液', '滴速', 'infusion']
  },
  {
    id: 'hospital-bsa',
    domain: 'hospital',
    category: '体表面积',
    label: 'BSA',
    latex: 'BSA=\\sqrt{\\frac{H\\times W}{3600}}',
    description: 'Mosteller 体表面积估算公式',
    keywords: ['医院', '体表面积', 'BSA', 'Mosteller']
  },
  {
    id: 'hospital-bmi',
    domain: 'hospital',
    category: '体格指标',
    label: 'BMI',
    latex: 'BMI=\\frac{W}{H^2}',
    description: '体重指数公式',
    keywords: ['医院', 'BMI', '体重指数']
  },
  {
    id: 'hospital-egfr',
    domain: 'hospital',
    category: '肾功能',
    label: 'eGFR',
    latex: 'eGFR=mL/(min\\cdot1.73m^2)',
    description: '估算肾小球滤过率单位表达',
    keywords: ['医院', '肾功能', 'eGFR']
  },
  {
    id: 'hospital-crcl',
    domain: 'hospital',
    category: '肾功能',
    label: 'CrCl',
    latex: 'CrCl=\\frac{(140-age)\\times W}{72\\times SCr}',
    description: '肌酐清除率估算模板',
    keywords: ['医院', '肌酐清除率', 'CrCl']
  },
  {
    id: 'hospital-concentration',
    domain: 'hospital',
    category: '检验',
    label: '浓度',
    latex: 'mmol/L',
    description: '检验报告常用物质浓度单位',
    keywords: ['医院', '浓度', 'mmol/L', 'concentration']
  },
  {
    id: 'hospital-blood-cell-count',
    domain: 'hospital',
    category: '检验',
    label: '细胞计数',
    latex: '\\times10^9/L',
    description: '血常规白细胞、血小板等计数单位',
    keywords: ['医院', '血常规', '细胞计数']
  },
  {
    id: 'hospital-enzyme-unit',
    domain: 'hospital',
    category: '检验',
    label: '酶活性',
    latex: 'U/L',
    description: '肝酶、心肌酶等酶活性单位',
    keywords: ['医院', '酶', 'U/L']
  },
  {
    id: 'hospital-hba1c',
    domain: 'hospital',
    category: '检验',
    label: 'HbA1c',
    latex: 'HbA1c\\%',
    description: '糖化血红蛋白百分比表达',
    keywords: ['医院', '糖化血红蛋白', 'HbA1c']
  },
  {
    id: 'hospital-blood-pressure',
    domain: 'hospital',
    category: '生命体征',
    label: '血压',
    latex: 'mmHg',
    description: '血压单位',
    keywords: ['医院', '血压', 'mmHg']
  },
  {
    id: 'hospital-heart-rate',
    domain: 'hospital',
    category: '生命体征',
    label: '心率',
    latex: 'bpm',
    description: '心率单位',
    keywords: ['医院', '心率', 'bpm']
  },
  {
    id: 'hospital-spo2',
    domain: 'hospital',
    category: '生命体征',
    label: '血氧',
    latex: 'SpO_2\\%',
    description: '外周血氧饱和度表达',
    keywords: ['医院', '血氧', 'SpO2']
  },
  {
    id: 'hospital-stat-p',
    domain: 'hospital',
    category: '统计',
    label: 'P 值',
    latex: 'P<0.05',
    description: '医学统计显著性表达',
    keywords: ['医院', '统计', 'P值', 'p value']
  },
  {
    id: 'hospital-confidence-interval',
    domain: 'hospital',
    category: '统计',
    label: '95%CI',
    latex: '95\\%CI',
    description: '医学统计置信区间表达',
    keywords: ['医院', '统计', '置信区间', 'CI']
  },
  {
    id: 'hospital-odds-ratio',
    domain: 'hospital',
    category: '统计',
    label: 'OR',
    latex: 'OR=\\frac{ad}{bc}',
    description: '优势比模板',
    keywords: ['医院', '统计', 'OR', 'odds ratio']
  },
  {
    id: 'hospital-relative-risk',
    domain: 'hospital',
    category: '统计',
    label: 'RR',
    latex: 'RR=\\frac{a/(a+b)}{c/(c+d)}',
    description: '相对危险度模板',
    keywords: ['医院', '统计', 'RR', 'relative risk']
  },
  {
    id: 'hospital-sensitivity',
    domain: 'hospital',
    category: '诊断试验',
    label: '敏感度',
    latex: 'Se=\\frac{TP}{TP+FN}',
    description: '诊断试验敏感度公式',
    keywords: ['医院', '诊断试验', '敏感度', 'sensitivity']
  },
  {
    id: 'hospital-specificity',
    domain: 'hospital',
    category: '诊断试验',
    label: '特异度',
    latex: 'Sp=\\frac{TN}{TN+FP}',
    description: '诊断试验特异度公式',
    keywords: ['医院', '诊断试验', '特异度', 'specificity']
  },
  {
    id: 'factory-tolerance',
    domain: 'factory',
    category: '公差',
    label: '公差',
    latex: '\\pm 0.01',
    description: '制造和质检常用尺寸公差',
    keywords: ['工厂', '公差', 'tolerance']
  },
  {
    id: 'factory-fit-clearance',
    domain: 'factory',
    category: '公差',
    label: '配合间隙',
    latex: 'C=D_{hole}-D_{shaft}',
    description: '孔轴配合间隙计算',
    keywords: ['工厂', '配合', '间隙']
  },
  {
    id: 'factory-dimensional-deviation',
    domain: 'factory',
    category: '公差',
    label: '尺寸偏差',
    latex: '\\Delta=L-L_0',
    description: '实际尺寸与基准尺寸偏差',
    keywords: ['工厂', '尺寸偏差', 'deviation']
  },
  {
    id: 'factory-roughness',
    domain: 'factory',
    category: '工艺',
    label: '粗糙度',
    latex: 'Ra\\le 1.6',
    description: '机械加工表面粗糙度表达',
    keywords: ['工厂', '粗糙度', 'Ra']
  },
  {
    id: 'factory-feed-rate',
    domain: 'factory',
    category: '工艺',
    label: '进给量',
    latex: 'f=\\frac{v_f}{n}',
    description: '机加工进给量计算模板',
    keywords: ['工厂', '进给量', 'feed']
  },
  {
    id: 'factory-cutting-speed',
    domain: 'factory',
    category: '工艺',
    label: '切削速度',
    latex: 'v=\\frac{\\pi D n}{1000}',
    description: '切削速度计算模板',
    keywords: ['工厂', '切削速度', 'cutting speed']
  },
  {
    id: 'factory-pressure',
    domain: 'factory',
    category: '过程参数',
    label: '压力',
    latex: 'P=\\frac{F}{A}',
    description: '压力计算公式',
    keywords: ['工厂', '压力', 'pressure']
  },
  {
    id: 'factory-flow-rate',
    domain: 'factory',
    category: '过程参数',
    label: '流量',
    latex: 'Q=\\frac{V}{t}',
    description: '体积流量公式',
    keywords: ['工厂', '流量', 'flow']
  },
  {
    id: 'factory-temperature',
    domain: 'factory',
    category: '过程参数',
    label: '温度',
    latex: 'T=^{\\circ}C',
    description: '摄氏温度表达模板',
    keywords: ['工厂', '温度', 'temperature']
  },
  {
    id: 'factory-density',
    domain: 'factory',
    category: '物性',
    label: '密度',
    latex: '\\rho=\\frac{m}{V}',
    description: '密度公式',
    keywords: ['工厂', '密度', 'density']
  },
  {
    id: 'factory-viscosity',
    domain: 'factory',
    category: '物性',
    label: '黏度',
    latex: '\\mu=Pa\\cdot s',
    description: '动力黏度单位表达',
    keywords: ['工厂', '黏度', 'viscosity']
  },
  {
    id: 'chemistry-chemical-reaction',
    domain: 'chemistry',
    category: '化学',
    label: '反应式',
    latex: 'A+B\\rightarrow C',
    description: '化工生产反应式模板',
    keywords: ['工厂', '化学式', '反应式', 'reaction']
  },
  {
    id: 'chemistry-concentration',
    domain: 'chemistry',
    category: '化学',
    label: '质量浓度',
    latex: 'C=\\frac{m}{V}',
    description: '质量浓度计算模板',
    keywords: ['工厂', '化学', '浓度', 'concentration']
  },
  {
    id: 'chemistry-ph',
    domain: 'chemistry',
    category: '化学',
    label: 'pH',
    latex: 'pH=-\\log[H^+]',
    description: '酸碱度公式',
    keywords: ['工厂', '化学', 'pH']
  },
  {
    id: 'factory-yield',
    domain: 'factory',
    category: '质量',
    label: '良率',
    latex: 'Y=\\frac{N_{ok}}{N_{total}}\\times100\\%',
    description: '生产良率计算',
    keywords: ['工厂', '良率', 'yield']
  },
  {
    id: 'factory-defect-rate',
    domain: 'factory',
    category: '质量',
    label: '不良率',
    latex: 'D=\\frac{N_{ng}}{N_{total}}\\times100\\%',
    description: '生产不良率计算',
    keywords: ['工厂', '不良率', 'defect']
  },
  {
    id: 'factory-cpk',
    domain: 'factory',
    category: '质量',
    label: 'Cpk',
    latex: 'Cpk=\\min\\left(\\frac{USL-\\mu}{3\\sigma},\\frac{\\mu-LSL}{3\\sigma}\\right)',
    description: '过程能力指数 Cpk',
    keywords: ['工厂', '过程能力', 'Cpk']
  },
  {
    id: 'factory-oee',
    domain: 'factory',
    category: '设备',
    label: 'OEE',
    latex: 'OEE=A\\times P\\times Q',
    description: '设备综合效率',
    keywords: ['工厂', '设备效率', 'OEE']
  },
  {
    id: 'factory-torque',
    domain: 'factory',
    category: '设备',
    label: '扭矩',
    latex: 'M=F\\times r',
    description: '扭矩计算公式',
    keywords: ['工厂', '扭矩', 'torque']
  },
  {
    id: 'factory-rpm',
    domain: 'factory',
    category: '设备',
    label: '转速',
    latex: 'r/min',
    description: '设备转速单位',
    keywords: ['工厂', '转速', 'rpm']
  }
]

/** 数学公式补充项，覆盖常用计算模板。 */
const ADDITIONAL_MATH_FORMULA_SYMBOL_LIST: IFormulaSymbol[] = [
  {
    id: 'math-pythagorean',
    domain: 'math',
    category: '几何',
    label: '勾股定理',
    latex: 'a^{2}+b^{2}=c^{2}',
    description: '直角三角形三边关系',
    keywords: ['数学', '几何', '勾股定理', 'pythagorean']
  },
  {
    id: 'math-quadratic-formula',
    domain: 'math',
    category: '方程',
    label: '二次公式',
    latex: 'x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}',
    description: '一元二次方程求根公式',
    keywords: ['数学', '方程', '二次公式', 'quadratic']
  },
  {
    id: 'math-circle-area',
    domain: 'math',
    category: '几何',
    label: '圆面积',
    latex: 'S=\\pi r^{2}',
    description: '圆面积计算公式',
    keywords: ['数学', '几何', '圆面积', 'area']
  },
  {
    id: 'math-circle-perimeter',
    domain: 'math',
    category: '几何',
    label: '圆周长',
    latex: 'C=2\\pi r',
    description: '圆周长计算公式',
    keywords: ['数学', '几何', '圆周长', 'perimeter']
  },
  {
    id: 'math-arithmetic-mean',
    domain: 'math',
    category: '统计',
    label: '算术平均值',
    latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i',
    description: '样本算术平均值',
    keywords: ['数学', '统计', '平均值', 'mean']
  },
  {
    id: 'math-variance',
    domain: 'math',
    category: '统计',
    label: '方差',
    latex: '\\sigma^{2}=\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2',
    description: '总体方差公式',
    keywords: ['数学', '统计', '方差', 'variance']
  },
  {
    id: 'math-standard-deviation-formula',
    domain: 'math',
    category: '统计',
    label: '标准差',
    latex: '\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2}',
    description: '总体标准差公式',
    keywords: ['数学', '统计', '标准差', 'standard deviation']
  },
  {
    id: 'math-combination',
    domain: 'math',
    category: '组合',
    label: '组合数',
    latex: 'C_n^k=\\frac{n!}{k!(n-k)!}',
    description: '组合数计算公式',
    keywords: ['数学', '组合', '组合数', 'combination']
  },
  {
    id: 'math-permutation',
    domain: 'math',
    category: '组合',
    label: '排列数',
    latex: 'A_n^k=\\frac{n!}{(n-k)!}',
    description: '排列数计算公式',
    keywords: ['数学', '排列', 'permutation']
  },
  {
    id: 'math-logarithm',
    domain: 'math',
    category: '函数',
    label: '对数换底',
    latex: '\\log_a b=\\frac{\\log_c b}{\\log_c a}',
    description: '对数换底公式',
    keywords: ['数学', '函数', '对数', 'log']
  }
]

/** 物理公式库，覆盖力学、电学、热学、波动和相对论常用表达。 */
const PHYSICS_FORMULA_SYMBOL_LIST: IFormulaSymbol[] = [
  {
    id: 'physics-newton-second-law',
    domain: 'physics',
    category: '力学',
    label: '牛顿第二定律',
    latex: 'F=ma',
    description: '力、质量和加速度关系',
    keywords: ['物理', '力学', '牛顿第二定律', 'force']
  },
  {
    id: 'physics-velocity',
    domain: 'physics',
    category: '运动学',
    label: '速度',
    latex: 'v=\\frac{s}{t}',
    description: '位移与时间的比值',
    keywords: ['物理', '速度', 'velocity']
  },
  {
    id: 'physics-acceleration',
    domain: 'physics',
    category: '运动学',
    label: '加速度',
    latex: 'a=\\frac{\\Delta v}{\\Delta t}',
    description: '速度变化率',
    keywords: ['物理', '加速度', 'acceleration']
  },
  {
    id: 'physics-kinetic-energy',
    domain: 'physics',
    category: '能量',
    label: '动能',
    latex: 'E_k=\\frac{1}{2}mv^{2}',
    description: '经典力学动能公式',
    keywords: ['物理', '动能', 'kinetic energy']
  },
  {
    id: 'physics-potential-energy',
    domain: 'physics',
    category: '能量',
    label: '重力势能',
    latex: 'E_p=mgh',
    description: '近地面重力势能公式',
    keywords: ['物理', '势能', 'potential energy']
  },
  {
    id: 'physics-momentum',
    domain: 'physics',
    category: '力学',
    label: '动量',
    latex: 'p=mv',
    description: '动量定义式',
    keywords: ['物理', '动量', 'momentum']
  },
  {
    id: 'physics-work',
    domain: 'physics',
    category: '能量',
    label: '功',
    latex: 'W=Fs',
    description: '恒力做功公式',
    keywords: ['物理', '功', 'work']
  },
  {
    id: 'physics-power',
    domain: 'physics',
    category: '能量',
    label: '功率',
    latex: 'P=\\frac{W}{t}',
    description: '功率定义式',
    keywords: ['物理', '功率', 'power']
  },
  {
    id: 'physics-ohm-law',
    domain: 'physics',
    category: '电学',
    label: '欧姆定律',
    latex: 'U=IR',
    description: '电压、电流和电阻关系',
    keywords: ['物理', '电学', '欧姆定律', 'ohm']
  },
  {
    id: 'physics-electric-power',
    domain: 'physics',
    category: '电学',
    label: '电功率',
    latex: 'P=UI',
    description: '电功率计算公式',
    keywords: ['物理', '电功率', 'electric power']
  },
  {
    id: 'physics-heat',
    domain: 'physics',
    category: '热学',
    label: '热量',
    latex: 'Q=mc\\Delta T',
    description: '比热容热量公式',
    keywords: ['物理', '热学', '热量', 'heat']
  },
  {
    id: 'physics-wave',
    domain: 'physics',
    category: '波动',
    label: '波速',
    latex: 'v=\\lambda f',
    description: '波速、波长和频率关系',
    keywords: ['物理', '波动', '波速', 'wave']
  },
  {
    id: 'physics-gravitation',
    domain: 'physics',
    category: '力学',
    label: '万有引力',
    latex: 'F=G\\frac{m_1m_2}{r^2}',
    description: '万有引力定律',
    keywords: ['物理', '万有引力', 'gravitation']
  },
  {
    id: 'physics-pressure',
    domain: 'physics',
    category: '力学',
    label: '压强',
    latex: 'p=\\frac{F}{S}',
    description: '压强计算公式',
    keywords: ['物理', '压强', 'pressure']
  },
  {
    id: 'physics-mass-energy',
    domain: 'physics',
    category: '相对论',
    label: '质能方程',
    latex: 'E=mc^{2}',
    description: '质能等价关系',
    keywords: ['物理', '相对论', '质能方程']
  }
]

/** 化学公式库，覆盖物质的量、浓度、酸碱、气体、平衡和产率。 */
const ADDITIONAL_CHEMISTRY_FORMULA_SYMBOL_LIST: IFormulaSymbol[] = [
  {
    id: 'chemistry-mole-mass',
    domain: 'chemistry',
    category: '物质的量',
    label: '物质的量',
    latex: 'n=\\frac{m}{M}',
    description: '由质量和摩尔质量计算物质的量',
    keywords: ['化学', '物质的量', '摩尔', 'mole']
  },
  {
    id: 'chemistry-molar-mass',
    domain: 'chemistry',
    category: '物质的量',
    label: '摩尔质量',
    latex: 'M=\\frac{m}{n}',
    description: '摩尔质量计算公式',
    keywords: ['化学', '摩尔质量', 'molar mass']
  },
  {
    id: 'chemistry-molar-concentration',
    domain: 'chemistry',
    category: '浓度',
    label: '物质的量浓度',
    latex: 'c=\\frac{n}{V}',
    description: '物质的量浓度计算公式',
    keywords: ['化学', '浓度', 'molar concentration']
  },
  {
    id: 'chemistry-dilution',
    domain: 'chemistry',
    category: '浓度',
    label: '稀释公式',
    latex: 'c_1V_1=c_2V_2',
    description: '溶液稀释前后物质的量守恒',
    keywords: ['化学', '稀释', '浓度']
  },
  {
    id: 'chemistry-mass-fraction',
    domain: 'chemistry',
    category: '浓度',
    label: '质量分数',
    latex: 'w=\\frac{m_s}{m}\\times100\\%',
    description: '溶质质量分数计算公式',
    keywords: ['化学', '质量分数', 'mass fraction']
  },
  {
    id: 'chemistry-poh',
    domain: 'chemistry',
    category: '酸碱',
    label: 'pOH',
    latex: 'pOH=-\\log[OH^-]',
    description: '氢氧根离子浓度的负对数',
    keywords: ['化学', '酸碱', 'pOH']
  },
  {
    id: 'chemistry-kw',
    domain: 'chemistry',
    category: '酸碱',
    label: '水离子积',
    latex: 'K_w=[H^+][OH^-]',
    description: '水的离子积表达式',
    keywords: ['化学', '酸碱', '离子积', 'Kw']
  },
  {
    id: 'chemistry-ideal-gas',
    domain: 'chemistry',
    category: '气体',
    label: '理想气体',
    latex: 'PV=nRT',
    description: '理想气体状态方程',
    keywords: ['化学', '气体', '理想气体', 'ideal gas']
  },
  {
    id: 'chemistry-gas-density',
    domain: 'chemistry',
    category: '气体',
    label: '气体密度',
    latex: '\\rho=\\frac{PM}{RT}',
    description: '理想气体密度计算公式',
    keywords: ['化学', '气体密度', 'density']
  },
  {
    id: 'chemistry-avogadro',
    domain: 'chemistry',
    category: '物质的量',
    label: '粒子数',
    latex: 'N=nN_A',
    description: '物质的量与粒子数关系',
    keywords: ['化学', '阿伏伽德罗', 'Avogadro']
  },
  {
    id: 'chemistry-equilibrium',
    domain: 'chemistry',
    category: '平衡',
    label: '平衡常数',
    latex: 'K_c=\\frac{[C]^c[D]^d}{[A]^a[B]^b}',
    description: '化学平衡常数表达式',
    keywords: ['化学', '平衡常数', 'equilibrium']
  },
  {
    id: 'chemistry-reaction-rate',
    domain: 'chemistry',
    category: '反应速率',
    label: '反应速率',
    latex: 'v=\\frac{\\Delta c}{\\Delta t}',
    description: '浓度随时间变化的反应速率',
    keywords: ['化学', '反应速率', 'rate']
  },
  {
    id: 'chemistry-yield',
    domain: 'chemistry',
    category: '产率',
    label: '产率',
    latex: '\\eta=\\frac{m_{actual}}{m_{theory}}\\times100\\%',
    description: '实际产量与理论产量比值',
    keywords: ['化学', '产率', 'yield']
  },
  {
    id: 'chemistry-enthalpy',
    domain: 'chemistry',
    category: '热化学',
    label: '反应焓',
    latex: '\\Delta H=H_{products}-H_{reactants}',
    description: '反应物和生成物焓变',
    keywords: ['化学', '反应焓', 'enthalpy']
  }
]

/** 工厂公式补充项，覆盖生产节拍、产能和设备利用率。 */
const ADDITIONAL_FACTORY_FORMULA_SYMBOL_LIST: IFormulaSymbol[] = [
  {
    id: 'factory-cycle-time',
    domain: 'factory',
    category: '生产',
    label: '节拍',
    latex: 'CT=\\frac{t}{N}',
    description: '单位产品生产节拍计算',
    keywords: ['工厂', '节拍', 'cycle time']
  },
  {
    id: 'factory-capacity',
    domain: 'factory',
    category: '生产',
    label: '产能',
    latex: 'Cap=\\frac{N}{t}',
    description: '单位时间产出能力',
    keywords: ['工厂', '产能', 'capacity']
  },
  {
    id: 'factory-utilization',
    domain: 'factory',
    category: '设备',
    label: '稼动率',
    latex: 'A=\\frac{T_{run}}{T_{plan}}\\times100\\%',
    description: '设备运行时间占计划时间比例',
    keywords: ['工厂', '稼动率', 'utilization']
  }
]

/** 获取对外可见公式库，合并数学、物理、化学、医院和工厂公式。 */
function getVisibleFormulaSymbolList() {
  return [
    ...BUILTIN_FORMULA_SYMBOL_LIST,
    ...ADDITIONAL_MATH_FORMULA_SYMBOL_LIST,
    ...PHYSICS_FORMULA_SYMBOL_LIST,
    ...ADDITIONAL_CHEMISTRY_FORMULA_SYMBOL_LIST,
    ...ADDITIONAL_FACTORY_FORMULA_SYMBOL_LIST
  ]
}

/** 查询内置公式符号库，可按专业领域过滤。 */
export function getFormulaSymbolList(
  domain?: FormulaDomain
): IFormulaSymbol[] {
  const visibleSymbolList = getVisibleFormulaSymbolList()
  if (!domain) {
    return visibleSymbolList.slice()
  }
  return visibleSymbolList.filter(symbol => symbol.domain === domain)
}
