import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private connected = false;

  async onModuleInit() {
    await this.initClient();
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        this.client.disconnect();
      }
      this.connected = false;
      this.logger.log('Redis client disconnected');
    }
  }

  private async initClient(): Promise<void> {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisUrl = process.env.REDIS_URL;
    const redisPassword = process.env.REDIS_PASSWORD || undefined;

    try {
      this.client = redisUrl
        ? new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          })
        : new Redis({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
          });

      this.client.on('connect', () => {
        this.connected = true;
        this.logger.log(
          `Redis client connected to ${redisHost}:${redisPort}`,
        );
      });

      this.client.on('error', (err) => {
        this.connected = false;
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.connected = false;
      });

      await this.client.connect();
    } catch (err) {
      this.connected = false;
      this.logger.warn(
        `Failed to initialize Redis client (${(err as Error).message}). Operating in degraded mode (fallback to database).`,
      );
    }
  }

  /**
   * Check if Redis is actively connected and reachable.
   */
  isAvailable(): boolean {
    return this.connected && this.client !== null && this.client.status === 'ready';
  }

  /**
   * Get direct client handle for custom commands.
   */
  getClient(): Redis | null {
    return this.client;
  }

  // =========================================================================
  // 1. TYPED KEY-VALUE CACHING WITH TTL
  // =========================================================================

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable() || !this.client) return null;
    try {
      const raw = await this.client.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`Redis GET failed for key "${key}": ${(err as Error).message}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      this.logger.warn(`Redis SET failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`Redis DEL failed for key "${key}": ${(err as Error).message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      this.logger.warn(
        `Redis DEL by pattern failed for "${pattern}": ${(err as Error).message}`,
      );
    }
  }

  // =========================================================================
  // 2. ATOMIC COUNTERS & RATE LIMITING
  // =========================================================================

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (!this.isAvailable() || !this.client) return 0;
    try {
      const count = await this.client.incr(key);
      if (count === 1 && ttlSeconds && ttlSeconds > 0) {
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    } catch (err) {
      this.logger.warn(`Redis INCR failed for key "${key}": ${(err as Error).message}`);
      return 0;
    }
  }

  async getCounter(key: string): Promise<number> {
    if (!this.isAvailable() || !this.client) return 0;
    try {
      const raw = await this.client.get(key);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch (err) {
      this.logger.warn(`Redis GET counter failed for key "${key}": ${(err as Error).message}`);
      return 0;
    }
  }

  async checkRateLimit(
    key: string,
    maxAttempts: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    if (!this.isAvailable() || !this.client) {
      // In degraded mode, allow requests so outages don't block users
      return { allowed: true, remaining: maxAttempts, resetTime: Date.now() + windowSeconds * 1000 };
    }

    try {
      const current = await this.incr(key, windowSeconds);
      const allowed = current <= maxAttempts;
      const remaining = Math.max(0, maxAttempts - current);
      const ttl = await this.client.ttl(key);
      const resetTime = Date.now() + (ttl > 0 ? ttl : windowSeconds) * 1000;

      return { allowed, remaining, resetTime };
    } catch (err) {
      this.logger.warn(`Redis rate limit check failed for "${key}": ${(err as Error).message}`);
      return { allowed: true, remaining: maxAttempts, resetTime: Date.now() };
    }
  }

  // =========================================================================
  // 3. LIVE PRESENCE (SETS + TTL)
  // =========================================================================

  async setUserOnline(
    orgPubId: string,
    userPubId: string,
    ttlSeconds = 60,
  ): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const setKey = `presence:org:${orgPubId}:users`;
      const userKey = `presence:user:${userPubId}:org:${orgPubId}`;

      // Add to organization's active user set
      await this.client.sadd(setKey, userPubId);
      // Track user presence with TTL
      await this.client.set(userKey, '1', 'EX', ttlSeconds);
    } catch (err) {
      this.logger.warn(`Redis setUserOnline failed: ${(err as Error).message}`);
    }
  }

  async setUserOffline(orgPubId: string, userPubId: string): Promise<void> {
    if (!this.isAvailable() || !this.client) return;
    try {
      const setKey = `presence:org:${orgPubId}:users`;
      const userKey = `presence:user:${userPubId}:org:${orgPubId}`;

      await this.client.srem(setKey, userPubId);
      await this.client.del(userKey);
    } catch (err) {
      this.logger.warn(`Redis setUserOffline failed: ${(err as Error).message}`);
    }
  }

  async getOnlineUsers(orgPubId: string): Promise<string[]> {
    if (!this.isAvailable() || !this.client) return [];
    try {
      const setKey = `presence:org:${orgPubId}:users`;
      const members = await this.client.smembers(setKey);
      if (members.length === 0) return [];

      // Clean up any stale members whose individual presence key expired
      const verifiedOnline: string[] = [];
      const staleMembers: string[] = [];

      for (const member of members) {
        const userKey = `presence:user:${member}:org:${orgPubId}`;
        const exists = await this.client.exists(userKey);
        if (exists) {
          verifiedOnline.push(member);
        } else {
          staleMembers.push(member);
        }
      }

      if (staleMembers.length > 0) {
        await this.client.srem(setKey, ...staleMembers);
      }

      return verifiedOnline;
    } catch (err) {
      this.logger.warn(`Redis getOnlineUsers failed: ${(err as Error).message}`);
      return [];
    }
  }

  // =========================================================================
  // 4. CRM UNREAD MESSAGE COUNTERS
  // =========================================================================

  async incrementUnread(
    convPubId: string,
    userPubId: string,
  ): Promise<number> {
    const key = `crm:unread:${convPubId}:${userPubId}`;
    return this.incr(key);
  }

  async getUnread(convPubId: string, userPubId: string): Promise<number> {
    const key = `crm:unread:${convPubId}:${userPubId}`;
    return this.getCounter(key);
  }

  async clearUnread(convPubId: string, userPubId: string): Promise<void> {
    const key = `crm:unread:${convPubId}:${userPubId}`;
    await this.del(key);
  }
}
