import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  type OnGatewayInit,
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { RedisService } from '../../redis/redis.service.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(@Optional() private readonly redisService?: RedisService) {}

  async afterInit(server: Server) {
    const isVercel =
      Boolean(process.env.VERCEL) ||
      process.env.REALTIME_DRIVER === 'pusher';
    if (isVercel) {
      this.logger.log(
        'RealtimeGateway running in serverless mode (Socket.io listener disabled).',
      );
      return;
    }

    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const redisUrl = process.env.REDIS_URL;

    try {
      this.pubClient = redisUrl
        ? new Redis(redisUrl, { lazyConnect: true })
        : new Redis({
            host: redisHost,
            port: redisPort,
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            retryStrategy: () => null,
          });

      this.subClient = this.pubClient.duplicate();

      this.pubClient.on('error', (err) => {
        this.logger.warn(
          `Redis Pub error: ${err.message}. Using in-memory Socket.io adapter.`,
        );
      });
      this.subClient.on('error', (err) => {
        this.logger.warn(`Redis Sub error: ${err.message}.`);
      });

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);
      server.adapter(createAdapter(this.pubClient, this.subClient));
      this.logger.log(
        `Socket.io Redis adapter connected to ${redisHost}:${redisPort}`,
      );
    } catch (err: any) {
      this.logger.warn(
        `Could not connect to Redis (${err.message}). Using default in-memory Socket.io adapter.`,
      );
    }
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    const { orgPubId, userPubId } = client.data || {};
    if (orgPubId && userPubId && this.redisService) {
      await this.redisService.setUserOffline(orgPubId, userPubId);
    }
  }

  @SubscribeMessage('join:channel')
  handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (data?.channel) {
      client.join(data.channel);
      this.logger.debug(`Client ${client.id} joined channel: ${data.channel}`);
      return { status: 'ok', channel: data.channel };
    }
    return { status: 'error', message: 'Channel is required' };
  }

  @SubscribeMessage('leave:channel')
  handleLeaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channel: string },
  ) {
    if (data?.channel) {
      client.leave(data.channel);
      this.logger.debug(`Client ${client.id} left channel: ${data.channel}`);
      return { status: 'ok', channel: data.channel };
    }
    return { status: 'error', message: 'Channel is required' };
  }

  // ==========================================
  // PRESENCE & TYPING INDICATORS
  // ==========================================

  @SubscribeMessage('presence:heartbeat')
  async handlePresenceHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orgPubId: string; userPubId: string },
  ) {
    if (data?.orgPubId && data?.userPubId) {
      client.data.orgPubId = data.orgPubId;
      client.data.userPubId = data.userPubId;
      if (this.redisService) {
        await this.redisService.setUserOnline(data.orgPubId, data.userPubId, 60);
      }
      return { status: 'ok', online: true };
    }
    return { status: 'error', message: 'orgPubId and userPubId required' };
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationPubId: string;
      userPubId: string;
      userName?: string;
    },
  ) {
    if (data?.conversationPubId) {
      client
        .to(`conversation:${data.conversationPubId}`)
        .emit('typing:started', {
          conversationPubId: data.conversationPubId,
          userPubId: data.userPubId,
          userName: data.userName,
        });
      return { status: 'ok' };
    }
    return { status: 'error', message: 'conversationPubId required' };
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationPubId: string;
      userPubId: string;
    },
  ) {
    if (data?.conversationPubId) {
      client
        .to(`conversation:${data.conversationPubId}`)
        .emit('typing:stopped', {
          conversationPubId: data.conversationPubId,
          userPubId: data.userPubId,
        });
      return { status: 'ok' };
    }
    return { status: 'error', message: 'conversationPubId required' };
  }

  emitToChannel<T = unknown>(channel: string, event: string, data: T) {
    if (!this.server) {
      this.logger.warn('Socket.io server not initialized yet.');
      return;
    }
    this.server.to(channel).emit(event, data);
    this.logger.debug(`Emitted event '${event}' to channel '${channel}'`);
  }
}
