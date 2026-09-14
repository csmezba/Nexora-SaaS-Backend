import { Injectable, Logger } from '@nestjs/common';
import type { RealtimeAdapter } from './interfaces/realtime-adapter.interface.js';
import { PusherAdapter } from './adapters/pusher.adapter.js';
import { SocketIoAdapter } from './adapters/socketio.adapter.js';

@Injectable()
export class RealtimeService implements RealtimeAdapter {
  private readonly logger = new Logger(RealtimeService.name);
  private activeDriver: 'pusher' | 'socketio';

  constructor(
    private readonly pusherAdapter: PusherAdapter,
    private readonly socketIoAdapter: SocketIoAdapter,
  ) {
    const isVercel = Boolean(process.env.VERCEL);
    const configuredDriver = process.env.REALTIME_DRIVER?.toLowerCase();

    if (configuredDriver === 'pusher' || isVercel) {
      this.activeDriver = 'pusher';
    } else {
      this.activeDriver = 'socketio';
    }

    this.logger.log(
      `RealtimeService initialized with active driver: [${this.activeDriver}]`,
    );
  }

  getDriver(): 'pusher' | 'socketio' {
    return this.activeDriver;
  }

  async emit<T = unknown>(channel: string, event: string, data: T): Promise<void> {
    if (this.activeDriver === 'pusher') {
      return this.pusherAdapter.emit(channel, event, data);
    }
    return this.socketIoAdapter.emit(channel, event, data);
  }
}
