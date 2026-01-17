/**
 * CSP Manager - 内容安全策略管理器
 *
 * 负责管理 Content Security Policy 头，防止 XSS 攻击。
 * 遵循 Electron 官方 2025/2026 安全指南和 MDN CSP 文档。
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4
 * @see https://www.electronjs.org/docs/latest/tutorial/security#7-define-a-content-security-policy
 */

import type { BrowserWindow } from 'electron';
import crypto from 'crypto';

/**
 * CSP 配置选项
 */
export interface CSPConfig {
  /** 是否为开发模式 */
  isDevelopment: boolean;
  /** 开发服务器 URL（开发模式时使用） */
  devServerUrl?: string;
  /** 用于动态脚本的 nonce */
  nonce?: string;
}

/**
 * CSP 管理器接口
 */
export interface ICSPManager {
  /**
   * 生成 CSP 头字符串
   * @param config - CSP 配置
   * @returns CSP 策略字符串
   */
  generateCSPHeader(config: CSPConfig): string;

  /**
   * 应用 CSP 到窗口
   * @param window - Electron BrowserWindow 实例
   * @param config - CSP 配置
   */
  applyToWindow(window: BrowserWindow, config: CSPConfig): void;

  /**
   * 生成随机 nonce
   * @returns 随机 nonce 字符串
   */
  generateNonce(): string;
}

/**
 * CSP 指令类型
 */
export type CSPDirective =
  | 'default-src'
  | 'script-src'
  | 'style-src'
  | 'img-src'
  | 'connect-src'
  | 'font-src'
  | 'object-src'
  | 'base-uri'
  | 'form-action'
  | 'frame-ancestors';

/**
 * CSP 策略模板 (Strict CSP - 2025/2026 推荐)
 *
 * 注意:
 * - 不使用 'unsafe-inline' 用于 script-src，使用 nonce 代替
 * - style-src 允许 'unsafe-inline' 因为 Ant Design 需要内联样式
 * - object-src 设为 'none' 禁止插件
 * - frame-ancestors 设为 'none' 防止点击劫持
 */
export const CSP_POLICY: Record<CSPDirective, string[]> = {
  'default-src': ["'self'"],
  'script-src': ["'self'"], // 不使用 'unsafe-inline'，使用 nonce 代替
  'style-src': ["'self'", "'unsafe-inline'"], // Ant Design 需要内联样式
  'img-src': ["'self'", 'data:', 'https:'],
  'connect-src': ["'self'"], // 开发模式会添加 localhost
  'font-src': ["'self'"],
  'object-src': ["'none'"], // 禁止插件
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"], // 防止点击劫持
};

/**
 * CSP Manager 实现
 *
 * 实现 Strict CSP 策略生成、nonce 生成和 CSP 头注入。
 * @see Requirements 3.1, 3.2, 3.3, 3.4
 */
export class CSPManager implements ICSPManager {
  /**
   * 生成 CSP 头字符串
   *
   * 根据配置生成完整的 CSP 策略字符串：
   * - 如果提供了 nonce，将其添加到 script-src 指令
   * - 如果是开发模式且提供了 devServerUrl，将其添加到 connect-src 指令
   *
   * @param config - CSP 配置
   * @returns CSP 策略字符串
   * @see Requirements 3.1, 3.2, 3.3, 3.4
   */
  generateCSPHeader(config: CSPConfig): string {
    // 创建策略副本以避免修改原始对象
    const policy: Record<CSPDirective, string[]> = {} as Record<CSPDirective, string[]>;

    // 复制基础策略
    for (const [directive, values] of Object.entries(CSP_POLICY)) {
      policy[directive as CSPDirective] = [...values];
    }

    // 如果提供了 nonce，添加到 script-src
    // 这允许带有正确 nonce 的内联脚本执行，同时保持安全性
    // @see Requirements 3.2
    if (config.nonce) {
      policy['script-src'].push(`'nonce-${config.nonce}'`);
    }

    // 开发模式下允许本地开发服务器连接
    // @see Requirements 3.4
    if (config.isDevelopment) {
      // 添加常见的开发服务器地址
      policy['connect-src'].push('http://localhost:*');
      policy['connect-src'].push('ws://localhost:*');

      // 如果提供了特定的开发服务器 URL，也添加它
      if (config.devServerUrl) {
        // 确保 URL 不重复
        if (!policy['connect-src'].includes(config.devServerUrl)) {
          policy['connect-src'].push(config.devServerUrl);
        }
        // 添加 WebSocket 版本（用于 HMR）
        const wsUrl = config.devServerUrl.replace(/^http/, 'ws');
        if (!policy['connect-src'].includes(wsUrl)) {
          policy['connect-src'].push(wsUrl);
        }
      }
    }

    // 构建 CSP 字符串
    const directives: string[] = [];
    for (const [directive, values] of Object.entries(policy)) {
      if (values.length > 0) {
        directives.push(`${directive} ${values.join(' ')}`);
      }
    }

    return directives.join('; ');
  }

  /**
   * 应用 CSP 到窗口
   *
   * 使用 session.webRequest.onHeadersReceived 拦截响应并注入 CSP 头。
   * 这是 Electron 推荐的设置 CSP 的方式。
   *
   * @param window - Electron BrowserWindow 实例
   * @param config - CSP 配置
   * @see Requirements 3.1
   */
  applyToWindow(window: BrowserWindow, config: CSPConfig): void {
    const cspHeader = this.generateCSPHeader(config);

    // 使用 webRequest.onHeadersReceived 设置 CSP 头
    // 这会拦截所有响应并添加/替换 CSP 头
    window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      // 设置 Content-Security-Policy 头
      // 使用数组格式，因为 Electron 的 responseHeaders 使用 Record<string, string[]>
      responseHeaders['Content-Security-Policy'] = [cspHeader];

      callback({ responseHeaders });
    });
  }

  /**
   * 生成随机 nonce
   *
   * 使用 crypto.randomBytes 生成 16 字节的随机数据，
   * 然后转换为 base64 编码的字符串。
   *
   * @returns 随机 nonce 字符串（base64 编码）
   * @see Requirements 3.2
   */
  generateNonce(): string {
    // 生成 16 字节（128 位）的随机数据
    // 这提供了足够的熵来防止猜测攻击
    const buffer = crypto.randomBytes(16);
    // 转换为 base64 编码
    return buffer.toString('base64');
  }
}

// 导出默认实例
export const cspManager = new CSPManager();
