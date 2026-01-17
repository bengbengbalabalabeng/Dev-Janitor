# 需求文档

## 简介

本文档定义了 Dev-Janitor Electron 应用程序代码健康修复的需求。基于全面的代码审查，识别出 28 个问题，涵盖安全、性能、UI/UX 和代码质量等方面。本规范按优先级组织修复工作，确保关键安全和内存泄漏问题优先处理。

## 术语表

- **IPC_Handler**: Electron 主进程中处理进程间通信的模块
- **Command_Validator**: 验证和清理 shell 命令输入的安全组件
- **CSP_Manager**: 管理内容安全策略头的组件
- **Memory_Manager**: 负责清理事件监听器和缓存的组件
- **Service_Monitor**: 监控运行中开发服务的模块
- **Package_Table**: 显示包信息和版本状态的 React 组件
- **AI_Assistant_Drawer**: 提供 AI 分析功能的抽屉组件
- **Error_Boundary**: 捕获并处理 React 组件错误的边界组件
- **Debouncer**: 限制函数调用频率的工具

## 需求

### 需求 1: Shell 命令注入防护

**用户故事:** 作为应用程序管理员，我希望防止恶意命令执行，以保护用户系统安全。

#### 验收标准

1. WHEN 用户通过 `shell:execute-command` 提交命令 THEN Command_Validator SHALL 验证命令是否在允许列表中
2. WHEN 命令包含危险字符（如 `;`, `|`, `&`, `$`, `` ` ``）THEN Command_Validator SHALL 拒绝执行并返回错误
3. WHEN 命令验证失败 THEN IPC_Handler SHALL 记录安全警告日志
4. THE Command_Validator SHALL 维护一个允许执行的命令白名单
5. WHEN 命令通过验证 THEN Command_Validator SHALL 对参数进行转义处理

### 需求 2: IPC 参数验证

**用户故事:** 作为开发者，我希望所有 IPC 调用的参数都经过验证，以防止注入攻击。

#### 验收标准

1. WHEN 包名参数传入 IPC 处理器 THEN IPC_Handler SHALL 验证其符合有效包名格式
2. WHEN PID 参数传入服务管理 IPC THEN IPC_Handler SHALL 验证其为正整数
3. WHEN 路径参数传入 shell 操作 THEN IPC_Handler SHALL 验证路径不包含路径遍历字符
4. IF 参数验证失败 THEN IPC_Handler SHALL 返回描述性错误消息
5. THE IPC_Handler SHALL 使用类型安全的验证函数处理所有外部输入

### 需求 3: 内容安全策略

**用户故事:** 作为安全工程师，我希望应用程序设置 CSP 头，以防止 XSS 攻击。

#### 验收标准

1. WHEN 应用程序窗口创建时 THEN CSP_Manager SHALL 设置严格的 Content-Security-Policy 头
2. THE CSP_Manager SHALL 禁止内联脚本执行（除非使用 nonce）
3. THE CSP_Manager SHALL 限制资源加载来源为可信域
4. WHEN 开发模式运行时 THEN CSP_Manager SHALL 允许本地开发服务器连接

### 需求 4: AIAssistantDrawer 内存泄漏修复

**用户故事:** 作为用户，我希望 AI 助手组件不会造成内存泄漏，以保持应用程序性能稳定。

#### 验收标准

1. WHEN AIAssistantDrawer 组件卸载时 THEN Memory_Manager SHALL 清理所有流式传输事件监听器
2. WHEN 流式传输进行中组件被关闭 THEN Memory_Manager SHALL 取消正在进行的请求
3. THE AIAssistantDrawer SHALL 使用 AbortController 管理异步操作
4. WHEN 组件重新挂载时 THEN Memory_Manager SHALL 确保不存在重复的事件监听器

### 需求 5: ServiceMonitor 缓存清理

**用户故事:** 作为用户，我希望服务监控不会无限增长内存使用，以保持系统稳定。

#### 验收标准

1. THE Service_Monitor SHALL 限制 processInfoCache 的最大条目数为 1000
2. WHEN 缓存达到最大容量 THEN Service_Monitor SHALL 使用 LRU 策略移除最旧条目
3. WHEN 进程不再运行时 THEN Service_Monitor SHALL 从缓存中移除对应条目
4. THE Service_Monitor SHALL 每 5 分钟执行一次缓存清理

### 需求 6: 服务监控防抖

**用户故事:** 作为用户，我希望服务监控更新不会过度消耗系统资源。

#### 验收标准

1. WHEN 服务列表更新时 THEN Debouncer SHALL 合并 500ms 内的多次更新为一次
2. WHEN 存在大量服务时 THEN Service_Monitor SHALL 批量发送更新而非逐个发送
3. THE Service_Monitor SHALL 在窗口不可见时降低更新频率至 30 秒
4. WHEN 用户主动请求刷新时 THEN Service_Monitor SHALL 立即执行更新

### 需求 7: PackageTable 性能优化

**用户故事:** 作为用户，我希望包列表渲染流畅，不会因为版本比较而卡顿。

#### 验收标准

1. THE Package_Table SHALL 使用 useMemo 缓存 compareVersions 计算结果
2. THE Package_Table SHALL 使用 useCallback 包装所有事件处理函数
3. WHEN versionCache 更新时 THEN Package_Table SHALL 仅重新渲染受影响的行
4. THE Package_Table SHALL 使用虚拟滚动处理超过 100 个包的列表

### 需求 8: 版本检查进度指示

**用户故事:** 作为用户，我希望在批量检查版本时看到进度，以了解操作状态。

#### 验收标准

1. WHEN checkAllVersions 执行时 THEN Package_Table SHALL 显示进度条
2. THE 进度指示器 SHALL 显示已检查数量和总数量
3. WHEN 版本检查完成时 THEN Package_Table SHALL 显示完成通知
4. THE 用户 SHALL 能够取消正在进行的批量版本检查

### 需求 9: AIAssistantDrawer 错误边界

**用户故事:** 作为用户，我希望 Markdown 渲染错误不会导致整个 AI 助手崩溃。

#### 验收标准

1. THE AIAssistantDrawer SHALL 在 Markdown 渲染区域包裹 Error_Boundary
2. WHEN Markdown 渲染失败时 THEN Error_Boundary SHALL 显示友好的错误消息
3. THE Error_Boundary SHALL 提供重试按钮以重新渲染内容
4. WHEN 错误发生时 THEN Error_Boundary SHALL 记录错误详情到控制台

### 需求 10: AIConfigSection 响应式设计

**用户故事:** 作为用户，我希望 AI 配置界面在小屏幕上也能正常使用。

#### 验收标准

1. WHEN 屏幕宽度小于 768px THEN AIConfigSection SHALL 将 Space.Compact 改为垂直布局
2. THE 表单控件 SHALL 在移动设备上占满可用宽度
3. THE 按钮组 SHALL 在小屏幕上堆叠显示
4. THE AIConfigSection SHALL 使用 CSS 媒体查询或 Ant Design 响应式断点

### 需求 11: macOS IPC 处理器清理

**用户故事:** 作为 macOS 用户，我希望关闭窗口后 IPC 处理器被正确清理，以避免资源泄漏。

#### 验收标准

1. WHEN macOS 上所有窗口关闭时 THEN IPC_Handler SHALL 保持活跃直到应用退出
2. WHEN 用户通过 Cmd+Q 退出应用时 THEN IPC_Handler SHALL 执行完整清理
3. THE 应用程序 SHALL 在 `before-quit` 事件中清理所有 IPC 处理器
4. WHEN 窗口重新创建时 THEN IPC_Handler SHALL 不会重复注册

### 需求 12: Preload 脚本错误处理

**用户故事:** 作为开发者，我希望 preload 脚本的错误被正确记录，以便调试问题。

#### 验收标准

1. WHEN contextBridge.exposeInMainWorld 失败时 THEN Preload_Script SHALL 记录详细错误信息
2. THE Preload_Script SHALL 使用 try-catch 包裹所有 API 暴露操作
3. WHEN API 暴露失败时 THEN Preload_Script SHALL 提供降级功能或清晰的错误提示
4. THE 错误日志 SHALL 包含失败的 API 名称和错误堆栈

### 需求 13: IPC 调用超时处理

**用户故事:** 作为用户，我希望 IPC 调用不会无限等待，以避免界面卡死。

#### 验收标准

1. THE 渲染进程 SHALL 为所有 IPC 调用设置 30 秒默认超时
2. WHEN IPC 调用超时时 THEN 渲染进程 SHALL 显示超时错误消息
3. THE 用户 SHALL 能够重试超时的操作
4. WHEN 长时间操作进行时 THEN 渲染进程 SHALL 显示加载指示器

### 需求 14: App.tsx 错误反馈

**用户故事:** 作为用户，我希望 AI 配置加载失败时收到通知，以便采取行动。

#### 验收标准

1. WHEN AI 配置加载失败时 THEN App SHALL 显示用户可见的错误通知
2. THE 错误通知 SHALL 提供重试选项
3. WHEN 配置加载失败时 THEN App SHALL 使用默认配置继续运行
4. THE 错误消息 SHALL 清晰说明失败原因和建议操作

### 需求 15: 统一错误处理策略

**用户故事:** 作为开发者，我希望所有 IPC 处理器使用一致的错误处理模式，以提高代码可维护性。

#### 验收标准

1. THE IPC_Handler SHALL 定义统一的错误响应格式 `{ success: boolean, error?: string, data?: T }`
2. WHEN 错误发生时 THEN IPC_Handler SHALL 始终返回错误对象而非抛出异常
3. THE IPC_Handler SHALL 使用统一的错误日志格式
4. WHEN 返回空数组时 THEN IPC_Handler SHALL 区分"无数据"和"发生错误"两种情况

### 需求 16: Store 空值检查

**用户故事:** 作为开发者，我希望 Store 操作能安全处理空值，以避免运行时错误。

#### 验收标准

1. WHEN loadPackages 返回 null 或 undefined THEN Store SHALL 使用空数组作为默认值
2. THE Store SHALL 在设置状态前验证数据类型
3. WHEN IPC 返回意外数据类型时 THEN Store SHALL 记录警告并使用安全默认值
4. THE Store SHALL 提供类型安全的状态更新方法
