# Changelog / 更新日志

All notable changes to Dev Janitor will be documented in this file.
本文件记录 Dev Janitor 的所有重要更新。

---

## [1.7.2] - 2026-01-22

### Fixed / 修复
- **AI CLI uninstall**: Fixed issue where deleted AI CLI tools still showed as installed after refresh
- **AI CLI 删除功能**: 修复删除 AI CLI 工具后刷新仍显示已安装的问题

### Changed / 变更
- **Font**: Use Google Fonts CDN (Noto Sans SC) for unified Chinese/English display
- **字体**: 使用 Google Fonts CDN 加载思源黑体，统一中英文显示效果
- **App icon**: Generate custom ICO icon, replace default system icon
- **应用图标**: 生成自定义 ICO 图标，替换系统默认图标

### Added / 新增
- **iFlow CLI**: Install/update/uninstall support for iFlow CLI
- **iFlow CLI**: AI CLI 工具现已支持 iFlow CLI 的安装/更新/卸载

---

## [1.7.1] - 2026-01-21

### Added / 新增
- SVN detection / SVN 版本控制工具检测
- uv Python package installer detection / uv Python 包管理器检测
- iFlow CLI support / iFlow CLI 支持

### Performance / 性能
- Lazy loading for all view components / 所有视图组件懒加载
- Image compression: 16MB → 0.6MB (96% reduction) / 图片压缩 96%

---

## [1.7.0] - 2026-01-21

### Added / 新增
- **Cache Cleaner**: Clean caches for 11 package managers (npm, yarn, pip, etc.)
- **缓存清理**: 支持清理 11 种包管理器缓存
- **Tool Uninstall**: One-click uninstall for development tools
- **工具卸载**: 一键卸载开发工具

---

## [1.6.1] - 2026-01-20

### Added / 新增
- Maven tool detection / Maven 工具检测

### Fixed / 修复
- Java version detection (stderr output) / Java 版本检测修复

### Changed / 变更
- Hide default Electron menu bar / 隐藏默认菜单栏
- Dynamic version display in About page / 关于页面动态显示版本号

---

## [1.5.x] - 2026-01-18

### Fixed / 修复
- White screen bug on production builds / 生产构建白屏问题
- Preload script loading failure / 预加载脚本加载失败
- AI API crash when electronAPI undefined / AI API 崩溃问题
- Language persistence on restart / 语言设置持久化
- Mac white screen issue / Mac 白屏问题

---

## [1.5.0] - 2026-01-18

### Added / 新增
- **Theme Support**: Light/Dark/System themes / 主题支持：亮色/暗色/跟随系统
- Package version cache persistence / 包版本缓存持久化

---

## [1.4.0] - 2026-01-17

### Added / 新增
- **Security**: Command validation, input sanitization, CSP / 安全增强
- **Performance**: LRU cache, debounced monitoring / 性能优化
- 402 tests passing / 402 个测试通过

---

## [1.2.0] - 2026-01-17

### Added / 新增
- **One-Click Update**: Direct package update for npm/pip / 一键更新 npm/pip 包

---

## [1.1.0] - 2026-01-17

### Added / 新增
- **Custom AI Provider**: Support for OpenAI-compatible endpoints / 自定义 AI 服务端点

---

## [1.0.0] - 2024-01-XX

### Added / 新增
- **AI Assistant**: Local rule-based analysis + optional OpenAI / AI 助手
- **Tool Detection**: 19+ development tools / 工具检测
- **Package Management**: npm, pip, Composer / 包管理
- **Service Monitoring**: Port detection, process control / 服务监控
- **Environment Variables**: PATH analysis / 环境变量分析
- **i18n**: English & Chinese / 中英文支持
- **Cross-Platform**: Windows, macOS, Linux / 跨平台支持

---

[1.7.2]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.7.2
[1.7.1]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.7.1
[1.7.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.7.0
[1.6.1]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.6.1
[1.5.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.5.0
[1.4.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.4.0
[1.2.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.2.0
[1.1.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.1.0
[1.0.0]: https://github.com/cocojojo5213/Dev-Janitor/releases/tag/v1.0.0
