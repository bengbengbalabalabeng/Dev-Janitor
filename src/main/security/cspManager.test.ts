/**
 * CSP Manager Unit Tests
 *
 * Tests for the CSPManager implementation.
 * @see Requirements 3.1, 3.2, 3.3, 3.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CSPManager, CSP_POLICY, type CSPConfig } from './cspManager';

describe('CSPManager', () => {
  let cspManager: CSPManager;

  beforeEach(() => {
    cspManager = new CSPManager();
  });

  describe('generateNonce', () => {
    it('should generate a non-empty string', () => {
      const nonce = cspManager.generateNonce();
      expect(nonce).toBeTruthy();
      expect(typeof nonce).toBe('string');
      expect(nonce.length).toBeGreaterThan(0);
    });

    it('should generate base64 encoded string', () => {
      const nonce = cspManager.generateNonce();
      // Base64 characters: A-Z, a-z, 0-9, +, /, =
      expect(nonce).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should generate unique nonces on each call', () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(cspManager.generateNonce());
      }
      // All 100 nonces should be unique
      expect(nonces.size).toBe(100);
    });

    it('should generate nonces of consistent length', () => {
      // 16 bytes in base64 = 24 characters (with padding)
      const nonce = cspManager.generateNonce();
      expect(nonce.length).toBe(24);
    });
  });

  describe('generateCSPHeader', () => {
    describe('basic policy generation', () => {
      it('should generate CSP header with default policy in production mode', () => {
        const config: CSPConfig = { isDevelopment: false };
        const header = cspManager.generateCSPHeader(config);

        // Check that all directives from CSP_POLICY are present
        expect(header).toContain("default-src 'self'");
        expect(header).toContain("script-src 'self'");
        expect(header).toContain("style-src 'self' 'unsafe-inline'");
        expect(header).toContain("img-src 'self' data: https:");
        expect(header).toContain("connect-src 'self'");
        expect(header).toContain("font-src 'self'");
        expect(header).toContain("object-src 'none'");
        expect(header).toContain("base-uri 'self'");
        expect(header).toContain("form-action 'self'");
        expect(header).toContain("frame-ancestors 'none'");
      });

      it('should not include unsafe-inline in script-src by default', () => {
        const config: CSPConfig = { isDevelopment: false };
        const header = cspManager.generateCSPHeader(config);

        // Extract script-src directive
        const scriptSrcMatch = header.match(/script-src ([^;]+)/);
        expect(scriptSrcMatch).toBeTruthy();
        const scriptSrc = scriptSrcMatch![1];

        // Should not contain unsafe-inline
        expect(scriptSrc).not.toContain("'unsafe-inline'");
      });

      it('should include unsafe-inline in style-src for Ant Design', () => {
        const config: CSPConfig = { isDevelopment: false };
        const header = cspManager.generateCSPHeader(config);

        // Extract style-src directive
        const styleSrcMatch = header.match(/style-src ([^;]+)/);
        expect(styleSrcMatch).toBeTruthy();
        const styleSrc = styleSrcMatch![1];

        // Should contain unsafe-inline for Ant Design
        expect(styleSrc).toContain("'unsafe-inline'");
      });
    });

    describe('nonce support', () => {
      it('should add nonce to script-src when provided', () => {
        const config: CSPConfig = {
          isDevelopment: false,
          nonce: 'test-nonce-123',
        };
        const header = cspManager.generateCSPHeader(config);

        // Extract script-src directive
        const scriptSrcMatch = header.match(/script-src ([^;]+)/);
        expect(scriptSrcMatch).toBeTruthy();
        const scriptSrc = scriptSrcMatch![1];

        // Should contain the nonce
        expect(scriptSrc).toContain("'nonce-test-nonce-123'");
      });

      it('should keep self in script-src when nonce is added', () => {
        const config: CSPConfig = {
          isDevelopment: false,
          nonce: 'my-nonce',
        };
        const header = cspManager.generateCSPHeader(config);

        const scriptSrcMatch = header.match(/script-src ([^;]+)/);
        expect(scriptSrcMatch).toBeTruthy();
        const scriptSrc = scriptSrcMatch![1];

        expect(scriptSrc).toContain("'self'");
        expect(scriptSrc).toContain("'nonce-my-nonce'");
      });
    });

    describe('development mode', () => {
      it('should add localhost to connect-src in development mode', () => {
        const config: CSPConfig = { isDevelopment: true };
        const header = cspManager.generateCSPHeader(config);

        // Extract connect-src directive
        const connectSrcMatch = header.match(/connect-src ([^;]+)/);
        expect(connectSrcMatch).toBeTruthy();
        const connectSrc = connectSrcMatch![1];

        // Should contain localhost
        expect(connectSrc).toContain('http://localhost:*');
        expect(connectSrc).toContain('ws://localhost:*');
      });

      it('should add devServerUrl to connect-src when provided', () => {
        const config: CSPConfig = {
          isDevelopment: true,
          devServerUrl: 'http://localhost:5173',
        };
        const header = cspManager.generateCSPHeader(config);

        const connectSrcMatch = header.match(/connect-src ([^;]+)/);
        expect(connectSrcMatch).toBeTruthy();
        const connectSrc = connectSrcMatch![1];

        expect(connectSrc).toContain('http://localhost:5173');
        // Should also add WebSocket version for HMR
        expect(connectSrc).toContain('ws://localhost:5173');
      });

      it('should not add localhost in production mode', () => {
        const config: CSPConfig = { isDevelopment: false };
        const header = cspManager.generateCSPHeader(config);

        const connectSrcMatch = header.match(/connect-src ([^;]+)/);
        expect(connectSrcMatch).toBeTruthy();
        const connectSrc = connectSrcMatch![1];

        expect(connectSrc).not.toContain('localhost');
      });
    });

    describe('security directives', () => {
      it('should set object-src to none to disable plugins', () => {
        const config: CSPConfig = { isDevelopment: false };
        const header = cspManager.generateCSPHeader(config);

        expect(header).toContain("object-src 'none'");
      });

      it('should set frame-ancestors to none to prevent clickjacking', () => {
        const config: CSPConfig = { isDevelopment: false };
        const header = cspManager.generateCSPHeader(config);

        expect(header).toContain("frame-ancestors 'none'");
      });

      it('should restrict img-src to self, data, and https', () => {
        const config: CSPConfig = { isDevelopment: false };
        const header = cspManager.generateCSPHeader(config);

        const imgSrcMatch = header.match(/img-src ([^;]+)/);
        expect(imgSrcMatch).toBeTruthy();
        const imgSrc = imgSrcMatch![1];

        expect(imgSrc).toContain("'self'");
        expect(imgSrc).toContain('data:');
        expect(imgSrc).toContain('https:');
      });
    });

    describe('policy immutability', () => {
      it('should not modify the original CSP_POLICY constant', () => {
        // Store original values
        const originalScriptSrc = [...CSP_POLICY['script-src']];
        const originalConnectSrc = [...CSP_POLICY['connect-src']];

        // Generate header with nonce and dev mode
        const config: CSPConfig = {
          isDevelopment: true,
          devServerUrl: 'http://localhost:3000',
          nonce: 'test-nonce',
        };
        cspManager.generateCSPHeader(config);

        // Verify original policy is unchanged
        expect(CSP_POLICY['script-src']).toEqual(originalScriptSrc);
        expect(CSP_POLICY['connect-src']).toEqual(originalConnectSrc);
      });
    });
  });

  describe('applyToWindow', () => {
    it('should set up webRequest handler on window session', () => {
      const mockCallback = vi.fn();
      const mockOnHeadersReceived = vi.fn((handler) => {
        // Simulate calling the handler
        handler(
          { responseHeaders: {} },
          mockCallback
        );
      });

      const mockWindow = {
        webContents: {
          session: {
            webRequest: {
              onHeadersReceived: mockOnHeadersReceived,
            },
          },
        },
      } as unknown as import('electron').BrowserWindow;

      const config: CSPConfig = { isDevelopment: false };
      cspManager.applyToWindow(mockWindow, config);

      // Verify onHeadersReceived was called
      expect(mockOnHeadersReceived).toHaveBeenCalledTimes(1);
      expect(mockOnHeadersReceived).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should inject CSP header into response headers', () => {
      let capturedResult: { responseHeaders: Record<string, string[]> } | null = null;
      const mockOnHeadersReceived = vi.fn((handler) => {
        // Simulate calling the handler with mock details
        handler(
          { responseHeaders: { 'Content-Type': ['text/html'] } },
          (result: { responseHeaders: Record<string, string[]> }) => {
            capturedResult = result;
          }
        );
      });

      const mockWindow = {
        webContents: {
          session: {
            webRequest: {
              onHeadersReceived: mockOnHeadersReceived,
            },
          },
        },
      } as unknown as import('electron').BrowserWindow;

      const config: CSPConfig = { isDevelopment: false };
      cspManager.applyToWindow(mockWindow, config);

      // The callback should have been called with CSP header
      expect(mockOnHeadersReceived).toHaveBeenCalled();
      expect(capturedResult).not.toBeNull();
      expect(capturedResult!.responseHeaders['Content-Security-Policy']).toBeDefined();
    });

    it('should preserve existing response headers', () => {
      let capturedResult: { responseHeaders: Record<string, string[]> } | null = null;
      const mockOnHeadersReceived = vi.fn((handler) => {
        handler(
          {
            responseHeaders: {
              'Content-Type': ['text/html'],
              'X-Custom-Header': ['custom-value'],
            },
          },
          (result: { responseHeaders: Record<string, string[]> }) => {
            capturedResult = result;
          }
        );
      });

      const mockWindow = {
        webContents: {
          session: {
            webRequest: {
              onHeadersReceived: mockOnHeadersReceived,
            },
          },
        },
      } as unknown as import('electron').BrowserWindow;

      const config: CSPConfig = { isDevelopment: false };
      cspManager.applyToWindow(mockWindow, config);

      // Verify existing headers are preserved
      expect(capturedResult).not.toBeNull();
      expect(capturedResult!.responseHeaders['Content-Type']).toEqual(['text/html']);
      expect(capturedResult!.responseHeaders['X-Custom-Header']).toEqual(['custom-value']);
      // And CSP header is added
      expect(capturedResult!.responseHeaders['Content-Security-Policy']).toBeDefined();
      expect(capturedResult!.responseHeaders['Content-Security-Policy'].length).toBe(1);
    });

    it('should generate correct CSP header based on config', () => {
      let capturedResult: { responseHeaders: Record<string, string[]> } | null = null;
      const mockOnHeadersReceived = vi.fn((handler) => {
        handler(
          { responseHeaders: {} },
          (result: { responseHeaders: Record<string, string[]> }) => {
            capturedResult = result;
          }
        );
      });

      const mockWindow = {
        webContents: {
          session: {
            webRequest: {
              onHeadersReceived: mockOnHeadersReceived,
            },
          },
        },
      } as unknown as import('electron').BrowserWindow;

      const config: CSPConfig = {
        isDevelopment: true,
        nonce: 'test-nonce',
        devServerUrl: 'http://localhost:5173',
      };
      cspManager.applyToWindow(mockWindow, config);

      expect(capturedResult).not.toBeNull();
      const cspHeader = capturedResult!.responseHeaders['Content-Security-Policy'][0];

      // Verify CSP header contains expected values
      expect(cspHeader).toContain("'nonce-test-nonce'");
      expect(cspHeader).toContain('http://localhost:5173');
      expect(cspHeader).toContain('ws://localhost:5173');
    });
  });

  describe('CSP_POLICY constant', () => {
    it('should have all required directives', () => {
      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'img-src',
        'connect-src',
        'font-src',
        'object-src',
        'base-uri',
        'form-action',
        'frame-ancestors',
      ];

      for (const directive of requiredDirectives) {
        expect(CSP_POLICY).toHaveProperty(directive);
      }
    });

    it('should not have unsafe-inline in script-src', () => {
      expect(CSP_POLICY['script-src']).not.toContain("'unsafe-inline'");
    });

    it('should have none for object-src', () => {
      expect(CSP_POLICY['object-src']).toContain("'none'");
    });

    it('should have none for frame-ancestors', () => {
      expect(CSP_POLICY['frame-ancestors']).toContain("'none'");
    });
  });
});
