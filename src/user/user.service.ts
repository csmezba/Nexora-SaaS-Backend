import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import * as UserHelper from './user.helper.js';
import type {
  CreateUserData,
  PrismaUserRecord,
  SanitizedUser,
  UpdateUserData,
} from './types/user.types.js';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<PrismaUserRecord | null> {
    return UserHelper.findUserById(this.prisma, id);
  }

  async findByPubId(pubId: string): Promise<PrismaUserRecord | null> {
    return UserHelper.findUserByPubId(this.prisma, pubId);
  }

  async findByEmail(email: string): Promise<PrismaUserRecord | null> {
    return UserHelper.findUserByEmail(this.prisma, email);
  }

  async create(data: CreateUserData): Promise<PrismaUserRecord> {
    return UserHelper.createUser(this.prisma, data);
  }

  async update(id: number, data: UpdateUserData): Promise<PrismaUserRecord | null> {
    return UserHelper.updateUser(this.prisma, id, data);
  }

  async delete(id: number): Promise<boolean> {
    return UserHelper.deleteUser(this.prisma, id);
  }

  sanitize(user: PrismaUserRecord): SanitizedUser {
    return UserHelper.sanitizeUser(user);
  }
}
