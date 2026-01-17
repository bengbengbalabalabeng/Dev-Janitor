/**
 * Security Module - 安全模块入口
 *
 * 导出所有安全相关的验证器和管理器。
 *
 * @module security
 */

// Command Validator - Shell 命令验证
export {
  CommandValidator,
  commandValidator,
  validateIPCSender,
  ALLOWED_COMMANDS,
  DANGEROUS_PATTERNS,
  type CommandValidationResult,
  type ICommandValidator,
} from './commandValidator';

// Input Validator - IPC 参数验证
export {
  InputValidator,
  inputValidator,
  NPM_PACKAGE_PATTERN,
  PIP_PACKAGE_PATTERN,
  PATH_TRAVERSAL_PATTERN,
  VALID_PACKAGE_MANAGERS,
  type ValidationResult,
  type PackageManagerType,
  type IInputValidator,
} from './inputValidator';

// CSP Manager - 内容安全策略
export {
  CSPManager,
  cspManager,
  CSP_POLICY,
  type CSPConfig,
  type CSPDirective,
  type ICSPManager,
} from './cspManager';
