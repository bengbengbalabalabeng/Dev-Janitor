# Implementation Plan: Code Health Fixes

## Overview

本实现计划将代码健康修复分为 6 个阶段，按优先级顺序执行：
1. 关键安全修复
2. 内存泄漏修复
3. 性能优化
4. UI/UX 改进
5. Electron 特定修复
6. 代码质量改进

## Tasks

- [ ] 1. 安全基础设施搭建
  - [x] 1.1 创建安全模块目录结构 `src/main/security/`
    - 创建 `commandValidator.ts`, `inputValidator.ts`, `cspManager.ts`
    - _Requirements: 1.1, 1.4, 2.5, 3.1_
  
  - [x] 1.2 实现 Command Validator
    - 实现命令白名单验证
    - 实现危险字符检测
    - 实现参数转义函数
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [ ]* 1.3 编写 Command Validator 属性测试
    - **Property 1: 命令验证安全性**
    - **Property 2: 参数转义完整性**
    - **Validates: Requirements 1.1, 1.2, 1.5**
  
  - [x] 1.4 实现 Input Validator
    - 实现包名格式验证 (npm/pip)
    - 实现 PID 验证
    - 实现路径遍历检测
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 1.5 编写 Input Validator 属性测试
    - **Property 3: 输入验证覆盖性**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2. Checkpoint - 安全验证器测试
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. CSP 和 IPC 安全加固
  - [x] 3.1 实现 CSP Manager
    - 实现 Strict CSP 策略生成
    - 实现 nonce 生成
    - 使用 webRequest.onHeadersReceived 设置 CSP
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ]* 3.2 编写 CSP Manager 属性测试
    - **Property 4: CSP 脚本安全性**
    - **Validates: Requirements 3.2**
  
  - [x] 3.3 集成安全验证到 IPC Handlers
    - 在 `shell:execute-command` 添加命令验证
    - 在包管理 IPC 添加包名验证
    - 在服务管理 IPC 添加 PID 验证
    - 添加 IPC 发送者验证
    - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 2.4_
  
  - [x] 3.4 在主进程入口应用 CSP
    - 修改 `src/main/index.ts` 应用 CSP 到窗口
    - _Requirements: 3.1_

- [x] 4. Checkpoint - 安全集成测试
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. 内存泄漏修复
  - [x] 5.1 实现 LRU Cache Manager
    - 创建 `src/main/utils/cacheManager.ts`
    - 实现有界 LRU 缓存 (最大 1000 条目)
    - 实现过期清理机制
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [ ]* 5.2 编写 Cache Manager 属性测试
    - **Property 6: 缓存边界约束**
    - **Validates: Requirements 5.1, 5.2**
  
  - [x] 5.3 重构 ServiceMonitor 使用 LRU Cache
    - 替换 `processInfoCache` 为 BoundedLRUCache
    - 添加缓存清理定时器
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 5.4 修复 AIAssistantDrawer 内存泄漏
    - 添加 AbortController 管理异步操作
    - 确保 useEffect 清理函数正确移除监听器
    - 处理流式传输中断场景
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 5.5 编写 AIAssistantDrawer 清理测试
    - **Property 5: 事件监听器清理**
    - **Validates: Requirements 4.1, 4.4**

- [x] 6. Checkpoint - 内存泄漏修复验证
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 服务监控防抖优化
  - [x] 7.1 实现防抖服务监控
    - 添加 500ms 防抖逻辑
    - 实现窗口可见性检测
    - 实现后台降频 (30 秒)
    - 实现强制刷新绕过防抖
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 7.2 编写防抖属性测试
    - **Property 7: 防抖合并行为**
    - **Validates: Requirements 6.1**

- [ ] 8. PackageTable 性能优化
  - [x] 8.1 添加 useMemo 缓存版本比较
    - 使用 useMemo 缓存 compareVersions 结果
    - _Requirements: 7.1_
  
  - [x] 8.2 添加 useCallback 包装事件处理器
    - 包装 handleCheckVersion, handleUpdatePackage, handleCopyLocation 等
    - _Requirements: 7.2_
  
  - [ ]* 8.3 编写 PackageTable 性能属性测试
    - **Property 8: 版本比较记忆化**
    - **Property 9: 选择性行重渲染**
    - **Validates: Requirements 7.1, 7.3**
  
  - [x] 8.4 实现版本检查进度指示
    - 添加进度条组件
    - 显示已检查/总数
    - 实现取消功能
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ]* 8.5 编写进度显示属性测试
    - **Property 11: 进度显示准确性**
    - **Validates: Requirements 8.2**

- [x] 9. Checkpoint - 性能优化验证
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. UI/UX 改进
  - [x] 10.1 实现 Markdown Error Boundary
    - 创建 `src/renderer/components/AI/MarkdownErrorBoundary.tsx`
    - 实现错误捕获和降级 UI
    - 实现重试功能
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 10.2 编写 Error Boundary 属性测试
    - **Property 12: 错误边界捕获**
    - **Validates: Requirements 9.2**
  
  - [x] 10.3 集成 Error Boundary 到 AIAssistantDrawer
    - 在 Markdown 渲染区域包裹 MarkdownErrorBoundary
    - _Requirements: 9.1_
  
  - [x] 10.4 修复 AIConfigSection 响应式设计
    - 添加响应式断点处理
    - 小屏幕垂直布局
    - 按钮组堆叠显示
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 11. Electron 特定修复
  - [x] 11.1 修复 macOS IPC 处理器清理
    - 修改 `window-all-closed` 事件处理
    - 确保 `before-quit` 正确清理
    - 防止重复注册
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 11.2 编写 IPC 处理器唯一性测试
    - **Property 13: IPC 处理器唯一性**
    - **Validates: Requirements 11.4**
  
  - [x] 11.3 添加 Preload 脚本错误处理
    - 使用 try-catch 包裹 contextBridge.exposeInMainWorld
    - 添加详细错误日志
    - 实现降级功能
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [x] 11.4 实现 IPC 调用超时
    - 创建 `src/renderer/ipc/ipcClientWithTimeout.ts`
    - 实现 30 秒默认超时
    - 添加超时错误处理
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ]* 11.5 编写 IPC 超时属性测试
    - **Property 14: IPC 超时应用**
    - **Validates: Requirements 13.1**

- [x] 12. Checkpoint - Electron 修复验证
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. 代码质量改进
  - [x] 13.1 修复 App.tsx 错误反馈
    - 添加 AI 配置加载失败通知
    - 实现重试选项
    - 使用默认配置降级
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [ ]* 13.2 编写配置加载降级测试
    - **Property 15: 配置加载降级**
    - **Validates: Requirements 14.3**
  
  - [x] 13.3 实现统一错误响应格式
    - 创建 `src/shared/types/ipcResponse.ts`
    - 定义 IPCResponse 接口和错误代码
    - 重构 IPC 处理器使用统一格式
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  
  - [ ]* 13.4 编写统一错误响应属性测试
    - **Property 16: 统一错误响应格式**
    - **Validates: Requirements 15.1, 15.2, 15.4**
  
  - [x] 13.5 添加 Store 空值检查
    - 修改 loadPackages 处理 null/undefined
    - 添加类型验证
    - 添加警告日志
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ]* 13.6 编写 Store 空值安全属性测试
    - **Property 17: Store 空值安全**
    - **Validates: Requirements 16.1, 16.2**

- [x] 14. Final Checkpoint - 完整测试套件
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations)
- Unit tests validate specific examples and edge cases
- Security fixes (Tasks 1-4) should be prioritized and completed first
- Memory leak fixes (Tasks 5-6) are critical for application stability
