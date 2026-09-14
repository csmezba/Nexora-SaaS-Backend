import { Injectable, Logger } from '@nestjs/common';
import type { RealtimeAdapter } from '../interfaces/realtime-adapter.interface.js';
import { RealtimeGateway } from '../gateways/realtime.gateway.js';

@Injectable()
export class SocketIoAdapter implements RealtimeAdapter {
  private readonly logger = new Logger(SocketIoAdapter.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  async emit<T = unknown>(channel: string, event: string, data: T): Promise<void> {
    try {
      this.gateway.emitToChannel(channel, event, data);
    } catch (error) {
      this.logger.error(
        `Failed to emit Socket.io event '${event}' to channel '${channel}':`,
        error,
      );
    }
  }
}
