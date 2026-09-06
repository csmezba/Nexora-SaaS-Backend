import { PrismaService } from '../prisma/prisma.service.js';
import { generatePubId } from '../common/utils/unique-id.util.js';
import type { PrismaOrmModel } from '../organization/types/organization.types.js';
import type {
  CreatePermissionData,
  CreateRoleData,
  PrismaMemberRoleRecord,
  PrismaPermissionRecord,
  PrismaRolePermissionRecord,
  PrismaRoleRecord,
  UpdatePermissionData,
  UpdateRoleData,
} from './types/role.types.js';

export function getRoleModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaRoleRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaRoleRecord>
  >;
  return (
    orm['Role'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaRoleRecord>>)?.['Role'] ||
    orm['role']!
  );
}

export function getPermissionModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaPermissionRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaPermissionRecord>
  >;
  return (
    orm['Permission'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaPermissionRecord>>)?.['Permission'] ||
    orm['permission']!
  );
}

export function getRolePermissionModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaRolePermissionRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaRolePermissionRecord>
  >;
  return (
    orm['RolePermission'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaRolePermissionRecord>>)?.['RolePermission'] ||
    orm['rolePermission']!
  );
}

export function getMemberRoleModel(
  prisma: PrismaService,
): PrismaOrmModel<PrismaMemberRoleRecord> {
  const orm = prisma.db.orm as unknown as Record<
    string,
    PrismaOrmModel<PrismaMemberRoleRecord>
  >;
  return (
    orm['OrganizationMemberRole'] ||
    (orm['public'] as unknown as Record<string, PrismaOrmModel<PrismaMemberRoleRecord>>)?.['OrganizationMemberRole'] ||
    orm['organizationMemberRole']!
  );
}

// --- Role Queries ---

export async function findRoleById(
  prisma: PrismaService,
  id: number,
): Promise<(PrismaRoleRecord & { permissions: PrismaPermissionRecord[] }) | null> {
  const roleModel = getRoleModel(prisma);
  const record = await roleModel.first({ id });
  if (!record) return null;
  const permissions = await getRolePermissions(prisma, record.id);
  return { ...record, permissions };
}

export async function findRoleByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<(PrismaRoleRecord & { permissions: PrismaPermissionRecord[] }) | null> {
  const roleModel = getRoleModel(prisma);
  const record = await roleModel
    .where((r: { pubId: { eq: (val: string) => unknown } }) =>
      r.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record) return null;
  const permissions = await getRolePermissions(prisma, record.id);
  return { ...record, permissions };
}

export async function findRoleByNameAndOrg(
  prisma: PrismaService,
  organizationId: number,
  name: string,
): Promise<(PrismaRoleRecord & { permissions: PrismaPermissionRecord[] }) | null> {
  const roleModel = getRoleModel(prisma);
  const trimmed = name.trim();
  const records = await roleModel
    .where((r: { organizationId: { eq: (val: number) => unknown } }) =>
      r.organizationId.eq(organizationId),
    )
    .all();

  const matched = (records || []).find(
    (r) =>
      r.organizationId === organizationId &&
      r.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (!matched) return null;
  const permissions = await getRolePermissions(prisma, matched.id);
  return { ...matched, permissions };
}

export async function findRoleByPubIdAndOrg(
  prisma: PrismaService,
  organizationId: number,
  pubId: string,
): Promise<(PrismaRoleRecord & { permissions: PrismaPermissionRecord[] }) | null> {
  const roleModel = getRoleModel(prisma);
  const record = await roleModel
    .where((r: { pubId: { eq: (val: string) => unknown } }) =>
      r.pubId.eq(pubId.trim()),
    )
    .first();
  if (!record || record.organizationId !== organizationId) return null;
  const permissions = await getRolePermissions(prisma, record.id);
  return { ...record, permissions };
}

export async function findAllRolesByOrg(
  prisma: PrismaService,
  organizationId: number,
): Promise<(PrismaRoleRecord & { permissions: PrismaPermissionRecord[] })[]> {
  const roleModel = getRoleModel(prisma);
  const records = await roleModel
    .where((r: { organizationId: { eq: (val: number) => unknown } }) =>
      r.organizationId.eq(organizationId),
    )
    .all();

  const results: (PrismaRoleRecord & { permissions: PrismaPermissionRecord[] })[] = [];
  for (const record of records || []) {
    const permissions = await getRolePermissions(prisma, record.id);
    results.push({ ...record, permissions });
  }
  return results;
}

export async function createRole(
  prisma: PrismaService,
  data: CreateRoleData,
): Promise<PrismaRoleRecord & { permissions: PrismaPermissionRecord[] }> {
  const roleModel = getRoleModel(prisma);
  const now = new Date().toISOString();
  const record = await roleModel.create({
    pubId: data.pubId ?? generatePubId('rol'),
    name: data.name.trim(),
    description: data.description ?? null,
    organizationId: data.organizationId,
    createdAt: now,
    updatedAt: now,
  });

  return { ...record, permissions: [] };
}

export async function updateRole(
  prisma: PrismaService,
  id: number,
  data: UpdateRoleData,
): Promise<(PrismaRoleRecord & { permissions: PrismaPermissionRecord[] }) | null> {
  const roleModel = getRoleModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.name !== undefined) updatePayload['name'] = data.name.trim();
  if (data.description !== undefined)
    updatePayload['description'] = data.description;

  await roleModel.where({ id }).update(updatePayload);
  return findRoleById(prisma, id);
}

export async function deleteRole(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const roleModel = getRoleModel(prisma);
  await roleModel.where({ id }).delete();
  return true;
}

// --- Permissions ---

export async function findPermissionById(
  prisma: PrismaService,
  id: number,
): Promise<PrismaPermissionRecord | null> {
  const permissionModel = getPermissionModel(prisma);
  return permissionModel.first({ id });
}

export async function findPermissionByPubId(
  prisma: PrismaService,
  pubId: string,
): Promise<PrismaPermissionRecord | null> {
  const permissionModel = getPermissionModel(prisma);
  return permissionModel
    .where((p: { pubId: { eq: (val: string) => unknown } }) =>
      p.pubId.eq(pubId.trim()),
    )
    .first();
}

export async function findPermissionByResourceAndAction(
  prisma: PrismaService,
  resource: string,
  action: string,
): Promise<PrismaPermissionRecord | null> {
  const permissionModel = getPermissionModel(prisma);
  const res = resource.toLowerCase().trim();
  const act = action.toLowerCase().trim();
  const all = await permissionModel.all();
  return (
    (all || []).find(
      (p) =>
        p.resource.toLowerCase() === res && p.action.toLowerCase() === act,
    ) ?? null
  );
}

export async function findAllPermissions(
  prisma: PrismaService,
): Promise<PrismaPermissionRecord[]> {
  const permissionModel = getPermissionModel(prisma);
  const all = await permissionModel.all();
  return all || [];
}

export async function findPermissionsByPubIds(
  prisma: PrismaService,
  pubIds: string[],
): Promise<PrismaPermissionRecord[]> {
  const permissionModel = getPermissionModel(prisma);
  const all = await permissionModel.all();
  const idSet = new Set(pubIds.map((id) => id.trim()));
  return (all || []).filter((p) => idSet.has(p.pubId));
}

export async function createPermission(
  prisma: PrismaService,
  data: CreatePermissionData,
): Promise<PrismaPermissionRecord> {
  const permissionModel = getPermissionModel(prisma);
  const now = new Date().toISOString();
  return permissionModel.create({
    pubId: data.pubId ?? generatePubId('perm'),
    resource: data.resource.toLowerCase().trim(),
    action: data.action.toLowerCase().trim(),
    description: data.description ?? null,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updatePermission(
  prisma: PrismaService,
  id: number,
  data: UpdatePermissionData,
): Promise<PrismaPermissionRecord | null> {
  const permissionModel = getPermissionModel(prisma);
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (data.resource !== undefined)
    updatePayload['resource'] = data.resource.toLowerCase().trim();
  if (data.action !== undefined)
    updatePayload['action'] = data.action.toLowerCase().trim();
  if (data.description !== undefined)
    updatePayload['description'] = data.description;

  await permissionModel.where({ id }).update(updatePayload);
  return findPermissionById(prisma, id);
}

export async function deletePermission(
  prisma: PrismaService,
  id: number,
): Promise<boolean> {
  const permissionModel = getPermissionModel(prisma);
  await permissionModel.where({ id }).delete();
  return true;
}

// --- Role Permissions ---

export async function getRolePermissions(
  prisma: PrismaService,
  roleId: number,
): Promise<PrismaPermissionRecord[]> {
  const rolePermissionModel = getRolePermissionModel(prisma);
  const permissionModel = getPermissionModel(prisma);

  const rps = await rolePermissionModel
    .where((rp: { roleId: { eq: (val: number) => unknown } }) =>
      rp.roleId.eq(roleId),
    )
    .all();

  if (!rps || rps.length === 0) return [];

  const permissionIds = rps.map((rp) => rp.permissionId);
  const allPermissions = await permissionModel.all();
  const permMap = new Map((allPermissions || []).map((p) => [p.id, p]));

  return permissionIds
    .map((pid) => permMap.get(pid))
    .filter((p): p is PrismaPermissionRecord => Boolean(p));
}

export async function syncRolePermissions(
  prisma: PrismaService,
  roleId: number,
  permissionIds: number[],
): Promise<PrismaPermissionRecord[]> {
  const rolePermissionModel = getRolePermissionModel(prisma);

  const existing = await rolePermissionModel
    .where((rp: { roleId: { eq: (val: number) => unknown } }) =>
      rp.roleId.eq(roleId),
    )
    .all();

  const targetSet = new Set(permissionIds);
  const currentIds = new Set((existing || []).map((e) => e.permissionId));

  // Remove obsolete
  for (const item of existing || []) {
    if (!targetSet.has(item.permissionId)) {
      await rolePermissionModel
        .where({ roleId, permissionId: item.permissionId })
        .delete();
    }
  }

  // Add new
  for (const pid of permissionIds) {
    if (!currentIds.has(pid)) {
      const now = new Date().toISOString();
      await rolePermissionModel.create({
        pubId: generatePubId('rp'),
        roleId,
        permissionId: pid,
        assignedAt: now,
      });
    }
  }

  return getRolePermissions(prisma, roleId);
}

// --- Member Roles ---

export async function getMemberRoles(
  prisma: PrismaService,
  organizationMemberId: number,
): Promise<(PrismaRoleRecord & { permissions: PrismaPermissionRecord[] })[]> {
  const memberRoleModel = getMemberRoleModel(prisma);

  const memberRoles = await memberRoleModel
    .where((mr: { organizationMemberId: { eq: (val: number) => unknown } }) =>
      mr.organizationMemberId.eq(organizationMemberId),
    )
    .all();

  if (!memberRoles || memberRoles.length === 0) return [];

  const roleIds = memberRoles.map((mr) => mr.roleId);
  const results: (PrismaRoleRecord & { permissions: PrismaPermissionRecord[] })[] = [];

  for (const rId of roleIds) {
    const role = await findRoleById(prisma, rId);
    if (role) {
      results.push(role);
    }
  }

  return results;
}

export async function assignRoleToMember(
  prisma: PrismaService,
  organizationMemberId: number,
  roleId: number,
): Promise<PrismaMemberRoleRecord> {
  const memberRoleModel = getMemberRoleModel(prisma);

  const existing = await memberRoleModel
    .where((mr: {
      organizationMemberId: { eq: (val: number) => unknown };
      roleId: { eq: (val: number) => unknown };
    }) => mr.organizationMemberId.eq(organizationMemberId))
    .all();

  const found = (existing || []).find(
    (mr) =>
      mr.organizationMemberId === organizationMemberId &&
      mr.roleId === roleId,
  );

  if (found) {
    return found;
  }

  const now = new Date().toISOString();
  return memberRoleModel.create({
    pubId: generatePubId('omr'),
    organizationMemberId,
    roleId,
    assignedAt: now,
  });
}

export async function removeRoleFromMember(
  prisma: PrismaService,
  organizationMemberId: number,
  roleId: number,
): Promise<boolean> {
  const memberRoleModel = getMemberRoleModel(prisma);
  await memberRoleModel
    .where({ organizationMemberId, roleId })
    .delete();
  return true;
}
