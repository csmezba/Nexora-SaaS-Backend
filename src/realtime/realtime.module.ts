import { Module, Global } from '@nestjs/common';
import { PusherAdapter } from './adapters/pusher.adapter.js';
import { SocketIoAdapter } from './adapters/socketio.adapter.js';
import { RealtimeGateway } from './gateways/realtime.gateway.js';
import { RealtimeService } from './realtime.service.js';

@Global()
@Module({
  providers: [PusherAdapter, SocketIoAdapter, RealtimeGateway, RealtimeService],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
