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
} from '../database/entities';
import { WorkflowService } from './workflow.service';
import { WorkflowTransitionInputDto } from './dto/workflow-definition.dto';

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
  );

  return { service, dataSource, definitions, versions };
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

describe('WorkflowService transition identifiers', () => {
  it('creates readable action keys from labels and keeps existing keys stable', () => {
    const { service } = createService();
    const internals = service as unknown as {
      prepareTransitions: (
        transitions: WorkflowTransitionInputDto[],
      ) => Array<WorkflowTransitionInputDto & { actionKey: string }>;
    };

    const transitions = internals.prepareTransitions([
      {
        sourceKey: 'review',
        targetKey: 'completed',
        label: 'Duyệt',
      },
      {
        sourceKey: 'review',
        targetKey: 'rework',
        label: 'Duyệt',
      },
      {
        sourceKey: 'other_step',
        targetKey: 'completed',
        label: 'Duyệt',
      },
      {
        sourceKey: 'review',
        targetKey: 'completed',
        label: 'Phê duyệt cuối cùng',
        actionKey: 'approve_final',
      },
    ]);

    expect(transitions.map((transition) => transition.actionKey)).toEqual([
      'duyet',
      'duyet_2',
      'duyet',
      'approve_final',
    ]);
  });
});

describe('WorkflowService step permissions', () => {
  it('accepts multiple selected permissions and legacy single-permission definitions', () => {
    const { service } = createService();
    const internals = service as unknown as {
      requiredPermissions: (config: Record<string, unknown>) => string[];
    };

    expect(
      internals.requiredPermissions({
        requiredPermissions: [
          'work_order.execute',
          'work_order.review',
          'work_order.execute',
        ],
      }),
    ).toEqual(['work_order.execute', 'work_order.review']);
    expect(
      internals.requiredPermissions({
        requiredPermission: 'work_order.review',
      }),
    ).toEqual(['work_order.review']);
  });
});
