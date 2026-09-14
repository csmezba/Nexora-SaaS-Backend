import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RealtimeService } from '../../../src/realtime/realtime.service.js';
import type { PusherAdapter } from '../../../src/realtime/adapters/pusher.adapter.js';
import type { SocketIoAdapter } from '../../../src/realtime/adapters/socketio.adapter.js';

describe('RealtimeService', () => {
  let mockPusherAdapter: Partial<PusherAdapter>;
  let mockSocketIoAdapter: Partial<SocketIoAdapter>;

  beforeEach(() => {
    mockPusherAdapter = {
      emit: vi.fn().mockResolvedValue(undefined),
    };
    mockSocketIoAdapter = {
      emit: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('should use socketio driver by default in local environment', async () => {
    delete process.env.VERCEL;
    process.env.REALTIME_DRIVER = 'socketio';

    const service = new RealtimeService(
      mockPusherAdapter as PusherAdapter,
      mockSocketIoAdapter as SocketIoAdapter,
    );

    expect(service.getDriver()).toBe('socketio');

    await service.emit('chat:1', 'new_msg', { text: 'hello' });
    expect(mockSocketIoAdapter.emit).toHaveBeenCalledWith('chat:1', 'new_msg', {
      text: 'hello',
    });
    expect(mockPusherAdapter.emit).not.toHaveBeenCalled();
  });

  it('should use pusher driver when configured or on Vercel', async () => {
    process.env.REALTIME_DRIVER = 'pusher';

    const service = new RealtimeService(
      mockPusherAdapter as PusherAdapter,
      mockSocketIoAdapter as SocketIoAdapter,
    );

    expect(service.getDriver()).toBe('pusher');

    await service.emit('chat:2', 'new_msg', { text: 'hello vercel' });
    expect(mockPusherAdapter.emit).toHaveBeenCalledWith('chat:2', 'new_msg', {
      text: 'hello vercel',
    });
    expect(mockSocketIoAdapter.emit).not.toHaveBeenCalled();
  });
});
