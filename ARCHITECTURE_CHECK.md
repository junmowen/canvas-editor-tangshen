# Architecture Check 强化规则

## 1. 目标

Architecture Check 用于在代码进入主分支前，自动发现架构层面的破坏性变更，避免以下问题：

- 模块边界被绕过
- 高层模块依赖低层实现细节
- 领域逻辑泄漏到 UI、接口层或基础设施层
- 共享模块膨胀成万能工具箱
- 循环依赖、反向依赖、跨层调用失控
- 未经评审引入新的全局状态、单例、静态工具类
- 新增代码绕开既有抽象和扩展点

## 2. 分层依赖规则

推荐基础分层如下：

```text
presentation / ui
application / usecase
domain
infrastructure
shared
```

### 允许依赖方向

```text
presentation -> application
application -> domain
application -> infrastructure interface
infrastructure -> domain
shared -> 不依赖业务层
```

### 禁止依赖方向

```text
domain -> application
domain -> presentation
domain -> infrastructure
infrastructure -> presentation
shared -> business modules
```

任何违反依赖方向的 import、调用、类型引用，都应阻断合并。

## 3. 模块边界规则

每个业务模块必须通过公开出口暴露能力，例如：

```text
module-a/
  index.ts
  public-api.ts
```

禁止外部模块直接引用内部文件：

```ts
// 禁止
import { UserEntity } from "@/modules/user/internal/entity";

// 允许
import { UserEntity } from "@/modules/user";
```

检查规则：

- 只能引用模块公开 API
- 禁止跨模块访问 `internal`、`private`、`impl`、`repository`、`adapter` 等目录
- 禁止为了复用小函数而直接引用其他模块内部实现
- 公共能力应沉淀到明确的 shared 子模块，而不是随意跨模块调用

## 4. Domain 规则

Domain 层必须保持纯净。

禁止：

- 访问数据库、HTTP、本地存储、浏览器 API
- 引入 UI 框架、状态管理框架、路由框架
- 读取环境变量
- 直接依赖基础设施实现
- 依赖 application/usecase 层
- 使用全局单例承载业务状态

允许：

- 实体
- 值对象
- 领域服务
- 领域事件
- 业务规则校验
- 接口定义，例如 repository port

示例：

```ts
// 允许
export interface UserRepository {
  findById(id: UserId): Promise<User>;
}

// 禁止
import { PrismaClient } from "@prisma/client";
```

## 5. Application 规则

Application 层负责组织业务流程，不应承载复杂领域规则。

检查重点：

- usecase 可以调用 domain
- usecase 可以依赖 repository interface
- usecase 不应直接写 SQL、HTTP 请求、localStorage、DOM 操作
- usecase 不应包含大量 if/else 业务规则，应下沉到 domain
- usecase 不应依赖具体 UI 组件或页面状态

## 6. Infrastructure 规则

Infrastructure 层负责技术实现。

允许：

- DB client
- HTTP client
- cache
- file system
- third-party SDK
- repository implementation

禁止：

- 反向调用 UI
- 承载业务规则
- 修改 domain 对象的内部不变量
- 被 domain 直接依赖

## 7. Shared 规则

Shared 必须保持稳定、通用、无业务语义。

允许：

```text
shared/utils
shared/types
shared/logger
shared/config
shared/ui
```

禁止：

- 放入具体业务逻辑
- 出现业务模块名称
- 依赖业务模块
- 成为跨模块调用的绕路通道
- 无限制增加 `common.ts`、`helper.ts`、`utils.ts`

新增 shared 内容必须满足：

- 至少两个以上模块真实复用
- 不包含业务上下文
- 有明确命名和边界
- 不引入反向依赖

## 8. 循环依赖规则

禁止任何形式的循环依赖：

```text
module-a -> module-b -> module-a
domain -> shared -> domain
application -> infrastructure -> application
```

CI 中应强制检测：

- 文件级循环依赖
- 模块级循环依赖
- package 级循环依赖

发现循环依赖必须阻断合并。

## 9. 新增依赖规则

新增第三方依赖必须检查：

- 是否已有同类依赖
- 是否破坏现有架构边界
- 是否只用于单个简单场景
- 是否引入全局副作用
- 是否影响 bundle size / runtime size
- 是否需要 adapter 隔离

禁止业务代码直接大面积依赖第三方 SDK，应通过 adapter 或 port 包装。

```ts
// 推荐
paymentService.pay(order);

// 避免
stripe.paymentIntents.create(...);
```

## 10. 全局状态规则

禁止随意新增：

- 全局变量
- 单例服务
- 静态 mutable state
- 全局 event bus
- 无边界 store
- 隐式注册中心

允许全局状态的场景必须明确：

- 生命周期
- 所属模块
- 初始化位置
- 清理机制
- 测试隔离方案

## 11. 文件与目录规则

禁止出现以下低质量结构：

```text
utils.ts
helper.ts
common.ts
service.ts
manager.ts
misc.ts
index2.ts
new.ts
temp.ts
```

除非已有明确上下文，例如：

```text
date-utils.ts
user-permission-service.ts
canvas-selection-manager.ts
```

目录命名应表达架构角色：

```text
domain/
application/
infrastructure/
components/
adapters/
ports/
repositories/
```

## 12. Pull Request 检查项

每个 PR 需要回答：

```md
## Architecture Check

- [ ] 是否新增跨模块依赖？
- [ ] 是否绕过模块 public API？
- [ ] 是否新增 shared 内容？如果是，是否无业务语义？
- [ ] 是否新增第三方依赖？
- [ ] 是否引入全局状态？
- [ ] 是否存在循环依赖？
- [ ] 是否有 domain 依赖 infrastructure / UI？
- [ ] 是否有 application 承载复杂业务规则？
- [ ] 是否修改了模块边界？
- [ ] 是否需要架构评审？
```

## 13. 阻断级别

### Blocker

必须阻断合并：

- 循环依赖
- 反向依赖
- domain 依赖 UI / infrastructure
- 跨模块访问 internal 文件
- 未评审新增全局状态
- 未隔离第三方 SDK 大面积侵入业务代码

### Warning

需要说明原因，可允许合并：

- 新增 shared 工具
- 新增 adapter
- 新增依赖
- 调整 public API
- 新增较复杂 usecase

### Info

仅提示：

- 文件命名不够清晰
- 模块内职责略重
- 可复用逻辑尚未抽象

## 14. CI 建议

建议接入以下检查：

```text
1. dependency-cruiser / madge 检查依赖方向和循环依赖
2. eslint no-restricted-imports 限制跨层 import
3. package boundary rule 限制模块访问 public API
4. custom script 检查 shared 目录业务依赖
5. PR template 强制填写 architecture checklist
```

CI 阶段建议分为：

```text
lint
test
architecture-check
build
```

其中 `architecture-check` 失败时禁止合并。

## 15. 豁免机制

如确实需要临时突破规则，必须添加架构豁免说明：

```md
## Architecture Exception

原因：
影响范围：
替代方案：
计划移除时间：
负责人：
```

豁免必须满足：

- 有明确过期时间
- 有 owner
- 有追踪 issue
- 不允许长期存在
- 不允许用豁免掩盖设计问题

## 16. 最终原则

Architecture Check 的核心不是限制开发，而是保护系统长期可维护性。

所有代码变更应满足：

```text
依赖方向清晰
模块边界稳定
业务逻辑位置正确
技术细节被隔离
共享能力不过度膨胀
变更影响范围可预测
```
