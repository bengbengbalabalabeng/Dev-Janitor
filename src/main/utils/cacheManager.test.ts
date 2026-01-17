/**
 * LRU Cache Manager Tests
 * 
 * Tests for the BoundedLRUCache and CacheManager:
 * - Basic get/set/delete operations
 * - LRU eviction behavior
 * - Expiration handling
 * - Cleanup mechanism
 * 
 * Validates: Requirements 5.1, 5.2, 5.4
 * Properties: 6 (Cache Boundary Constraint)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  BoundedLRUCache,
  CacheManager,
  createLRUCache,
  createCacheManager,
  DEFAULT_MAX_SIZE,
  DEFAULT_MAX_AGE,
} from './cacheManager';

describe('BoundedLRUCache', () => {
  describe('constructor', () => {
    it('should create cache with default values', () => {
      const cache = new BoundedLRUCache<string, string>();
      expect(cache.getMaxSize()).toBe(DEFAULT_MAX_SIZE);
      expect(cache.getMaxAge()).toBe(DEFAULT_MAX_AGE);
      expect(cache.size).toBe(0);
    });

    it('should create cache with custom values', () => {
      const cache = new BoundedLRUCache<string, string>(500, 60000);
      expect(cache.getMaxSize()).toBe(500);
      expect(cache.getMaxAge()).toBe(60000);
    });

    it('should throw error for invalid maxSize', () => {
      expect(() => new BoundedLRUCache<string, string>(0)).toThrow('maxSize must be a positive number');
      expect(() => new BoundedLRUCache<string, string>(-1)).toThrow('maxSize must be a positive number');
    });

    it('should throw error for invalid maxAge', () => {
      expect(() => new BoundedLRUCache<string, string>(100, 0)).toThrow('maxAge must be a positive number');
      expect(() => new BoundedLRUCache<string, string>(100, -1)).toThrow('maxAge must be a positive number');
    });
  });

  describe('basic operations', () => {
    let cache: BoundedLRUCache<string, string>;

    beforeEach(() => {
      cache = new BoundedLRUCache<string, string>(10, 60000);
    });

    it('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing keys', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
      expect(cache.size).toBe(1);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.size).toBe(0);
    });

    it('should return false when deleting non-existent keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should check if key exists with has()', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should track size correctly', () => {
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
      cache.delete('key1');
      expect(cache.size).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      const cache = new BoundedLRUCache<string, string>(3, 60000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Cache is full, adding new entry should evict key1 (oldest)
      cache.set('key4', 'value4');
      
      expect(cache.size).toBe(3);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should move accessed entry to MRU position', () => {
      const cache = new BoundedLRUCache<string, string>(3, 60000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Access key1, moving it to MRU position
      cache.get('key1');
      
      // Now key2 is the oldest, should be evicted
      cache.set('key4', 'value4');
      
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should move updated entry to MRU position', () => {
      const cache = new BoundedLRUCache<string, string>(3, 60000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      // Update key1, moving it to MRU position
      cache.set('key1', 'updated');
      
      // Now key2 is the oldest, should be evicted
      cache.set('key4', 'value4');
      
      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBeUndefined();
    });

    it('should never exceed max size', () => {
      const cache = new BoundedLRUCache<number, string>(5, 60000);
      
      for (let i = 0; i < 100; i++) {
        cache.set(i, `value${i}`);
        expect(cache.size).toBeLessThanOrEqual(5);
      }
      
      expect(cache.size).toBe(5);
    });
  });

  describe('expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return undefined for expired entries', () => {
      const cache = new BoundedLRUCache<string, string>(10, 1000); // 1 second expiration
      
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
      
      // Advance time past expiration
      vi.advanceTimersByTime(1001);
      
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should remove expired entry on access', () => {
      const cache = new BoundedLRUCache<string, string>(10, 1000);
      
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      
      vi.advanceTimersByTime(1001);
      
      cache.get('key1'); // This should remove the expired entry
      expect(cache.size).toBe(0);
    });

    it('should not expire entries before maxAge', () => {
      const cache = new BoundedLRUCache<string, string>(10, 1000);
      
      cache.set('key1', 'value1');
      
      vi.advanceTimersByTime(999);
      
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('cleanup', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should remove all expired entries', () => {
      const cache = new BoundedLRUCache<string, string>(10, 1000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      vi.advanceTimersByTime(500);
      
      cache.set('key3', 'value3');
      
      vi.advanceTimersByTime(600); // key1 and key2 are now expired
      
      cache.cleanup();
      
      expect(cache.size).toBe(1);
      expect(cache.has('key1')).toBe(false);
      expect(cache.has('key2')).toBe(false);
      expect(cache.has('key3')).toBe(true);
    });

    it('should not remove non-expired entries', () => {
      const cache = new BoundedLRUCache<string, string>(10, 1000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      vi.advanceTimersByTime(500);
      
      cache.cleanup();
      
      expect(cache.size).toBe(2);
    });
  });

  describe('iteration methods', () => {
    it('should return keys in LRU to MRU order', () => {
      const cache = new BoundedLRUCache<string, string>(10, 60000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.get('key1'); // Move key1 to MRU
      
      const keys = Array.from(cache.keys());
      expect(keys).toEqual(['key2', 'key3', 'key1']);
    });

    it('should return values', () => {
      const cache = new BoundedLRUCache<string, string>(10, 60000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const values = cache.values();
      expect(values).toContain('value1');
      expect(values).toContain('value2');
    });

    it('should return entries', () => {
      const cache = new BoundedLRUCache<string, string>(10, 60000);
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const entries = cache.entries();
      expect(entries).toContainEqual(['key1', 'value1']);
      expect(entries).toContainEqual(['key2', 'value2']);
    });
  });

  describe('different key/value types', () => {
    it('should work with number keys', () => {
      const cache = new BoundedLRUCache<number, string>(10, 60000);
      
      cache.set(1, 'one');
      cache.set(2, 'two');
      
      expect(cache.get(1)).toBe('one');
      expect(cache.get(2)).toBe('two');
    });

    it('should work with object values', () => {
      interface TestObj {
        name: string;
        value: number;
      }
      
      const cache = new BoundedLRUCache<string, TestObj>(10, 60000);
      const obj = { name: 'test', value: 42 };
      
      cache.set('key1', obj);
      
      expect(cache.get('key1')).toEqual(obj);
    });
  });
});

describe('CacheManager', () => {
  let manager: CacheManager<string, string>;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (manager) {
      manager.stopCleanup();
    }
    vi.useRealTimers();
  });

  it('should create manager with automatic cleanup', () => {
    manager = new CacheManager<string, string>(100, 1000, 500);
    
    manager.set('key1', 'value1');
    expect(manager.get('key1')).toBe('value1');
    
    // Advance past expiration
    vi.advanceTimersByTime(1001);
    
    // Advance to trigger cleanup
    vi.advanceTimersByTime(500);
    
    expect(manager.size).toBe(0);
  });

  it('should stop cleanup when requested', () => {
    manager = new CacheManager<string, string>(100, 1000, 500);
    
    manager.set('key1', 'value1');
    manager.stopCleanup();
    
    vi.advanceTimersByTime(2000);
    
    // Entry should still exist (expired but not cleaned up)
    expect(manager.has('key1')).toBe(true);
  });

  it('should provide all cache operations', () => {
    manager = new CacheManager<string, string>(100, 60000, 60000);
    
    manager.set('key1', 'value1');
    expect(manager.get('key1')).toBe('value1');
    expect(manager.has('key1')).toBe(true);
    expect(manager.size).toBe(1);
    
    manager.delete('key1');
    expect(manager.has('key1')).toBe(false);
    
    manager.set('key2', 'value2');
    manager.clear();
    expect(manager.size).toBe(0);
  });

  it('should allow manual cleanup', () => {
    manager = new CacheManager<string, string>(100, 1000, 60000);
    
    manager.set('key1', 'value1');
    
    vi.advanceTimersByTime(1001);
    
    manager.cleanup();
    
    expect(manager.size).toBe(0);
  });

  it('should provide access to underlying cache', () => {
    manager = new CacheManager<string, string>(100, 60000, 60000);
    
    const cache = manager.getCache();
    expect(cache).toBeInstanceOf(BoundedLRUCache);
  });
});

describe('Factory functions', () => {
  it('createLRUCache should create BoundedLRUCache', () => {
    const cache = createLRUCache<string, string>(500, 30000);
    
    expect(cache).toBeInstanceOf(BoundedLRUCache);
    expect(cache.getMaxSize()).toBe(500);
    expect(cache.getMaxAge()).toBe(30000);
  });

  it('createLRUCache should use defaults', () => {
    const cache = createLRUCache<string, string>();
    
    expect(cache.getMaxSize()).toBe(DEFAULT_MAX_SIZE);
    expect(cache.getMaxAge()).toBe(DEFAULT_MAX_AGE);
  });

  it('createCacheManager should create CacheManager', () => {
    vi.useFakeTimers();
    
    const manager = createCacheManager<string, string>(500, 30000, 10000);
    
    expect(manager).toBeInstanceOf(CacheManager);
    expect(manager.getCache().getMaxSize()).toBe(500);
    
    manager.stopCleanup();
    vi.useRealTimers();
  });
});

describe('Edge cases', () => {
  it('should handle cache with size 1', () => {
    const cache = new BoundedLRUCache<string, string>(1, 60000);
    
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    
    cache.set('key2', 'value2');
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.size).toBe(1);
  });

  it('should handle empty string keys and values', () => {
    const cache = new BoundedLRUCache<string, string>(10, 60000);
    
    cache.set('', 'empty key');
    cache.set('key', '');
    
    expect(cache.get('')).toBe('empty key');
    expect(cache.get('key')).toBe('');
  });

  it('should handle undefined values', () => {
    const cache = new BoundedLRUCache<string, string | undefined>(10, 60000);
    
    cache.set('key', undefined);
    
    // Note: get returns undefined for both missing keys and undefined values
    // Use has() to distinguish
    expect(cache.has('key')).toBe(true);
    expect(cache.get('key')).toBeUndefined();
  });

  it('should handle rapid set/get operations', () => {
    const cache = new BoundedLRUCache<number, number>(100, 60000);
    
    for (let i = 0; i < 1000; i++) {
      cache.set(i % 100, i);
      cache.get(i % 50);
    }
    
    expect(cache.size).toBeLessThanOrEqual(100);
  });
});
