import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TeamResolver } from '../../../src/team/team.resolver.js';
import { TeamService } from '../../../src/team/team.service.js';

describe('TeamResolver', () => {
  let resolver: TeamResolver;
  let service: TeamService;

  const sampleTeamDto = {
    id: 100,
    pubId: 'tem_test1234567',
    name: 'Frontend Team',
    description: 'UI/UX and Frontend',
    organizationPubId: 'org_test1234567',
    memberCount: 2,
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    service = {
      listOrganizationTeams: vi.fn(),
      getTeam: vi.fn(),
      listUserTeams: vi.fn(),
      listTeamMembers: vi.fn(),
      createTeam: vi.fn(),
      updateTeam: vi.fn(),
      deleteTeam: vi.fn(),
      addTeamMember: vi.fn(),
      removeTeamMember: vi.fn(),
    } as unknown as TeamService;

    resolver = new TeamResolver(service);
  });

  it('should call service.listOrganizationTeams on organizationTeams query', async () => {
    vi.mocked(service.listOrganizationTeams).mockResolvedValue([sampleTeamDto]);
    const result = await resolver.organizationTeams('org_test1234567', 10);
    expect(result).toEqual([sampleTeamDto]);
    expect(service.listOrganizationTeams).toHaveBeenCalledWith(
      'org_test1234567',
      10,
    );
  });

  it('should call service.createTeam on createTeam mutation', async () => {
    vi.mocked(service.createTeam).mockResolvedValue(sampleTeamDto);
    const input = {
      organizationPubId: 'org_test1234567',
      name: 'Frontend Team',
    };
    const result = await resolver.createTeam(10, input);
    expect(result).toEqual(sampleTeamDto);
    expect(service.createTeam).toHaveBeenCalledWith(10, input);
  });
});
