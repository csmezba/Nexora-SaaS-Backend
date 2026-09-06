import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationService } from '../../../src/organization/organization.service.js';
import * as OrgHelper from '../../../src/organization/organization.helper.js';
import { PrismaService } from '../../../src/prisma/prisma.service.js';
import { IUserRepository } from '../../../src/user/domain/repositories/user-repository.interface.js';
import { OrganizationRole } from '../../../src/organization/enums/organization-role.enum.js';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let mockPrisma: any;
  let mockUserRepo: IUserRepository;

  const sampleOrgRecord = {
    id: 1,
    pubId: 'org_abc123',
    name: 'Acme Corp',
    slug: 'acme',
    logoUrl: null,
    description: 'Test Org',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleMemberRecord = {
    id: 100,
    pubId: 'mem_123',
    organizationId: 1,
    userId: 10,
    role: OrganizationRole.OWNER,
    joinedAt: new Date().toISOString(),
  };

  let orgStore: any[];
  let memberStore: any[];

  beforeEach(() => {
    orgStore = [{ ...sampleOrgRecord }];
    memberStore = [{ ...sampleMemberRecord }];

    const createModelMock = (storeGetter: () => any[]) => ({
      first: vi.fn().mockImplementation(async (filter?: any) => {
        const store = storeGetter();
        if (!filter) return store[0] || null;
        return (
          store.find((item) =>
            Object.entries(filter).every(([k, v]) => item[k] === v),
          ) || null
        );
      }),
      where: vi.fn().mockImplementation((predicateOrFilter: any) => {
        let matched = storeGetter();
        if (typeof predicateOrFilter === 'function') {
          matched = storeGetter().filter((item) => {
            try {
              const proxy = new Proxy(
                {},
                {
                  get:
                    (_, prop: string) =>
                    ({
                      eq: (val: any) => item[prop] === val,
                    }),
                },
              );
              return predicateOrFilter(proxy);
            } catch {
              return true;
            }
          });
        } else if (
          predicateOrFilter &&
          typeof predicateOrFilter === 'object'
        ) {
          matched = storeGetter().filter((item) =>
            Object.entries(predicateOrFilter).every(
              ([k, v]) => item[k] === v,
            ),
          );
        }

        return {
          first: vi.fn().mockImplementation(async () => matched[0] || null),
          all: vi.fn().mockImplementation(async () => [...matched]),
          update: vi.fn().mockImplementation(async (data: any) => {
            matched.forEach((item) => Object.assign(item, data));
            return matched.length;
          }),
          delete: vi.fn().mockImplementation(async () => {
            const store = storeGetter();
            matched.forEach((item) => {
              const idx = store.indexOf(item);
              if (idx !== -1) store.splice(idx, 1);
            });
            return matched.length;
          }),
        };
      }),
      create: vi.fn().mockImplementation(async (data: any) => {
        const created = { id: storeGetter().length + 1, ...data };
        storeGetter().push(created);
        return created;
      }),
      all: vi.fn().mockImplementation(async () => [...storeGetter()]),
    });

    const orgMock = createModelMock(() => orgStore);
    const memberMock = createModelMock(() => memberStore);

    mockPrisma = {
      db: {
        orm: {
          Organization: orgMock,
          OrganizationMember: memberMock,
        },
      },
    };

    mockUserRepo = {
      findById: vi.fn(),
      findByPubId: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    service = new OrganizationService(
      mockPrisma as unknown as PrismaService,
      mockUserRepo,
    );
  });

  describe('OrgHelper.resolveOrganization', () => {
    it('should resolve organization by pubId', async () => {
      const org = await OrgHelper.resolveOrganization(mockPrisma, 'org_abc123');
      expect(org.pubId).toBe('org_abc123');
      expect(org.slug).toBe('acme');
    });

    it('should resolve organization by slug', async () => {
      const org = await OrgHelper.resolveOrganization(mockPrisma, 'acme');
      expect(org.slug).toBe('acme');
    });

    it('should throw NotFoundException if organization not found', async () => {
      await expect(
        OrgHelper.resolveOrganization(mockPrisma, 'nonexistent'),
      ).rejects.toThrowError(NotFoundException);
    });

    it('should wrap unknown errors in InternalServerErrorException', async () => {
      vi.mocked(mockPrisma.db.orm.Organization.where).mockImplementationOnce(
        () => {
          throw new Error('DB crashed');
        },
      );

      await expect(
        OrgHelper.resolveOrganization(mockPrisma, 'acme'),
      ).rejects.toThrowError(InternalServerErrorException);
    });
  });

  describe('createOrganization', () => {
    it('should create organization and owner member successfully', async () => {
      const result = await service.createOrganization(10, {
        name: 'Beta Corp',
        slug: 'beta',
      });

      expect(result.slug).toBe('beta');
      expect(result.currentUserRole).toBe(OrganizationRole.OWNER);
      expect(result.memberCount).toBe(1);
    });

    it('should throw ConflictException if slug already exists', async () => {
      await expect(
        service.createOrganization(10, {
          name: 'Acme Corp',
          slug: 'acme',
        }),
      ).rejects.toThrowError(ConflictException);
    });
  });

  describe('getOrganization', () => {
    it('should return organization with role and count', async () => {
      const result = await service.getOrganization('org_abc123', 10);
      expect(result.memberCount).toBe(1);
      expect(result.currentUserRole).toBe(OrganizationRole.OWNER);
    });
  });

  describe('updateOrganization', () => {
    it('should reject update if user is not OWNER or ADMIN', async () => {
      memberStore.push({
        id: 101,
        pubId: 'mem_456',
        organizationId: 1,
        userId: 20,
        role: OrganizationRole.MEMBER,
        joinedAt: new Date().toISOString(),
      });

      await expect(
        service.updateOrganization('org_abc123', 20, { name: 'New Name' }),
      ).rejects.toThrowError(ForbiddenException);
    });

    it('should allow OWNER to update organization', async () => {
      const updated = await service.updateOrganization('org_abc123', 10, {
        name: 'New Acme Name',
      });
      expect(updated.name).toBe('New Acme Name');
    });
  });

  describe('deleteOrganization', () => {
    it('should allow owner to delete organization', async () => {
      const result = await service.deleteOrganization('org_abc123', 10);
      expect(result.success).toBe(true);
      expect(orgStore.length).toBe(0);
    });

    it('should throw ForbiddenException if caller is not owner', async () => {
      memberStore.push({
        id: 102,
        pubId: 'mem_789',
        organizationId: 1,
        userId: 30,
        role: OrganizationRole.ADMIN,
        joinedAt: new Date().toISOString(),
      });

      await expect(
        service.deleteOrganization('org_abc123', 30),
      ).rejects.toThrowError(ForbiddenException);
    });
  });
});
