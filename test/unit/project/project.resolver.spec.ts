import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProjectResolver } from '../../../src/project/project.resolver.js';
import { ProjectService } from '../../../src/project/project.service.js';
import { ProjectStatus } from '../../../src/project/enums/project-status.enum.js';

describe('ProjectResolver', () => {
  let resolver: ProjectResolver;
  let service: ProjectService;

  const sampleProjectDto = {
    id: 100,
    pubId: 'prj_test1234567',
    name: 'Nexora Web',
    key: 'NEX',
    status: ProjectStatus.ACTIVE,
    organizationPubId: 'org_test1234567',
    createdBy: {
      pubId: 'usr_123',
      email: 'owner@nexora.app',
      firstName: 'Owner',
      lastName: 'User',
      fullName: 'Owner User',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    memberCount: 1,
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = {
      listOrganizationProjects: vi.fn(),
      listTeamProjects: vi.fn(),
      getProject: vi.fn(),
      listUserProjects: vi.fn(),
      listProjectMembers: vi.fn(),
      createProject: vi.fn(),
      updateProject: vi.fn(),
      deleteProject: vi.fn(),
      addProjectMember: vi.fn(),
      removeProjectMember: vi.fn(),
    } as unknown as ProjectService;

    resolver = new ProjectResolver(service);
  });

  it('should call service.listOrganizationProjects on organizationProjects query', async () => {
    vi.mocked(service.listOrganizationProjects).mockResolvedValue([
      sampleProjectDto,
    ]);
    const result = await resolver.organizationProjects('org_test1234567', 10);
    expect(result).toEqual([sampleProjectDto]);
    expect(service.listOrganizationProjects).toHaveBeenCalledWith(
      'org_test1234567',
      10,
    );
  });

  it('should call service.createProject on createProject mutation', async () => {
    vi.mocked(service.createProject).mockResolvedValue(sampleProjectDto);
    const input = {
      organizationPubId: 'org_test1234567',
      name: 'Nexora Web',
      key: 'NEX',
    };
    const result = await resolver.createProject(10, input);
    expect(result).toEqual(sampleProjectDto);
    expect(service.createProject).toHaveBeenCalledWith(10, input);
  });
});
