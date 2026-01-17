/**
 * Unit Tests for IPC Client with Timeout
 * 
 * Tests the timeout functionality for IPC calls.
 * 
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  withTimeout,
  invokeWithTimeout,
  createIPCInvoker,
  isIPCTimeoutError,
  getIPCErrorMessage,
  IPCTimeoutError,
  DEFAULT_IPC_TIMEOUT,
  type IPCCallOptions,
} from './ipcClientWithTimeout'

describe('IPC Client with Timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('DEFAULT_IPC_TIMEOUT', () => {
    it('should be 30 seconds (30000ms)', () => {
      // Validates: Requirements 13.1
      expect(DEFAULT_IPC_TIMEOUT).toBe(30000)
    })
  })

  describe('IPCTimeoutError', () => {
    it('should create error with correct properties', () => {
      // Validates: Requirements 13.2
      const error = new IPCTimeoutError('test:channel', 5000)
      
      expect(error.name).toBe('IPCTimeoutError')
      expect(error.channel).toBe('test:channel')
      expect(error.timeoutMs).toBe(5000)
      expect(error.isRetryable).toBe(true)
      expect(error.message).toBe("IPC call to 'test:channel' timed out after 5000ms")
    })

    it('should be an instance of Error', () => {
      const error = new IPCTimeoutError('test:channel', 5000)
      expect(error).toBeInstanceOf(Error)
    })
  })

  describe('withTimeout', () => {
    it('should resolve when promise resolves before timeout', async () => {
      // Validates: Requirements 13.1
      const promise = Promise.resolve('success')
      const result = await withTimeout(promise, 1000, 'test:channel')
      expect(result).toBe('success')
    })

    it('should reject with IPCTimeoutError when timeout is exceeded', async () => {
      // Validates: Requirements 13.1, 13.2
      const neverResolves = new Promise(() => {})
      const timeoutPromise = withTimeout(neverResolves, 100, 'test:channel')
      
      vi.advanceTimersByTime(100)
      
      await expect(timeoutPromise).rejects.toThrow(IPCTimeoutError)
      await expect(timeoutPromise).rejects.toMatchObject({
        channel: 'test:channel',
        timeoutMs: 100,
      })
    })

    it('should reject with original error when promise rejects before timeout', async () => {
      const originalError = new Error('Original error')
      const promise = Promise.reject(originalError)
      
      await expect(withTimeout(promise, 1000, 'test:channel')).rejects.toThrow('Original error')
    })

    it('should clear timeout when promise resolves', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const promise = Promise.resolve('success')
      
      await withTimeout(promise, 1000, 'test:channel')
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })

    it('should clear timeout when promise rejects', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      const promise = Promise.reject(new Error('error'))
      
      try {
        await withTimeout(promise, 1000, 'test:channel')
      } catch {
        // Expected
      }
      
      expect(clearTimeoutSpy).toHaveBeenCalled()
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('invokeWithTimeout', () => {
    it('should use default timeout when no options provided', async () => {
      // Validates: Requirements 13.1
      const invokeFunction = vi.fn().mockResolvedValue('result')
      
      const result = await invokeWithTimeout(invokeFunction, 'test:channel')
      
      expect(result).toBe('result')
      expect(invokeFunction).toHaveBeenCalledTimes(1)
    })

    it('should use custom timeout when provided', async () => {
      // Validates: Requirements 13.3
      const neverResolves = vi.fn().mockReturnValue(new Promise(() => {}))
      const options: IPCCallOptions = { timeout: 50 }
      
      const promise = invokeWithTimeout(neverResolves, 'test:channel', options)
      
      vi.advanceTimersByTime(50)
      
      await expect(promise).rejects.toMatchObject({
        timeoutMs: 50,
      })
    })

    it('should retry on timeout when retries > 0', async () => {
      // Validates: Requirements 13.3
      vi.useRealTimers() // Use real timers for this test
      
      let callCount = 0
      const invokeFunction = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new IPCTimeoutError('test', 10)), 10)
          })
        }
        return Promise.resolve('success')
      })
      
      // Mock withTimeout to simulate timeout behavior
      const result = await invokeWithTimeout(invokeFunction, 'test:channel', {
        timeout: 10,
        retries: 2,
        retryDelay: 10,
      })
      
      expect(result).toBe('success')
      expect(invokeFunction).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-timeout errors', async () => {
      const invokeFunction = vi.fn().mockRejectedValue(new Error('Non-timeout error'))
      
      await expect(
        invokeWithTimeout(invokeFunction, 'test:channel', { retries: 2 })
      ).rejects.toThrow('Non-timeout error')
      
      expect(invokeFunction).toHaveBeenCalledTimes(1)
    })
  })

  describe('createIPCInvoker', () => {
    it('should create a function that invokes with timeout', async () => {
      // Validates: Requirements 13.1
      const mockInvoke = vi.fn().mockResolvedValue('result')
      const invoker = createIPCInvoker('test:channel', mockInvoke)
      
      const result = await invoker()
      
      expect(result).toBe('result')
      expect(mockInvoke).toHaveBeenCalled()
    })

    it('should pass arguments to the invoke function', async () => {
      const mockInvoke = vi.fn().mockResolvedValue('result')
      const invoker = createIPCInvoker<string, [string, number]>(
        'test:channel',
        mockInvoke
      )
      
      await invoker('arg1', 42)
      
      expect(mockInvoke).toHaveBeenCalledWith('arg1', 42)
    })

    it('should use default options', async () => {
      const neverResolves = vi.fn().mockReturnValue(new Promise(() => {}))
      const invoker = createIPCInvoker('test:channel', neverResolves, { timeout: 50 })
      
      const promise = invoker()
      
      vi.advanceTimersByTime(50)
      
      await expect(promise).rejects.toMatchObject({
        timeoutMs: 50,
      })
    })

    it('should allow overriding options per call', async () => {
      const neverResolves = vi.fn().mockReturnValue(new Promise(() => {}))
      const invoker = createIPCInvoker('test:channel', neverResolves, { timeout: 100 })
      
      const promise = invoker({ timeout: 25 })
      
      vi.advanceTimersByTime(25)
      
      await expect(promise).rejects.toMatchObject({
        timeoutMs: 25,
      })
    })
  })

  describe('isIPCTimeoutError', () => {
    it('should return true for IPCTimeoutError', () => {
      // Validates: Requirements 13.2
      const error = new IPCTimeoutError('test:channel', 5000)
      expect(isIPCTimeoutError(error)).toBe(true)
    })

    it('should return false for regular Error', () => {
      const error = new Error('Regular error')
      expect(isIPCTimeoutError(error)).toBe(false)
    })

    it('should return false for non-error values', () => {
      expect(isIPCTimeoutError(null)).toBe(false)
      expect(isIPCTimeoutError(undefined)).toBe(false)
      expect(isIPCTimeoutError('string')).toBe(false)
      expect(isIPCTimeoutError(123)).toBe(false)
      expect(isIPCTimeoutError({})).toBe(false)
    })
  })

  describe('getIPCErrorMessage', () => {
    it('should return timeout message for IPCTimeoutError', () => {
      // Validates: Requirements 13.2
      const error = new IPCTimeoutError('test:channel', 5000)
      const message = getIPCErrorMessage(error)
      expect(message).toBe('Operation timed out. Please try again.')
    })

    it('should return error message for regular Error', () => {
      const error = new Error('Something went wrong')
      const message = getIPCErrorMessage(error)
      expect(message).toBe('Something went wrong')
    })

    it('should return default message for non-error values', () => {
      const message = getIPCErrorMessage('not an error')
      expect(message).toBe('An error occurred while communicating with the application')
    })

    it('should use custom default message when provided', () => {
      const message = getIPCErrorMessage(null, 'Custom default message')
      expect(message).toBe('Custom default message')
    })
  })
})
