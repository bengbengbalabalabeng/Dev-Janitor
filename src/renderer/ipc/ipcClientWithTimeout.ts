/**
 * IPC Client with Timeout
 * 
 * Provides timeout functionality for IPC calls to prevent the UI from hanging
 * when the main process is unresponsive. All IPC calls should use this wrapper
 * to ensure they don't wait indefinitely.
 * 
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */

/**
 * Default timeout for IPC calls in milliseconds (30 seconds)
 * Validates: Requirements 13.1
 */
export const DEFAULT_IPC_TIMEOUT = 30000

/**
 * Options for IPC calls with timeout
 */
export interface IPCCallOptions {
  /** Timeout in milliseconds (default: 30000ms / 30 seconds) */
  timeout?: number
  /** Number of retry attempts on timeout (default: 0) */
  retries?: number
  /** Delay between retries in milliseconds (default: 1000ms) */
  retryDelay?: number
}

/**
 * Error class for IPC timeout errors
 * Validates: Requirements 13.2
 */
export class IPCTimeoutError extends Error {
  public readonly channel: string
  public readonly timeoutMs: number
  public readonly isRetryable: boolean

  constructor(channel: string, timeoutMs: number) {
    super(`IPC call to '${channel}' timed out after ${timeoutMs}ms`)
    this.name = 'IPCTimeoutError'
    this.channel = channel
    this.timeoutMs = timeoutMs
    this.isRetryable = true
    
    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IPCTimeoutError)
    }
  }
}

/**
 * Wraps a promise with a timeout
 * 
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds
 * @param channel The IPC channel name (for error messages)
 * @returns Promise that rejects with IPCTimeoutError if timeout is exceeded
 * 
 * Validates: Requirements 13.1, 13.2
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  channel: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new IPCTimeoutError(channel, timeoutMs))
    }, timeoutMs)

    promise
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Delays execution for a specified duration
 * 
 * @param ms Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Invokes an IPC call with timeout and optional retry logic
 * 
 * @param invokeFunction The function that performs the actual IPC invoke
 * @param channel The IPC channel name
 * @param options Options including timeout and retry settings
 * @returns Promise resolving to the IPC call result
 * 
 * Validates: Requirements 13.1, 13.2, 13.3
 */
export async function invokeWithTimeout<T>(
  invokeFunction: () => Promise<T>,
  channel: string,
  options: IPCCallOptions = {}
): Promise<T> {
  const {
    timeout = DEFAULT_IPC_TIMEOUT,
    retries = 0,
    retryDelay = 1000,
  } = options

  let lastError: Error | null = null
  let attempts = 0
  const maxAttempts = retries + 1

  while (attempts < maxAttempts) {
    attempts++
    
    try {
      return await withTimeout(invokeFunction(), timeout, channel)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Only retry on timeout errors
      if (error instanceof IPCTimeoutError && attempts < maxAttempts) {
        console.warn(
          `[IPC] Call to '${channel}' timed out (attempt ${attempts}/${maxAttempts}). Retrying in ${retryDelay}ms...`
        )
        await delay(retryDelay)
        continue
      }
      
      // Don't retry on non-timeout errors
      throw error
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error(`IPC call to '${channel}' failed after ${maxAttempts} attempts`)
}

/**
 * Creates a wrapped IPC invoke function with timeout
 * 
 * This is a higher-order function that wraps any IPC invoke function
 * with timeout functionality.
 * 
 * @param channel The IPC channel name
 * @param defaultOptions Default options for all calls through this wrapper
 * @returns A function that invokes IPC with timeout
 * 
 * Example usage:
 * ```typescript
 * const detectAllTools = createIPCInvoker<ToolInfo[]>(
 *   'tools:detect-all',
 *   () => window.electronAPI.tools.detectAll()
 * )
 * 
 * // Use with default timeout
 * const tools = await detectAllTools()
 * 
 * // Use with custom timeout
 * const tools = await detectAllTools({ timeout: 60000 })
 * ```
 * 
 * Validates: Requirements 13.1, 13.3
 */
export function createIPCInvoker<T, Args extends unknown[] = []>(
  channel: string,
  invokeFunction: (...args: Args) => Promise<T>,
  defaultOptions: IPCCallOptions = {}
): (...args: [...Args] | [...Args, IPCCallOptions]) => Promise<T> {
  return (...args: [...Args] | [...Args, IPCCallOptions]): Promise<T> => {
    // Check if the last argument is an options object
    const lastArg = args[args.length - 1]
    const hasOptions = lastArg !== null && 
      typeof lastArg === 'object' && 
      !Array.isArray(lastArg) &&
      ('timeout' in lastArg || 'retries' in lastArg || 'retryDelay' in lastArg)
    
    const options: IPCCallOptions = hasOptions
      ? { ...defaultOptions, ...(lastArg as IPCCallOptions) }
      : defaultOptions
    
    const invokeArgs = hasOptions 
      ? (args.slice(0, -1) as Args)
      : (args as Args)

    return invokeWithTimeout(
      () => invokeFunction(...invokeArgs),
      channel,
      options
    )
  }
}

/**
 * Checks if an error is an IPC timeout error
 * 
 * @param error The error to check
 * @returns True if the error is an IPCTimeoutError
 * 
 * Validates: Requirements 13.2
 */
export function isIPCTimeoutError(error: unknown): error is IPCTimeoutError {
  return error instanceof IPCTimeoutError
}

/**
 * Gets a user-friendly error message for IPC errors
 * 
 * @param error The error to get a message for
 * @param defaultMessage Default message if error is not recognized
 * @returns User-friendly error message
 * 
 * Validates: Requirements 13.2
 */
export function getIPCErrorMessage(
  error: unknown,
  defaultMessage = 'An error occurred while communicating with the application'
): string {
  if (isIPCTimeoutError(error)) {
    return `Operation timed out. Please try again.`
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  return defaultMessage
}

/**
 * IPC Client with Timeout - provides wrapped versions of common IPC operations
 * 
 * This object provides convenience methods for IPC calls with built-in timeout.
 * Use this instead of directly calling window.electronAPI for better error handling.
 * 
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4
 */
export const ipcClientWithTimeout = {
  /**
   * Default timeout in milliseconds
   */
  DEFAULT_TIMEOUT: DEFAULT_IPC_TIMEOUT,

  /**
   * Invoke an IPC call with timeout
   * 
   * @param invokeFunction Function that performs the IPC call
   * @param channel Channel name for error messages
   * @param options Timeout and retry options
   */
  invoke: invokeWithTimeout,

  /**
   * Create a reusable IPC invoker with timeout
   */
  createInvoker: createIPCInvoker,

  /**
   * Wrap a promise with timeout
   */
  withTimeout,

  /**
   * Check if an error is a timeout error
   */
  isTimeoutError: isIPCTimeoutError,

  /**
   * Get user-friendly error message
   */
  getErrorMessage: getIPCErrorMessage,

  /**
   * IPCTimeoutError class for instanceof checks
   */
  TimeoutError: IPCTimeoutError,
}

export default ipcClientWithTimeout
