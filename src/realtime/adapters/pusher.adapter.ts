import { Injectable, Logger } from '@nestjs/common';
import Pusher from 'pusher';
import type { RealtimeAdapter } from '../interfaces/realtime-adapter.interface.js';

@Injectable()
export class PusherAdapter implements RealtimeAdapter {
  private readonly logger = new Logger(PusherAdapter.name);
  private pusher: Pusher | null = null;

  constructor() {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || 'mt1';
    const useTLS = process.env.PUSHER_USE_TLS !== 'false';

    if (appId && key && secret) {
      this.pusher = new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS,
      });
      this.logger.log(`PusherAdapter initialized for cluster: ${cluster}`);
    } else {
      this.logger.warn(
        'Pusher credentials not fully provided. PusherAdapter running in mock/noop mode.',
      );
    }
  }

  async emit<T = unknown>(channel: string, event: string, data: T): Promise<void> {
    if (!this.pusher) {
      this.logger.debug(
        `[Pusher Mock] Channel: ${channel}, Event: ${event}, Data: ${JSON.stringify(data)}`,
      );
      return;
    }

    try {
      await this.pusher.trigger(channel, event, data);
    } catch (error) {
      this.logger.error(
        `Failed to trigger Pusher event on channel ${channel}:`,
        error,
      );
    }
  }
}
