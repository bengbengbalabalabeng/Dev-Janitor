/**
 * LRU Cache Manager
 * 
 * Provides a bounded Least Recently Used (LRU) cache implementation with:
 * - Maximum entry limit (default: 1000)
 * - Time-based expiration (default: 5 minutes)
 * - Automatic cleanup of expired entries
 * 
 * Uses Map's insertion order property to implement LRU efficiently.
 * 
 * Validates: Requirements 5.1, 5.2, 5.4
 * Properties: 6 (Cache Boundary Constraint)
 */

/**
 * Cache entry wrapper with timestamp for expiration tracking
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * LRU Cache interface
 */
export interface LRUCache<K, V> {
  /** Get a value by key, returns undefined if not found or expired */
  get(key: K): V | undefined;
  /** Set a value, evicting LRU entry if at capacity */
  set(key: K, value: V): void;
  /** Delete an entry by key */
  delete(key: K): boolean;
  /** Clear all entries */
  clear(): void;
  /** Current number of entries */
  readonly size: number;
  /** Remove expired entries */
  cleanup(): void;
  /** Check if key exists (without moving to MRU position) */
  has(key: K): boolean;
}

/**
 * Default configuration values
 */
export const DEFAULT_MAX_SIZE = 1000;
export const DEFAULT_MAX_AGE = 300000; // 5 minutes in milliseconds
export const CLEANUP_INTERVAL = 300000; // 5 minutes in milliseconds

/**
 * Bounded LRU Cache implementation
 * 
 * Uses Map's insertion order to track access recency.
 * When an entry is accessed, it's deleted and re-inserted to move it to the end (MRU position).
 * When capacity is reached, the first entry (LRU) is removed.
 * 
 * @template K - Key type
 * @template V - Value type
 */
export class BoundedLRUCache<K, V> implements LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly maxAge: number;

  /**
   * Create a new bounded LRU cache
   * 
   * @param maxSize Maximum number of entries (default: 1000)
   * @param maxAge Maximum age of entries in milliseconds (default: 5 minutes)
   */
  constructor(maxSize: number = DEFAULT_MAX_SIZE, maxAge: number = DEFAULT_MAX_AGE) {
    if (maxSize <= 0) {
      throw new Error('maxSize must be a positive number');
    }
    if (maxAge <= 0) {
      throw new Error('maxAge must be a positive number');
    }
    
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * Get a value by key
   * 
   * If the entry exists and is not expired, it's moved to the MRU position.
   * If the entry is expired, it's removed and undefined is returned.
   * 
   * @param key The key to look up
   * @returns The value if found and not expired, undefined otherwise
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to most recently used position (delete and re-insert)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.value;
  }

  /**
   * Set a value in the cache
   * 
   * If the key already exists, it's updated and moved to MRU position.
   * If the cache is at capacity, the LRU entry is evicted first.
   * 
   * @param key The key to set
   * @param value The value to store
   */
  set(key: K, value: V): void {
    // If key exists, delete first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at max capacity, delete oldest entry (first in Map)
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Delete an entry by key
   * 
   * @param key The key to delete
   * @returns true if the entry was deleted, false if it didn't exist
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries in the cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists in the cache (without moving to MRU position)
   * 
   * Note: This does NOT check expiration or update access order.
   * Use get() if you need to access the value and update recency.
   * 
   * @param key The key to check
   * @returns true if the key exists, false otherwise
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove all expired entries from the cache
   * 
   * This should be called periodically (e.g., every 5 minutes) to clean up
   * entries that have expired but haven't been accessed.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get the maximum size of the cache
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Get the maximum age of entries in milliseconds
   */
  getMaxAge(): number {
    return this.maxAge;
  }

  /**
   * Get all keys in the cache (in LRU to MRU order)
   */
  keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  /**
   * Get all values in the cache (in LRU to MRU order)
   * Note: Does not update access order or check expiration
   */
  values(): V[] {
    return Array.from(this.cache.values()).map(entry => entry.value);
  }

  /**
   * Get all entries in the cache (in LRU to MRU order)
   * Note: Does not update access order or check expiration
   */
  entries(): Array<[K, V]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value]);
  }
}

/**
 * Cache Manager with automatic cleanup
 * 
 * Wraps BoundedLRUCache with automatic periodic cleanup of expired entries.
 */
export class CacheManager<K, V> {
  private cache: BoundedLRUCache<K, V>;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Create a new cache manager with automatic cleanup
   * 
   * @param maxSize Maximum number of entries (default: 1000)
   * @param maxAge Maximum age of entries in milliseconds (default: 5 minutes)
   * @param cleanupIntervalMs Cleanup interval in milliseconds (default: 5 minutes)
   */
  constructor(
    maxSize: number = DEFAULT_MAX_SIZE,
    maxAge: number = DEFAULT_MAX_AGE,
    cleanupIntervalMs: number = CLEANUP_INTERVAL
  ) {
    this.cache = new BoundedLRUCache<K, V>(maxSize, maxAge);
    this.startCleanup(cleanupIntervalMs);
  }

  /**
   * Start the automatic cleanup interval
   */
  private startCleanup(intervalMs: number): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cache.cleanup();
    }, intervalMs);
  }

  /**
   * Stop the automatic cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get a value by key
   */
  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  /**
   * Set a value in the cache
   */
  set(key: K, value: V): void {
    this.cache.set(key, value);
  }

  /**
   * Delete an entry by key
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Manually trigger cleanup
   */
  cleanup(): void {
    this.cache.cleanup();
  }

  /**
   * Get the underlying cache instance
   */
  getCache(): BoundedLRUCache<K, V> {
    return this.cache;
  }
}

/**
 * Factory function to create a new BoundedLRUCache
 * 
 * @param maxSize Maximum number of entries (default: 1000)
 * @param maxAge Maximum age of entries in milliseconds (default: 5 minutes)
 * @returns A new BoundedLRUCache instance
 */
export function createLRUCache<K, V>(
  maxSize: number = DEFAULT_MAX_SIZE,
  maxAge: number = DEFAULT_MAX_AGE
): BoundedLRUCache<K, V> {
  return new BoundedLRUCache<K, V>(maxSize, maxAge);
}

/**
 * Factory function to create a new CacheManager with automatic cleanup
 * 
 * @param maxSize Maximum number of entries (default: 1000)
 * @param maxAge Maximum age of entries in milliseconds (default: 5 minutes)
 * @param cleanupIntervalMs Cleanup interval in milliseconds (default: 5 minutes)
 * @returns A new CacheManager instance
 */
export function createCacheManager<K, V>(
  maxSize: number = DEFAULT_MAX_SIZE,
  maxAge: number = DEFAULT_MAX_AGE,
  cleanupIntervalMs: number = CLEANUP_INTERVAL
): CacheManager<K, V> {
  return new CacheManager<K, V>(maxSize, maxAge, cleanupIntervalMs);
}
