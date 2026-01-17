/**
 * Dev Janitor - Unified IPC Response Types
 * 
 * This module defines a unified error response format for all IPC handlers.
 * It ensures consistent error handling across the application.
 * 
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

/**
 * Error codes for IPC operations
 */
export enum IPCErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  COMMAND_REJECTED = 'COMMAND_REJECTED',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CANCELLED = 'CANCELLED',
}

/**
 * Error details structure for IPC responses
 */
export interface IPCError {
  code: IPCErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Unified IPC response format - Validates: Requirement 15.1
 */
export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: IPCError;
  timestamp: number;
}

/** Creates a successful IPC response */
export function createSuccessResponse<T>(data: T): IPCResponse<T> {
  return { success: true, data, timestamp: Date.now() };
}

/** Creates an error IPC response - Validates: Requirement 15.2 */
export function createErrorResponse(
  code: IPCErrorCode,
  message: string,
  details?: unknown
): IPCResponse<never> {
  return {
    success: false,
    error: { code, message, details },
    timestamp: Date.now(),
  };
}

/** Type guard for success responses */
export function isSuccessResponse<T>(
  response: IPCResponse<T>
): response is IPCResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/** Type guard for error responses */
export function isErrorResponse<T>(
  response: IPCResponse<T>
): response is IPCResponse<T> & { success: false; error: IPCError } {
  return response.success === false && response.error !== undefined;
}

/** Extracts data from response or throws */
export function unwrapResponse<T>(response: IPCResponse<T>): T {
  if (isSuccessResponse(response)) return response.data;
  const error = new Error(response.error?.message ?? 'Unknown error');
  (error as Error & { code?: IPCErrorCode }).code = response.error?.code;
  throw error;
}

/** Maps error code to user-friendly message - Validates: Requirement 15.3 */
export function getErrorMessage(code: IPCErrorCode): string {
  const messages: Record<IPCErrorCode, string> = {
    [IPCErrorCode.VALIDATION_ERROR]: '输入验证失败',
    [IPCErrorCode.COMMAND_REJECTED]: '命令被拒绝执行',
    [IPCErrorCode.TIMEOUT]: '操作超时',
    [IPCErrorCode.NOT_FOUND]: '未找到请求的资源',
    [IPCErrorCode.PERMISSION_DENIED]: '权限不足',
    [IPCErrorCode.INTERNAL_ERROR]: '内部错误',
    [IPCErrorCode.NETWORK_ERROR]: '网络连接错误',
    [IPCErrorCode.CANCELLED]: '操作已取消',
  };
  return messages[code] ?? '未知错误';
}
