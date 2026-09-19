import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedisService } from '../../../src/redis/redis.service.js';

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      status: 'ready',
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue('OK'),
      disconnect: vi.fn(),
      on: vi.fn(),
      get: vi.fn(),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(60),
      sadd: vi.fn().mockResolvedValue(1),
      srem: vi.fn().mockResolvedValue(1),
      smembers: vi.fn().mockResolvedValue([]),
      exists: vi.fn().mockResolvedValue(1),
    };

    service = new RedisService();
    // Inject mock client and mark as connected
    (service as any).client = mockClient;
    (service as any).connected = true;
  });

  describe('Connection & Lifecycle', () => {
    it('should be available when connected and ready', () => {
      expect(service.isAvailable()).toBe(true);
      expect(service.getClient()).toBe(mockClient);
    });

    it('should handle onModuleDestroy gracefully', async () => {
      await service.onModuleDestroy();
      expect(mockClient.quit).toHaveBeenCalled();
      expect(service.isAvailable()).toBe(false);
    });

    it('should report not available when disconnected', () => {
      (service as any).connected = false;
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('Key-Value Caching', () => {
    it('should get parsed JSON value on cache hit', async () => {
      const payload = { id: 1, name: 'Test Org' };
      mockClient.get.mockResolvedValueOnce(JSON.stringify(payload));

      const result = await service.get('org:1');
      expect(mockClient.get).toHaveBeenCalledWith('org:1');
      expect(result).toEqual(payload);
    });

    it('should return null on cache miss', async () => {
      mockClient.get.mockResolvedValueOnce(null);

      const result = await service.get('org:missing');
      expect(result).toBeNull();
    });

    it('should set serialized JSON with TTL', async () => {
      const data = { role: 'ADMIN' };
      await service.set('user:1:role', data, 300);

      expect(mockClient.set).toHaveBeenCalledWith(
        'user:1:role',
        JSON.stringify(data),
        'EX',
        300,
      );
    });

    it('should set serialized JSON without TTL', async () => {
      const data = { config: true };
      await service.set('config:key', data);

      expect(mockClient.set).toHaveBeenCalledWith(
        'config:key',
        JSON.stringify(data),
      );
    });

    it('should delete a key', async () => {
      await service.del('user:1:session');
      expect(mockClient.del).toHaveBeenCalledWith('user:1:session');
    });

    it('should delete keys by pattern', async () => {
      mockClient.keys.mockResolvedValueOnce(['user:1:a', 'user:1:b']);
      await service.delByPattern('user:1:*');

      expect(mockClient.keys).toHaveBeenCalledWith('user:1:*');
      expect(mockClient.del).toHaveBeenCalledWith('user:1:a', 'user:1:b');
    });

    it('should handle JSON parse error gracefully', async () => {
      mockClient.get.mockResolvedValueOnce('invalid json');
      const result = await service.get('bad:json');
      expect(result).toBeNull();
    });
  });

  describe('Counters & Rate Limiting', () => {
    it('should increment a counter and set TTL on first increment', async () => {
      mockClient.incr.mockResolvedValueOnce(1);

      const count = await service.incr('rate:user:1', 60);
      expect(count).toBe(1);
      expect(mockClient.incr).toHaveBeenCalledWith('rate:user:1');
      expect(mockClient.expire).toHaveBeenCalledWith('rate:user:1', 60);
    });

    it('should get counter value as integer', async () => {
      mockClient.get.mockResolvedValueOnce('42');
      const val = await service.getCounter('counter:visits');
      expect(val).toBe(42);
    });

    it('should check rate limit successfully when under limit', async () => {
      mockClient.incr.mockResolvedValueOnce(3);
      mockClient.ttl.mockResolvedValueOnce(45);

      const result = await service.checkRateLimit('rate:ip:127.0.0.1', 5, 60);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it('should reject when exceeding rate limit', async () => {
      mockClient.incr.mockResolvedValueOnce(6);
      mockClient.ttl.mockResolvedValueOnce(30);

      const result = await service.checkRateLimit('rate:ip:127.0.0.1', 5, 60);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Live Presence (Sets + TTL)', () => {
    it('should record user presence with TTL', async () => {
      await service.setUserOnline('org-123', 'usr-456', 60);

      expect(mockClient.sadd).toHaveBeenCalledWith(
        'presence:org:org-123:users',
        'usr-456',
      );
      expect(mockClient.set).toHaveBeenCalledWith(
        'presence:user:usr-456:org:org-123',
        '1',
        'EX',
        60,
      );
    });

    it('should remove user presence on logout/disconnect', async () => {
      await service.setUserOffline('org-123', 'usr-456');

      expect(mockClient.srem).toHaveBeenCalledWith(
        'presence:org:org-123:users',
        'usr-456',
      );
      expect(mockClient.del).toHaveBeenCalledWith(
        'presence:user:usr-456:org:org-123',
      );
    });

    it('should return active online users and clean up expired ones', async () => {
      mockClient.smembers.mockResolvedValueOnce(['usr-1', 'usr-2']);
      // usr-1 exists, usr-2 expired
      mockClient.exists.mockImplementation((key: string) =>
        Promise.resolve(key.includes('usr-1') ? 1 : 0),
      );

      const online = await service.getOnlineUsers('org-123');
      expect(online).toEqual(['usr-1']);
      expect(mockClient.srem).toHaveBeenCalledWith(
        'presence:org:org-123:users',
        'usr-2',
      );
    });
  });

  describe('CRM Unread Counters', () => {
    it('should increment unread messages for conversation and user', async () => {
      mockClient.incr.mockResolvedValueOnce(3);

      const unread = await service.incrementUnread('cnv-1', 'usr-1');
      expect(unread).toBe(3);
      expect(mockClient.incr).toHaveBeenCalledWith('crm:unread:cnv-1:usr-1');
    });

    it('should get unread count', async () => {
      mockClient.get.mockResolvedValueOnce('5');

      const count = await service.getUnread('cnv-1', 'usr-1');
      expect(count).toBe(5);
      expect(mockClient.get).toHaveBeenCalledWith('crm:unread:cnv-1:usr-1');
    });

    it('should clear unread count on reading conversation', async () => {
      await service.clearUnread('cnv-1', 'usr-1');
      expect(mockClient.del).toHaveBeenCalledWith('crm:unread:cnv-1:usr-1');
    });
  });

  describe('Graceful Fallback Mode (Redis Unavailable)', () => {
    beforeEach(() => {
      (service as any).connected = false;
      (service as any).client = null;
    });

    it('should return null on get when Redis is down', async () => {
      const res = await service.get('some:key');
      expect(res).toBeNull();
    });

    it('should not throw on set when Redis is down', async () => {
      await expect(service.set('some:key', 'val')).resolves.toBeUndefined();
    });

    it('should not throw on del when Redis is down', async () => {
      await expect(service.del('some:key')).resolves.toBeUndefined();
    });

    it('should allow rate limit check in degraded mode', async () => {
      const res = await service.checkRateLimit('rate:key', 5, 60);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(5);
    });

    it('should return empty online users list when Redis is down', async () => {
      const users = await service.getOnlineUsers('org-1');
      expect(users).toEqual([]);
    });
  });
});
