export interface RealtimeAdapter {
  emit<T = unknown>(channel: string, event: string, data: T): Promise<void>;
}
