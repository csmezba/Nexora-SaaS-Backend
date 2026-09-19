import { Injectable } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService {
  public get db(): typeof db {
    return db;
  }

  public async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    if (typeof this.db?.transaction === 'function') {
      return this.db.transaction(fn);
    }
    return fn(this);
  }
}

export async function runTransaction<T>(
  prisma: PrismaService,
  fn: (tx: any) => Promise<T>,
): Promise<T> {
  if (typeof (prisma as any)?.transaction === 'function') {
    return (prisma as any).transaction(fn);
  }
  if (typeof (prisma as any)?.db?.transaction === 'function') {
    return (prisma as any).db.transaction(fn);
  }
  return fn(prisma);
}
