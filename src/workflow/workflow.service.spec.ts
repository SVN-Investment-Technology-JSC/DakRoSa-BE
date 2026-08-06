import { ConflictException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import {
  MaintenanceScheduleEntity,
  WorkflowActionEntity,
  WorkflowAssigneeRuleEntity,
  WorkflowDefinitionEntity,
  WorkflowInstanceEntity,
  WorkflowNodeEntity,
  WorkflowTaskAssignmentEntity,
  WorkflowTaskEntity,
  WorkflowTransitionEntity,
  WorkflowVersionEntity,
  WorkflowRoleMappingEntity,
  WorkflowRoleMappingTargetType,
  TenantMembershipEntity,
} from '../database/entities';
import { WorkflowService } from './workflow.service';

const tenantId = 'tenant-1';
const definitionId = 'workflow-1';

function workflowDefinition(
  status: WorkflowDefinitionEntity['status'],
  currentVersionId: string | null = null,
) {
  return {
    id: definitionId,
    tenantId,
    status,
    currentVersionId,
  } as WorkflowDefinitionEntity;
}

function createService() {
  const definitions = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const versions = {
    find: jest.fn(),
  };
  const roleMappings = {
    find: jest.fn(),
  };
  const dataSource = {
    transaction: jest.fn(),
  };
  const emptyRepository = {};

  const service = new WorkflowService(
    dataSource as unknown as DataSource,
    definitions as unknown as Repository<WorkflowDefinitionEntity>,
    versions as unknown as Repository<WorkflowVersionEntity>,
    emptyRepository as Repository<WorkflowNodeEntity>,
    emptyRepository as Repository<WorkflowTransitionEntity>,
    emptyRepository as Repository<WorkflowAssigneeRuleEntity>,
    emptyRepository as Repository<WorkflowInstanceEntity>,
    emptyRepository as Repository<WorkflowTaskEntity>,
    emptyRepository as Repository<WorkflowTaskAssignmentEntity>,
    emptyRepository as Repository<WorkflowActionEntity>,
    roleMappings as unknown as Repository<WorkflowRoleMappingEntity>,
  );

  return { service, dataSource, definitions, versions, roleMappings };
}

function configureTransaction(
  dataSource: ReturnType<typeof createService>['dataSource'],
  definition: WorkflowDefinitionEntity,
  scheduleCount = 0,
  instanceCount = 0,
) {
  const definitionRepository = {
    findOne: jest.fn().mockResolvedValue(definition),
    save: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    remove: jest.fn().mockImplementation((value) => Promise.resolve(value)),
  };
  const scheduleRepository = {
    count: jest.fn().mockResolvedValue(scheduleCount),
  };
  const instanceRepository = {
    count: jest.fn().mockResolvedValue(instanceCount),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === WorkflowDefinitionEntity) return definitionRepository;
      if (entity === MaintenanceScheduleEntity) return scheduleRepository;
      if (entity === WorkflowInstanceEntity) return instanceRepository;
      throw new Error('Unexpected repository.');
    }),
  };

  dataSource.transaction.mockImplementation(
    async (callback: (entityManager: EntityManager) => Promise<unknown>) =>
      callback(manager as unknown as EntityManager),
  );

  return {
    definitionRepository,
    scheduleRepository,
    instanceRepository,
  };
}

describe('WorkflowService archive lifecycle', () => {
  it('archives an active workflow', async () => {
    const { service, definitions } = createService();
    const definition = workflowDefinition('published', 'version-1');
    definitions.findOne.mockResolvedValue(definition);
    definitions.save.mockImplementation((value) => Promise.resolve(value));

    await expect(
      service.archiveDefinition(tenantId, definitionId),
    ).resolves.toMatchObject({
      id: definitionId,
      status: 'archived',
    });
    expect(definitions.save).toHaveBeenCalledWith(definition);
  });

  it('restores an archived published workflow to published status', async () => {
    const { service, definitions } = createService();
    const definition = workflowDefinition('archived', 'version-1');
    definitions.findOne.mockResolvedValue(definition);
    definitions.save.mockImplementation((value) => Promise.resolve(value));

    await expect(
      service.restoreDefinition(tenantId, definitionId),
    ).resolves.toMatchObject({
      status: 'published',
    });
  });

  it('restores an archived unpublished workflow to draft status', async () => {
    const { service, definitions } = createService();
    const definition = workflowDefinition('archived');
    definitions.findOne.mockResolvedValue(definition);
    definitions.save.mockImplementation((value) => Promise.resolve(value));

    await expect(
      service.restoreDefinition(tenantId, definitionId),
    ).resolves.toMatchObject({
      status: 'draft',
    });
  });

  it('does not restore a workflow that is not archived', async () => {
    const { service, definitions } = createService();
    definitions.findOne.mockResolvedValue(workflowDefinition('draft'));

    await expect(
      service.restoreDefinition(tenantId, definitionId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not permanently delete a workflow that is not archived', async () => {
    const { service, dataSource } = createService();
    configureTransaction(dataSource, workflowDefinition('published'));

    await expect(
      service.deleteDefinitionPermanently(tenantId, definitionId),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not permanently delete an archived workflow referenced by history', async () => {
    const { service, dataSource } = createService();
    const repositories = configureTransaction(
      dataSource,
      workflowDefinition('archived', 'version-1'),
      2,
      3,
    );

    await expect(
      service.deleteDefinitionPermanently(tenantId, definitionId),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repositories.definitionRepository.remove).not.toHaveBeenCalled();
  });

  it('permanently deletes an unreferenced archived workflow', async () => {
    const { service, dataSource } = createService();
    const definition = workflowDefinition('archived', 'version-1');
    const repositories = configureTransaction(dataSource, definition);

    await expect(
      service.deleteDefinitionPermanently(tenantId, definitionId),
    ).resolves.toEqual({
      id: definitionId,
      deleted: true,
    });
    expect(repositories.definitionRepository.save).toHaveBeenCalledWith({
      ...definition,
      currentVersionId: null,
    });
    expect(repositories.definitionRepository.remove).toHaveBeenCalledWith(
      definition,
    );
  });
});

describe('WorkflowService role mappings', () => {
  it('returns only mappings for a workflow in the current tenant', async () => {
    const { service, definitions, roleMappings } = createService();
    definitions.findOne.mockResolvedValue(workflowDefinition('draft'));
    roleMappings.find.mockResolvedValue([
      {
        id: 'mapping-1',
        definitionId,
        variableKey: 'technical_reviewer',
        targetType: WorkflowRoleMappingTargetType.ROLE,
        targetId: 'role-1',
      },
    ]);

    await expect(
      service.getRoleMappings(tenantId, definitionId),
    ).resolves.toEqual({
      definitionId,
      mappings: [
        expect.objectContaining({ variableKey: 'technical_reviewer' }),
      ],
    });
    expect(roleMappings.find).toHaveBeenCalledWith({
      where: { definitionId },
      order: { variableKey: 'ASC' },
    });
  });

  it('reports variables that have not been configured in the master board', async () => {
    const { service, definitions, roleMappings } = createService();
    definitions.findOne.mockResolvedValue(workflowDefinition('draft'));
    roleMappings.find.mockResolvedValue([
      {
        definitionId,
        variableKey: 'executor',
        targetType: WorkflowRoleMappingTargetType.POSITION,
        targetId: 'position-1',
      },
    ]);

    await expect(
      service.resolveRoleMappings(tenantId, definitionId, {
        variableKeys: ['executor', 'technical_reviewer'],
      }),
    ).resolves.toMatchObject({
      definitionId,
      missingVariableKeys: ['technical_reviewer'],
      mappings: [expect.objectContaining({ variableKey: 'executor' })],
    });
  });

  it('uses every master-board mapping for a task recipient variable', async () => {
    const { service } = createService();
    const ruleRepository = {
      find: jest.fn().mockResolvedValue([
        {
          assigneeVariableKey: 'executor',
          type: 'ROLE',
          subjectId: null,
        },
      ]),
    };
    const mappingRepository = {
      find: jest.fn().mockResolvedValue([
        {
          variableKey: 'executor',
          targetType: WorkflowRoleMappingTargetType.USER,
          targetId: 'user-2',
        },
        {
          variableKey: 'executor',
          targetType: WorkflowRoleMappingTargetType.USER,
          targetId: 'user-3',
        },
      ]),
    };
    const membershipRepository = {
      exists: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === WorkflowAssigneeRuleEntity) return ruleRepository;
        if (entity === WorkflowRoleMappingEntity) return mappingRepository;
        if (entity === TenantMembershipEntity) return membershipRepository;
        throw new Error('Unexpected repository.');
      }),
    };
    const internals = service as unknown as {
      resolveAssignees: (
        manager: EntityManager,
        instance: WorkflowInstanceEntity,
        node: WorkflowNodeEntity,
      ) => Promise<string[]>;
    };

    await expect(
      internals.resolveAssignees(
        manager as unknown as EntityManager,
        {
          id: 'instance-1',
          tenantId,
          definitionId,
          context: { createdBy: 'creator-1' },
        } as unknown as WorkflowInstanceEntity,
        { id: 'node-1' } as WorkflowNodeEntity,
      ),
    ).resolves.toEqual(['user-2', 'user-3']);
  });

  it('does not fall back to the creator when a master-board variable is missing', async () => {
    const { service } = createService();
    const ruleRepository = {
      find: jest.fn().mockResolvedValue([
        {
          assigneeVariableKey: 'technical_reviewer',
          type: 'ROLE',
          subjectId: null,
        },
      ]),
    };
    const mappingRepository = { find: jest.fn().mockResolvedValue([]) };
    const manager = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === WorkflowAssigneeRuleEntity) return ruleRepository;
        if (entity === WorkflowRoleMappingEntity) return mappingRepository;
        if (entity === TenantMembershipEntity) return {};
        throw new Error('Unexpected repository.');
      }),
    };
    const internals = service as unknown as {
      resolveAssignees: (
        manager: EntityManager,
        instance: WorkflowInstanceEntity,
        node: WorkflowNodeEntity,
      ) => Promise<string[]>;
    };

    await expect(
      internals.resolveAssignees(
        manager as unknown as EntityManager,
        {
          id: 'instance-1',
          tenantId,
          definitionId,
          context: { createdBy: 'creator-1' },
        } as unknown as WorkflowInstanceEntity,
        { id: 'node-1' } as WorkflowNodeEntity,
      ),
    ).resolves.toEqual([]);
  });
});
