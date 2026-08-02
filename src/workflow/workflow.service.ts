import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  MaintenanceScheduleEntity,
  NotificationEntity,
  OrganizationUnitEntity,
  TenantMembershipEntity,
  WorkflowActionEntity,
  WorkflowAssigneeRuleEntity,
  WorkflowAssigneeType,
  WorkflowDefinitionEntity,
  WorkflowInstanceEntity,
  WorkflowNodeEntity,
  WorkflowNodeType,
  WorkflowTaskAssignmentEntity,
  WorkflowTaskEntity,
  WorkflowTokenEntity,
  WorkflowTransitionEntity,
  WorkflowVersionEntity,
} from '../database/entities';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import {
  CloneWorkflowDefinitionDto,
  CreateWorkflowDefinitionDto,
  SaveWorkflowDraftDto,
  WorkflowActionDto,
  WorkflowNodeInputDto,
  WorkflowTransitionInputDto,
} from './dto/workflow-definition.dto';

export interface WorkflowGraphView {
  version: WorkflowVersionEntity;
  nodes: Array<
    WorkflowNodeEntity & { assignees: WorkflowAssigneeRuleEntity[] }
  >;
  transitions: WorkflowTransitionEntity[];
}

export interface WorkflowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface StartWorkflowInput {
  tenantId: string;
  definitionId: string;
  resourceType: string;
  resourceId: string;
  context: Record<string, unknown>;
  actorId: string | null;
}

@Injectable()
export class WorkflowService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly definitions: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(WorkflowVersionEntity)
    private readonly versions: Repository<WorkflowVersionEntity>,
    @InjectRepository(WorkflowNodeEntity)
    private readonly nodes: Repository<WorkflowNodeEntity>,
    @InjectRepository(WorkflowTransitionEntity)
    private readonly transitions: Repository<WorkflowTransitionEntity>,
    @InjectRepository(WorkflowAssigneeRuleEntity)
    private readonly assigneeRules: Repository<WorkflowAssigneeRuleEntity>,
    @InjectRepository(WorkflowInstanceEntity)
    private readonly instances: Repository<WorkflowInstanceEntity>,
    @InjectRepository(WorkflowTaskEntity)
    private readonly tasks: Repository<WorkflowTaskEntity>,
    @InjectRepository(WorkflowTaskAssignmentEntity)
    private readonly taskAssignments: Repository<WorkflowTaskAssignmentEntity>,
    @InjectRepository(WorkflowActionEntity)
    private readonly actions: Repository<WorkflowActionEntity>,
  ) {}

  async listDefinitions(tenantId: string) {
    return this.listDefinitionsByStatuses(tenantId, ['draft', 'published']);
  }

  async listArchivedDefinitions(tenantId: string) {
    return this.listDefinitionsByStatuses(tenantId, ['archived']);
  }

  private async listDefinitionsByStatuses(
    tenantId: string,
    statuses: WorkflowDefinitionEntity['status'][],
  ) {
    const definitions = await this.definitions.find({
      where: { tenantId, status: In(statuses) },
      order: { updatedAt: 'DESC' },
    });
    const definitionIds = definitions.map((definition) => definition.id);
    const versions = definitionIds.length
      ? await this.versions.find({
          where: { definitionId: In(definitionIds) },
          order: { versionNumber: 'DESC' },
        })
      : [];
    const grouped = new Map<string, WorkflowVersionEntity[]>();
    for (const version of versions) {
      grouped.set(version.definitionId, [
        ...(grouped.get(version.definitionId) ?? []),
        version,
      ]);
    }
    return definitions.map((definition) => ({
      ...definition,
      versions: grouped.get(definition.id) ?? [],
    }));
  }

  async getDefinition(tenantId: string, id: string) {
    const definition = await this.requireDefinition(tenantId, id);
    const versions = await this.versions.find({
      where: { definitionId: id },
      order: { versionNumber: 'DESC' },
    });
    const selected =
      versions.find((version) => version.status === 'draft') ??
      versions.find((version) => version.id === definition.currentVersionId) ??
      versions[0];
    return {
      ...definition,
      versions,
      graph: selected ? await this.loadGraph(selected.id) : null,
    };
  }

  async createDefinition(
    tenantId: string,
    userId: string,
    dto: CreateWorkflowDefinitionDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const definitionRepo = manager.getRepository(WorkflowDefinitionEntity);
      if (await definitionRepo.exists({ where: { tenantId, key: dto.key } })) {
        throw new ConflictException(
          `Workflow key "${dto.key}" already exists.`,
        );
      }
      const definition = await definitionRepo.save(
        definitionRepo.create({
          tenantId,
          key: dto.key,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          resourceType: dto.resourceType?.trim() || 'maintenance_work_order',
          status: 'draft',
          createdBy: userId,
        }),
      );
      const versionRepo = manager.getRepository(WorkflowVersionEntity);
      const version = await versionRepo.save(
        versionRepo.create({
          definitionId: definition.id,
          versionNumber: 1,
          status: 'draft',
          schemaVersion: 1,
          changelog: 'Khởi tạo quy trình.',
          createdBy: userId,
        }),
      );
      await this.replaceGraph(manager, version, this.defaultGraph());
      return this.getDefinitionWithManager(manager, tenantId, definition.id);
    });
  }

  async saveDraft(
    tenantId: string,
    id: string,
    userId: string,
    dto: SaveWorkflowDraftDto,
  ) {
    const validation = this.validateGraphInput(dto.nodes, dto.transitions);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Sơ đồ quy trình chưa hợp lệ.',
        errors: validation.errors,
      });
    }
    return this.dataSource.transaction(async (manager) => {
      const definition = await this.requireDefinitionWithManager(
        manager,
        tenantId,
        id,
      );
      const draft = await this.ensureDraft(manager, definition, userId);
      draft.changelog = dto.changelog?.trim() || draft.changelog;
      await manager.getRepository(WorkflowVersionEntity).save(draft);
      await this.replaceGraph(manager, draft, dto);
      return this.getDefinitionWithManager(manager, tenantId, id);
    });
  }

  async validateDefinition(
    tenantId: string,
    id: string,
  ): Promise<WorkflowValidationResult> {
    const definition = await this.requireDefinition(tenantId, id);
    const version = await this.versions.findOne({
      where: { definitionId: id, status: 'draft' },
      order: { versionNumber: 'DESC' },
    });
    if (!version) {
      if (!definition.currentVersionId) {
        return {
          valid: false,
          errors: ['Quy trình chưa có phiên bản nháp hoặc đã công bố.'],
          warnings: [],
        };
      }
      return this.validateLoadedGraph(
        await this.loadGraph(definition.currentVersionId),
      );
    }
    return this.validateLoadedGraph(await this.loadGraph(version.id));
  }

  async publishDefinition(tenantId: string, id: string, userId: string) {
    const result = await this.validateDefinition(tenantId, id);
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Không thể công bố quy trình chưa hợp lệ.',
        errors: result.errors,
      });
    }
    return this.dataSource.transaction(async (manager) => {
      const definition = await this.requireDefinitionWithManager(
        manager,
        tenantId,
        id,
      );
      const versionRepo = manager.getRepository(WorkflowVersionEntity);
      const draft = await versionRepo.findOne({
        where: { definitionId: id, status: 'draft' },
        order: { versionNumber: 'DESC' },
      });
      if (!draft) {
        throw new ConflictException('Quy trình không có phiên bản nháp.');
      }
      if (definition.currentVersionId) {
        await versionRepo.update(
          { id: definition.currentVersionId, status: 'published' },
          { status: 'retired' },
        );
      }
      draft.status = 'published';
      draft.publishedBy = userId;
      draft.publishedAt = new Date();
      await versionRepo.save(draft);
      definition.status = 'published';
      definition.currentVersionId = draft.id;
      await manager.getRepository(WorkflowDefinitionEntity).save(definition);
      return this.getDefinitionWithManager(manager, tenantId, id);
    });
  }

  async cloneDefinition(
    tenantId: string,
    id: string,
    userId: string,
    dto: CloneWorkflowDefinitionDto,
  ) {
    const source = await this.requireDefinition(tenantId, id);
    const versionId = source.currentVersionId;
    if (!versionId) {
      throw new BadRequestException('Quy trình nguồn chưa có phiên bản.');
    }
    const sourceGraph = await this.loadGraph(versionId);
    return this.dataSource.transaction(async (manager) => {
      const definitionRepo = manager.getRepository(WorkflowDefinitionEntity);
      if (await definitionRepo.exists({ where: { tenantId, key: dto.key } })) {
        throw new ConflictException(
          `Workflow key "${dto.key}" already exists.`,
        );
      }
      const target = await definitionRepo.save(
        definitionRepo.create({
          tenantId,
          key: dto.key,
          name: dto.name.trim(),
          description: source.description,
          resourceType: source.resourceType,
          status: 'draft',
          createdBy: userId,
        }),
      );
      const version = await manager.getRepository(WorkflowVersionEntity).save({
        definitionId: target.id,
        versionNumber: 1,
        status: 'draft',
        schemaVersion: sourceGraph.version.schemaVersion,
        changelog: `Nhân bản từ ${source.name}.`,
        createdBy: userId,
      });
      await this.replaceGraph(manager, version, this.graphToInput(sourceGraph));
      return this.getDefinitionWithManager(manager, tenantId, target.id);
    });
  }

  async archiveDefinition(tenantId: string, id: string) {
    const definition = await this.requireDefinition(tenantId, id);
    if (definition.status === 'archived') return definition;
    definition.status = 'archived';
    return this.definitions.save(definition);
  }

  async restoreDefinition(tenantId: string, id: string) {
    const definition = await this.requireDefinition(tenantId, id);
    if (definition.status !== 'archived') {
      throw new ConflictException(
        'Chỉ có thể khôi phục quy trình đang được lưu trữ.',
      );
    }
    definition.status = definition.currentVersionId ? 'published' : 'draft';
    return this.definitions.save(definition);
  }

  async deleteDefinitionPermanently(tenantId: string, id: string) {
    return this.dataSource.transaction(async (manager) => {
      const definition = await this.requireDefinitionWithManager(
        manager,
        tenantId,
        id,
      );
      if (definition.status !== 'archived') {
        throw new ConflictException(
          'Quy trình phải được lưu trữ trước khi xóa vĩnh viễn.',
        );
      }

      const [scheduleCount, instanceCount] = await Promise.all([
        manager.getRepository(MaintenanceScheduleEntity).count({
          where: { tenantId, workflowDefinitionId: id },
        }),
        manager.getRepository(WorkflowInstanceEntity).count({
          where: { tenantId, definitionId: id },
        }),
      ]);
      if (scheduleCount || instanceCount) {
        throw new ConflictException(
          `Không thể xóa vĩnh viễn vì quy trình đang được tham chiếu bởi ${scheduleCount} kế hoạch và ${instanceCount} lịch sử xử lý.`,
        );
      }

      const definitionRepo = manager.getRepository(WorkflowDefinitionEntity);
      if (definition.currentVersionId) {
        definition.currentVersionId = null;
        await definitionRepo.save(definition);
      }
      await definitionRepo.remove(definition);
      return { id, deleted: true };
    });
  }

  async startInstance(input: StartWorkflowInput) {
    return this.dataSource.transaction(async (manager) => {
      const definition = await this.requireDefinitionWithManager(
        manager,
        input.tenantId,
        input.definitionId,
      );
      if (definition.status !== 'published' || !definition.currentVersionId) {
        throw new BadRequestException(
          'Quy trình chưa được công bố hoặc đã ngừng sử dụng.',
        );
      }
      const nodeRepo = manager.getRepository(WorkflowNodeEntity);
      const startNode = await nodeRepo.findOne({
        where: {
          versionId: definition.currentVersionId,
          type: WorkflowNodeType.START,
        },
      });
      if (!startNode) {
        throw new BadRequestException('Quy trình không có điểm bắt đầu.');
      }
      const instanceRepo = manager.getRepository(WorkflowInstanceEntity);
      const existing = await instanceRepo.findOne({
        where: {
          tenantId: input.tenantId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          status: In(['running', 'blocked']),
        },
      });
      if (existing) return existing;

      const instance = await instanceRepo.save(
        instanceRepo.create({
          tenantId: input.tenantId,
          definitionId: definition.id,
          versionId: definition.currentVersionId,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          currentNodeId: startNode.id,
          status: 'running',
          context: input.context,
          startedAt: new Date(),
          completedAt: null,
        }),
      );
      const token = await manager.getRepository(WorkflowTokenEntity).save({
        instanceId: instance.id,
        nodeId: startNode.id,
        status: 'active',
        branchKey: null,
        consumedAt: null,
      });
      await manager.getRepository(WorkflowActionEntity).save({
        tenantId: input.tenantId,
        instanceId: instance.id,
        taskId: null,
        actorId: input.actorId,
        actionKey: 'started',
        fromNodeId: null,
        toNodeId: startNode.id,
        note: null,
        payload: {},
        idempotencyKey: null,
      });
      await this.activateToken(manager, instance, token, 0);
      return instanceRepo.findOneOrFail({ where: { id: instance.id } });
    });
  }

  async performAction(
    tenantId: string,
    instanceId: string,
    user: AuthUser,
    dto: WorkflowActionDto,
  ) {
    if (dto.idempotencyKey) {
      const existing = await this.actions.findOne({
        where: { tenantId, idempotencyKey: dto.idempotencyKey },
      });
      if (existing) return this.getInstance(tenantId, instanceId, user);
    }
    await this.dataSource.transaction(async (manager) => {
      const instance = await manager
        .getRepository(WorkflowInstanceEntity)
        .createQueryBuilder('instance')
        .setLock('pessimistic_write')
        .where('instance.id = :instanceId', { instanceId })
        .andWhere('instance.tenant_id = :tenantId', { tenantId })
        .getOne();
      if (!instance)
        throw new NotFoundException('Workflow instance not found.');
      if (!['running', 'blocked'].includes(instance.status)) {
        throw new ConflictException('Quy trình đã kết thúc.');
      }

      const taskRepo = manager.getRepository(WorkflowTaskEntity);
      const activeTasks = await taskRepo.find({
        where: {
          instanceId,
          status: In(['pending', 'claimed', 'blocked']),
        },
        relations: { node: true },
        order: { createdAt: 'ASC' },
      });
      const candidateTasks = dto.taskId
        ? activeTasks.filter((task) => task.id === dto.taskId)
        : activeTasks;
      if (!candidateTasks.length) {
        throw new NotFoundException('Không tìm thấy công việc đang chờ xử lý.');
      }

      const assignmentRepo = manager.getRepository(
        WorkflowTaskAssignmentEntity,
      );
      let task: WorkflowTaskEntity | undefined;
      for (const candidate of candidateTasks) {
        const assigned = await assignmentRepo.exists({
          where: { taskId: candidate.id, userId: user.id },
        });
        if (
          assigned ||
          user.isPlatformAdmin ||
          user.roleCodes.includes('admin')
        ) {
          task = candidate;
          break;
        }
      }
      if (!task) {
        throw new ForbiddenException('Công việc không được phân công cho bạn.');
      }

      const transition = await manager
        .getRepository(WorkflowTransitionEntity)
        .findOne({
          where: {
            versionId: instance.versionId,
            sourceNodeId: task.nodeId,
            actionKey: dto.actionKey,
          },
        });
      if (!transition) {
        throw new BadRequestException(
          'Hành động không hợp lệ tại bước hiện tại.',
        );
      }
      const requiredPermission = task.node.config['requiredPermission'];
      if (
        typeof requiredPermission === 'string' &&
        requiredPermission &&
        !user.isPlatformAdmin &&
        !user.roleCodes.includes('admin') &&
        !user.permissions.includes(requiredPermission)
      ) {
        throw new ForbiddenException(
          `Bạn thiếu quyền "${requiredPermission}" để xử lý bước này.`,
        );
      }
      this.validateActionPayload(
        task.node.config['formFields'],
        dto.payload ?? {},
        dto.actionKey,
      );
      if (
        transition.condition &&
        !this.evaluateCondition(transition.condition, {
          ...instance.context,
          ...dto.payload,
        })
      ) {
        throw new BadRequestException(
          'Điều kiện chuyển bước chưa được đáp ứng.',
        );
      }

      task.status = 'completed';
      task.claimedBy = user.id;
      task.completedAt = new Date();
      await taskRepo.save(task);
      await assignmentRepo.update(
        { taskId: task.id, userId: user.id },
        { actedAt: new Date(), type: 'assignee' },
      );

      const tokenId =
        typeof task.payload['tokenId'] === 'string'
          ? task.payload['tokenId']
          : undefined;
      const tokenRepo = manager.getRepository(WorkflowTokenEntity);
      const token = tokenId
        ? await tokenRepo.findOne({
            where: { id: tokenId, instanceId, status: 'active' },
          })
        : await tokenRepo.findOne({
            where: {
              instanceId,
              nodeId: task.nodeId,
              status: 'active',
            },
          });
      if (!token) {
        throw new ConflictException('Workflow token is no longer active.');
      }

      await manager.getRepository(WorkflowActionEntity).save({
        tenantId,
        instanceId,
        taskId: task.id,
        actorId: user.id,
        actionKey: dto.actionKey,
        fromNodeId: task.nodeId,
        toNodeId: transition.targetNodeId,
        note: dto.note?.trim() || null,
        payload: dto.payload ?? {},
        idempotencyKey: dto.idempotencyKey ?? null,
      });
      await this.moveToken(
        manager,
        instance,
        token,
        transition.targetNodeId,
        0,
      );
      await this.refreshInstanceStatus(manager, instance.id);
    });
    return this.getInstance(tenantId, instanceId, user);
  }

  async getInstance(tenantId: string, instanceId: string, user?: AuthUser) {
    const instance = await this.instances.findOne({
      where: { id: instanceId, tenantId },
      relations: { definition: true, version: true, currentNode: true },
    });
    if (!instance) throw new NotFoundException('Workflow instance not found.');
    const tasks = await this.tasks.find({
      where: { instanceId },
      relations: { node: true, claimant: true },
      order: { createdAt: 'ASC' },
    });
    const assignments = tasks.length
      ? await this.taskAssignments.find({
          where: { taskId: In(tasks.map((task) => task.id)) },
          relations: { user: true },
        })
      : [];
    const actions = await this.actions.find({
      where: { tenantId, instanceId },
      relations: { actor: true, fromNode: true, toNode: true },
      order: { createdAt: 'ASC' },
    });
    const availableActions = user
      ? await this.availableActions(instance, tasks, assignments, user)
      : [];
    return { ...instance, tasks, assignments, actions, availableActions };
  }

  async workItems(user: AuthUser) {
    const assignments = await this.taskAssignments
      .createQueryBuilder('assignment')
      .innerJoinAndSelect('assignment.task', 'task')
      .innerJoinAndSelect('task.node', 'node')
      .innerJoinAndSelect('task.instance', 'instance')
      .where('assignment.user_id = :userId', { userId: user.id })
      .andWhere('instance.tenant_id = :tenantId', {
        tenantId: user.tenantId,
      })
      .andWhere('task.status IN (:...statuses)', {
        statuses: ['pending', 'claimed', 'blocked'],
      })
      .orderBy('task.due_at', 'ASC', 'NULLS LAST')
      .addOrderBy('task.created_at', 'DESC')
      .getMany();
    return assignments.map((assignment) => ({
      ...assignment.task,
      assignmentType: assignment.type,
    }));
  }

  private async requireDefinition(tenantId: string, id: string) {
    const definition = await this.definitions.findOne({
      where: { tenantId, id },
    });
    if (!definition) throw new NotFoundException('Workflow not found.');
    return definition;
  }

  private async requireDefinitionWithManager(
    manager: EntityManager,
    tenantId: string,
    id: string,
  ) {
    const definition = await manager
      .getRepository(WorkflowDefinitionEntity)
      .findOne({ where: { tenantId, id } });
    if (!definition) throw new NotFoundException('Workflow not found.');
    return definition;
  }

  private async getDefinitionWithManager(
    manager: EntityManager,
    tenantId: string,
    id: string,
  ) {
    const definition = await this.requireDefinitionWithManager(
      manager,
      tenantId,
      id,
    );
    const versions = await manager.getRepository(WorkflowVersionEntity).find({
      where: { definitionId: id },
      order: { versionNumber: 'DESC' },
    });
    const selected =
      versions.find((version) => version.status === 'draft') ??
      versions.find((version) => version.id === definition.currentVersionId) ??
      versions[0];
    return {
      ...definition,
      versions,
      graph: selected
        ? await this.loadGraphWithManager(manager, selected.id)
        : null,
    };
  }

  private async loadGraph(versionId: string): Promise<WorkflowGraphView> {
    return this.loadGraphFromRepositories(
      await this.versions.findOneOrFail({ where: { id: versionId } }),
      this.nodes,
      this.transitions,
      this.assigneeRules,
    );
  }

  private async loadGraphWithManager(
    manager: EntityManager,
    versionId: string,
  ): Promise<WorkflowGraphView> {
    return this.loadGraphFromRepositories(
      await manager
        .getRepository(WorkflowVersionEntity)
        .findOneOrFail({ where: { id: versionId } }),
      manager.getRepository(WorkflowNodeEntity),
      manager.getRepository(WorkflowTransitionEntity),
      manager.getRepository(WorkflowAssigneeRuleEntity),
    );
  }

  private async loadGraphFromRepositories(
    version: WorkflowVersionEntity,
    nodeRepo: Repository<WorkflowNodeEntity>,
    transitionRepo: Repository<WorkflowTransitionEntity>,
    ruleRepo: Repository<WorkflowAssigneeRuleEntity>,
  ): Promise<WorkflowGraphView> {
    const nodes = await nodeRepo.find({
      where: { versionId: version.id },
      order: { key: 'ASC' },
    });
    const rules = nodes.length
      ? await ruleRepo.find({
          where: { nodeId: In(nodes.map((node) => node.id)) },
        })
      : [];
    const rulesByNode = new Map<string, WorkflowAssigneeRuleEntity[]>();
    for (const rule of rules) {
      rulesByNode.set(rule.nodeId, [
        ...(rulesByNode.get(rule.nodeId) ?? []),
        rule,
      ]);
    }
    return {
      version,
      nodes: nodes.map((node) =>
        Object.assign(node, { assignees: rulesByNode.get(node.id) ?? [] }),
      ),
      transitions: await transitionRepo.find({
        where: { versionId: version.id },
        order: { sortOrder: 'ASC' },
      }),
    };
  }

  private async ensureDraft(
    manager: EntityManager,
    definition: WorkflowDefinitionEntity,
    userId: string,
  ) {
    const versionRepo = manager.getRepository(WorkflowVersionEntity);
    const existing = await versionRepo.findOne({
      where: { definitionId: definition.id, status: 'draft' },
      order: { versionNumber: 'DESC' },
    });
    if (existing) return existing;
    if (!definition.currentVersionId) {
      const maximum = await versionRepo
        .createQueryBuilder('version')
        .select('MAX(version.versionNumber)', 'max')
        .where('version.definitionId = :definitionId', {
          definitionId: definition.id,
        })
        .getRawOne<{ max: string | null }>();
      return versionRepo.save({
        definitionId: definition.id,
        versionNumber: Number(maximum?.max ?? 0) + 1,
        status: 'draft',
        schemaVersion: 1,
        changelog: 'Tạo phiên bản nháp.',
        createdBy: userId,
      });
    }
    const source = await this.loadGraphWithManager(
      manager,
      definition.currentVersionId,
    );
    const draft = await versionRepo.save({
      definitionId: definition.id,
      versionNumber: source.version.versionNumber + 1,
      status: 'draft',
      schemaVersion: source.version.schemaVersion,
      changelog: `Tạo từ phiên bản ${source.version.versionNumber}.`,
      createdBy: userId,
    });
    await this.replaceGraph(manager, draft, this.graphToInput(source));
    return draft;
  }

  private async replaceGraph(
    manager: EntityManager,
    version: WorkflowVersionEntity,
    graph: Pick<SaveWorkflowDraftDto, 'nodes' | 'transitions'>,
  ) {
    const nodeRepo = manager.getRepository(WorkflowNodeEntity);
    await nodeRepo.delete({ versionId: version.id });
    const nodeMap = new Map<string, WorkflowNodeEntity>();
    for (const input of graph.nodes) {
      const node = await nodeRepo.save(
        nodeRepo.create({
          versionId: version.id,
          key: input.key,
          type: input.type,
          name: input.name.trim(),
          description: input.description?.trim() || null,
          config: input.config ?? {},
          uiPosition: input.uiPosition ?? {},
        }),
      );
      nodeMap.set(input.key, node);
      if (input.assignees.length) {
        await manager.getRepository(WorkflowAssigneeRuleEntity).save(
          input.assignees.map((assignee) => ({
            nodeId: node.id,
            type: assignee.type,
            subjectId: assignee.subjectId ?? null,
            fieldKey: assignee.fieldKey ?? null,
            strategy: assignee.strategy ?? 'ANY',
            quorum: assignee.quorum ?? null,
            config: assignee.config ?? {},
          })),
        );
      }
    }
    const transitionRepo = manager.getRepository(WorkflowTransitionEntity);
    await transitionRepo.save(
      graph.transitions.map((transition) => ({
        versionId: version.id,
        sourceNodeId: nodeMap.get(transition.sourceKey)!.id,
        targetNodeId: nodeMap.get(transition.targetKey)!.id,
        actionKey: transition.actionKey,
        label: transition.label.trim(),
        condition: transition.condition ?? null,
        sortOrder: transition.sortOrder ?? 0,
      })),
    );
  }

  private validateGraphInput(
    nodes: WorkflowNodeInputDto[],
    transitions: WorkflowTransitionInputDto[],
  ): WorkflowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const keys = new Set<string>();
    for (const node of nodes) {
      if (keys.has(node.key)) errors.push(`Node key "${node.key}" bị trùng.`);
      keys.add(node.key);
      if (node.type === WorkflowNodeType.HUMAN_TASK && !node.assignees.length) {
        errors.push(`Bước "${node.name}" chưa có quy tắc phân công.`);
      }
      if (
        node.type === WorkflowNodeType.HUMAN_TASK &&
        typeof node.config?.['slaMinutes'] !== 'number'
      ) {
        warnings.push(`Bước "${node.name}" chưa cấu hình SLA.`);
      }
      for (const rule of node.assignees) {
        if (
          [
            WorkflowAssigneeType.USER,
            WorkflowAssigneeType.ROLE,
            WorkflowAssigneeType.POSITION,
            WorkflowAssigneeType.ORGANIZATION_UNIT,
          ].includes(rule.type) &&
          !rule.subjectId
        ) {
          errors.push(`Quy tắc phân công tại "${node.name}" thiếu đối tượng.`);
        }
        if (
          rule.type === WorkflowAssigneeType.REQUEST_FIELD &&
          !rule.fieldKey
        ) {
          errors.push(`Quy tắc phân công tại "${node.name}" thiếu field key.`);
        }
      }
      const requiredPermission = node.config?.['requiredPermission'];
      if (
        requiredPermission !== undefined &&
        (typeof requiredPermission !== 'string' ||
          !/^[a-z0-9][a-z0-9_.-]{1,119}$/.test(requiredPermission))
      ) {
        errors.push(`Quyền bắt buộc tại "${node.name}" không đúng định dạng.`);
      }
      const formFields = node.config?.['formFields'];
      if (formFields !== undefined) {
        if (!Array.isArray(formFields)) {
          errors.push(`Biểu mẫu tại "${node.name}" phải là một danh sách.`);
        } else {
          const fieldKeys = new Set<string>();
          for (const rawField of formFields) {
            if (!rawField || typeof rawField !== 'object') {
              errors.push(
                `Biểu mẫu tại "${node.name}" có trường không hợp lệ.`,
              );
              continue;
            }
            const field = rawField as Record<string, unknown>;
            const key = field['key'];
            const type = field['type'];
            if (
              typeof key !== 'string' ||
              !/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}$/.test(key)
            ) {
              errors.push(
                `Biểu mẫu tại "${node.name}" có field key không hợp lệ.`,
              );
            } else if (fieldKeys.has(key)) {
              errors.push(
                `Biểu mẫu tại "${node.name}" bị trùng field key "${key}".`,
              );
            } else {
              fieldKeys.add(key);
            }
            if (
              ![
                'text',
                'textarea',
                'number',
                'boolean',
                'date',
                'select',
              ].includes(String(type))
            ) {
              errors.push(
                `Biểu mẫu tại "${node.name}" có kiểu trường không hỗ trợ.`,
              );
            }
            if (
              type === 'select' &&
              (!Array.isArray(field['options']) ||
                !field['options'].every((option) => typeof option === 'string'))
            ) {
              errors.push(
                `Trường lựa chọn tại "${node.name}" cần danh sách options.`,
              );
            }
          }
        }
      }
    }
    const starts = nodes.filter((node) => node.type === WorkflowNodeType.START);
    const ends = nodes.filter((node) => node.type === WorkflowNodeType.END);
    if (starts.length !== 1)
      errors.push('Quy trình phải có đúng một node bắt đầu.');
    if (!ends.length)
      errors.push('Quy trình phải có ít nhất một node kết thúc.');

    const edgeKeys = new Set<string>();
    for (const transition of transitions) {
      if (!keys.has(transition.sourceKey)) {
        errors.push(
          `Transition tham chiếu source "${transition.sourceKey}" không tồn tại.`,
        );
      }
      if (!keys.has(transition.targetKey)) {
        errors.push(
          `Transition tham chiếu target "${transition.targetKey}" không tồn tại.`,
        );
      }
      const edgeKey = `${transition.sourceKey}:${transition.actionKey}`;
      if (edgeKeys.has(edgeKey)) {
        errors.push(
          `Action "${transition.actionKey}" bị trùng tại node "${transition.sourceKey}".`,
        );
      }
      edgeKeys.add(edgeKey);
      if (
        transition.condition &&
        !this.isConditionShapeValid(transition.condition)
      ) {
        errors.push(
          `Điều kiện của action "${transition.actionKey}" không hợp lệ.`,
        );
      }
    }
    if (starts.length === 1) {
      const reachable = new Set<string>([starts[0].key]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const transition of transitions) {
          if (
            reachable.has(transition.sourceKey) &&
            !reachable.has(transition.targetKey)
          ) {
            reachable.add(transition.targetKey);
            changed = true;
          }
        }
      }
      for (const node of nodes) {
        if (!reachable.has(node.key)) {
          errors.push(`Node "${node.name}" không thể đi tới từ điểm bắt đầu.`);
        }
      }
    }
    for (const node of nodes) {
      const outgoing = transitions.filter(
        (transition) => transition.sourceKey === node.key,
      );
      const incoming = transitions.filter(
        (transition) => transition.targetKey === node.key,
      );
      if (node.type === WorkflowNodeType.START && incoming.length) {
        errors.push('Node bắt đầu không được có transition đi vào.');
      }
      if (node.type === WorkflowNodeType.END && outgoing.length) {
        errors.push(
          `Node kết thúc "${node.name}" không được có transition đi ra.`,
        );
      }
      if (
        node.type !== WorkflowNodeType.END &&
        node.type !== WorkflowNodeType.PARALLEL_JOIN &&
        !outgoing.length
      ) {
        errors.push(`Node "${node.name}" chưa có đường đi tiếp.`);
      }
      if (
        node.type === WorkflowNodeType.PARALLEL_SPLIT &&
        outgoing.length < 2
      ) {
        errors.push(
          `Node tách song song "${node.name}" cần ít nhất hai nhánh.`,
        );
      }
      if (node.type === WorkflowNodeType.PARALLEL_JOIN && incoming.length < 2) {
        errors.push(
          `Node gộp song song "${node.name}" cần ít nhất hai nhánh vào.`,
        );
      }
      if (
        node.type === WorkflowNodeType.CONDITION &&
        outgoing.some((transition) => !transition.condition)
      ) {
        errors.push(
          `Mọi nhánh từ node điều kiện "${node.name}" phải có điều kiện.`,
        );
      }
    }
    return { valid: errors.length === 0, errors, warnings };
  }

  private validateLoadedGraph(
    graph: WorkflowGraphView,
  ): WorkflowValidationResult {
    return this.validateGraphInput(
      graph.nodes.map((node) => ({
        key: node.key,
        type: node.type,
        name: node.name,
        description: node.description ?? undefined,
        config: node.config,
        uiPosition: node.uiPosition,
        assignees: node.assignees.map((rule) => ({
          type: rule.type,
          subjectId: rule.subjectId ?? undefined,
          fieldKey: rule.fieldKey ?? undefined,
          strategy: rule.strategy,
          quorum: rule.quorum ?? undefined,
          config: rule.config,
        })),
      })),
      this.graphTransitionsToInput(graph),
    );
  }

  private graphToInput(
    graph: WorkflowGraphView,
  ): Pick<SaveWorkflowDraftDto, 'nodes' | 'transitions'> {
    return {
      nodes: graph.nodes.map((node) => ({
        key: node.key,
        type: node.type,
        name: node.name,
        description: node.description ?? undefined,
        config: node.config,
        uiPosition: node.uiPosition,
        assignees: node.assignees.map((rule) => ({
          type: rule.type,
          subjectId: rule.subjectId ?? undefined,
          fieldKey: rule.fieldKey ?? undefined,
          strategy: rule.strategy,
          quorum: rule.quorum ?? undefined,
          config: rule.config,
        })),
      })),
      transitions: this.graphTransitionsToInput(graph),
    };
  }

  private graphTransitionsToInput(
    graph: WorkflowGraphView,
  ): WorkflowTransitionInputDto[] {
    const keyById = new Map(graph.nodes.map((node) => [node.id, node.key]));
    return graph.transitions.map((transition) => ({
      sourceKey: keyById.get(transition.sourceNodeId)!,
      targetKey: keyById.get(transition.targetNodeId)!,
      actionKey: transition.actionKey,
      label: transition.label,
      condition: transition.condition ?? undefined,
      sortOrder: transition.sortOrder,
    }));
  }

  private defaultGraph(): Pick<SaveWorkflowDraftDto, 'nodes' | 'transitions'> {
    return {
      nodes: [
        {
          key: 'start',
          type: WorkflowNodeType.START,
          name: 'Khởi tạo',
          config: {},
          uiPosition: { x: 80, y: 180 },
          assignees: [],
        },
        {
          key: 'execute',
          type: WorkflowNodeType.HUMAN_TASK,
          name: 'Tiếp nhận & thi công',
          config: { slaMinutes: 2880 },
          uiPosition: { x: 340, y: 180 },
          assignees: [
            {
              type: WorkflowAssigneeType.REQUEST_FIELD,
              fieldKey: 'assigneeId',
              strategy: 'ANY',
            },
          ],
        },
        {
          key: 'technical_review',
          type: WorkflowNodeType.HUMAN_TASK,
          name: 'Kiểm tra kỹ thuật',
          config: { slaMinutes: 1440 },
          uiPosition: { x: 620, y: 180 },
          assignees: [
            {
              type: WorkflowAssigneeType.REQUEST_FIELD,
              fieldKey: 'technicalReviewerId',
              strategy: 'ANY',
            },
          ],
        },
        {
          key: 'completed',
          type: WorkflowNodeType.END,
          name: 'Hoàn tất',
          config: {},
          uiPosition: { x: 900, y: 180 },
          assignees: [],
        },
      ],
      transitions: [
        {
          sourceKey: 'start',
          targetKey: 'execute',
          actionKey: 'assign',
          label: 'Giao việc',
          sortOrder: 0,
        },
        {
          sourceKey: 'execute',
          targetKey: 'technical_review',
          actionKey: 'submit_review',
          label: 'Gửi kiểm tra kỹ thuật',
          sortOrder: 0,
        },
        {
          sourceKey: 'technical_review',
          targetKey: 'execute',
          actionKey: 'request_rework',
          label: 'Yêu cầu thực hiện lại',
          sortOrder: 0,
        },
        {
          sourceKey: 'technical_review',
          targetKey: 'completed',
          actionKey: 'approve',
          label: 'Xác nhận hoàn thành',
          sortOrder: 1,
        },
      ],
    };
  }

  private async activateToken(
    manager: EntityManager,
    instance: WorkflowInstanceEntity,
    token: WorkflowTokenEntity,
    depth: number,
  ): Promise<void> {
    if (depth > 64) {
      throw new BadRequestException(
        'Quy trình có vòng tự động vượt giới hạn an toàn.',
      );
    }
    const node = await manager
      .getRepository(WorkflowNodeEntity)
      .findOneOrFail({ where: { id: token.nodeId } });
    instance.currentNodeId = node.id;
    instance.status = 'running';
    await manager.getRepository(WorkflowInstanceEntity).save(instance);

    if (node.type === WorkflowNodeType.HUMAN_TASK) {
      await this.createHumanTask(manager, instance, token, node);
      return;
    }
    if (node.type === WorkflowNodeType.END) {
      token.status = 'consumed';
      token.consumedAt = new Date();
      await manager.getRepository(WorkflowTokenEntity).save(token);
      await this.refreshInstanceStatus(manager, instance.id);
      return;
    }
    if (node.type === WorkflowNodeType.PARALLEL_JOIN) {
      await this.tryJoin(manager, instance, token, node, depth);
      return;
    }

    const outgoing = await manager
      .getRepository(WorkflowTransitionEntity)
      .find({
        where: { versionId: instance.versionId, sourceNodeId: node.id },
        order: { sortOrder: 'ASC' },
      });
    if (node.type === WorkflowNodeType.PARALLEL_SPLIT) {
      token.status = 'consumed';
      token.consumedAt = new Date();
      await manager.getRepository(WorkflowTokenEntity).save(token);
      for (const transition of outgoing) {
        if (
          !transition.condition ||
          this.evaluateCondition(transition.condition, instance.context)
        ) {
          const branch = await manager.getRepository(WorkflowTokenEntity).save({
            instanceId: instance.id,
            nodeId: transition.targetNodeId,
            status: 'active',
            branchKey: transition.actionKey,
            consumedAt: null,
          });
          await this.activateToken(manager, instance, branch, depth + 1);
        }
      }
      return;
    }
    const selected = outgoing.find(
      (transition) =>
        !transition.condition ||
        this.evaluateCondition(transition.condition, instance.context),
    );
    if (!selected) {
      instance.status = 'blocked';
      await manager.getRepository(WorkflowInstanceEntity).save(instance);
      return;
    }
    await manager.getRepository(WorkflowActionEntity).save({
      tenantId: instance.tenantId,
      instanceId: instance.id,
      taskId: null,
      actorId: null,
      actionKey: selected.actionKey,
      fromNodeId: node.id,
      toNodeId: selected.targetNodeId,
      note: null,
      payload: { automatic: true },
      idempotencyKey: null,
    });
    await this.moveToken(
      manager,
      instance,
      token,
      selected.targetNodeId,
      depth + 1,
    );
  }

  private async moveToken(
    manager: EntityManager,
    instance: WorkflowInstanceEntity,
    token: WorkflowTokenEntity,
    targetNodeId: string,
    depth: number,
  ) {
    token.status = 'consumed';
    token.consumedAt = new Date();
    await manager.getRepository(WorkflowTokenEntity).save(token);
    const next = await manager.getRepository(WorkflowTokenEntity).save({
      instanceId: instance.id,
      nodeId: targetNodeId,
      status: 'active',
      branchKey: token.branchKey,
      consumedAt: null,
    });
    await this.activateToken(manager, instance, next, depth + 1);
  }

  private async tryJoin(
    manager: EntityManager,
    instance: WorkflowInstanceEntity,
    token: WorkflowTokenEntity,
    node: WorkflowNodeEntity,
    depth: number,
  ) {
    const transitionRepo = manager.getRepository(WorkflowTransitionEntity);
    const incoming = await transitionRepo.count({
      where: { versionId: instance.versionId, targetNodeId: node.id },
    });
    const activeTokens = await manager.getRepository(WorkflowTokenEntity).find({
      where: { instanceId: instance.id, nodeId: node.id, status: 'active' },
    });
    const strategy =
      typeof node.config['joinStrategy'] === 'string'
        ? node.config['joinStrategy']
        : 'ALL';
    const configuredQuorum =
      typeof node.config['quorum'] === 'number'
        ? node.config['quorum']
        : incoming;
    const threshold =
      strategy === 'ANY'
        ? 1
        : strategy === 'QUORUM'
          ? Math.max(1, configuredQuorum)
          : incoming;
    if (activeTokens.length < threshold) return;
    const now = new Date();
    for (const active of activeTokens) {
      active.status = 'consumed';
      active.consumedAt = now;
    }
    await manager.getRepository(WorkflowTokenEntity).save(activeTokens);
    const outgoing = await transitionRepo.find({
      where: { versionId: instance.versionId, sourceNodeId: node.id },
      order: { sortOrder: 'ASC' },
    });
    const selected = outgoing.find(
      (transition) =>
        !transition.condition ||
        this.evaluateCondition(transition.condition, instance.context),
    );
    if (!selected) {
      instance.status = 'blocked';
      await manager.getRepository(WorkflowInstanceEntity).save(instance);
      return;
    }
    const next = await manager.getRepository(WorkflowTokenEntity).save({
      instanceId: instance.id,
      nodeId: selected.targetNodeId,
      status: 'active',
      branchKey: token.branchKey,
      consumedAt: null,
    });
    await this.activateToken(manager, instance, next, depth + 1);
  }

  private async createHumanTask(
    manager: EntityManager,
    instance: WorkflowInstanceEntity,
    token: WorkflowTokenEntity,
    node: WorkflowNodeEntity,
  ) {
    const taskRepo = manager.getRepository(WorkflowTaskEntity);
    const existing = await taskRepo.findOne({
      where: {
        instanceId: instance.id,
        nodeId: node.id,
        status: In(['pending', 'claimed', 'blocked']),
      },
    });
    if (existing) return;
    const slaMinutes =
      typeof node.config['slaMinutes'] === 'number'
        ? node.config['slaMinutes']
        : null;
    const task = await taskRepo.save(
      taskRepo.create({
        instanceId: instance.id,
        nodeId: node.id,
        name: node.name,
        status: 'pending',
        claimedBy: null,
        dueAt: slaMinutes ? new Date(Date.now() + slaMinutes * 60_000) : null,
        activatedAt: new Date(),
        completedAt: null,
        payload: { tokenId: token.id },
      }),
    );
    const userIds = await this.resolveAssignees(manager, instance, node);
    if (!userIds.length) {
      task.status = 'blocked';
      await taskRepo.save(task);
      instance.status = 'blocked';
      await manager.getRepository(WorkflowInstanceEntity).save(instance);
      return;
    }
    await manager.getRepository(WorkflowTaskAssignmentEntity).save(
      userIds.map((userId) => ({
        taskId: task.id,
        userId,
        type: userIds.length === 1 ? 'assignee' : 'candidate',
        actedAt: null,
      })),
    );
    const tenantSlug =
      typeof instance.context['tenantSlug'] === 'string'
        ? instance.context['tenantSlug']
        : '';
    await manager.getRepository(NotificationEntity).save(
      userIds.map((userId) => ({
        tenantId: instance.tenantId,
        userId,
        type: 'workflow.task.assigned',
        title: `Công việc mới: ${node.name}`,
        body: 'Bạn có một công việc bảo trì đang chờ xử lý.',
        resourceType: instance.resourceType,
        resourceId: instance.resourceId,
        actionUrl: tenantSlug
          ? `/t/${tenantSlug}/work-orders/${instance.resourceId}`
          : `/work-orders/${instance.resourceId}`,
        dedupeKey: `workflow-task:${task.id}`,
        readAt: null,
      })),
    );
  }

  private async resolveAssignees(
    manager: EntityManager,
    instance: WorkflowInstanceEntity,
    node: WorkflowNodeEntity,
  ): Promise<string[]> {
    const rules = await manager.getRepository(WorkflowAssigneeRuleEntity).find({
      where: { nodeId: node.id },
    });
    const memberships = manager.getRepository(TenantMembershipEntity);
    const candidates = new Set<string>();
    for (const rule of rules) {
      if (
        rule.type === WorkflowAssigneeType.USER &&
        rule.subjectId &&
        (await memberships.exists({
          where: {
            tenantId: instance.tenantId,
            userId: rule.subjectId,
            status: 'active',
          },
        }))
      ) {
        candidates.add(rule.subjectId);
      } else if (rule.type === WorkflowAssigneeType.CREATOR) {
        const creator = instance.context['createdBy'];
        if (typeof creator === 'string') candidates.add(creator);
      } else if (rule.type === WorkflowAssigneeType.PREVIOUS_STEP_ACTOR) {
        const previousAction = await manager
          .getRepository(WorkflowActionEntity)
          .createQueryBuilder('action')
          .where('action.instance_id = :instanceId', {
            instanceId: instance.id,
          })
          .andWhere('action.actor_id IS NOT NULL')
          .orderBy('action.created_at', 'DESC')
          .addOrderBy('action.id', 'DESC')
          .getOne();
        if (previousAction?.actorId) candidates.add(previousAction.actorId);
      } else if (rule.type === WorkflowAssigneeType.MANAGER_OF_REQUESTER) {
        const managerId = await this.resolveRequesterManager(
          manager,
          instance,
          rule.config,
        );
        if (managerId) candidates.add(managerId);
      } else if (
        rule.type === WorkflowAssigneeType.REQUEST_FIELD &&
        rule.fieldKey
      ) {
        const value = this.getFact(instance.context, rule.fieldKey);
        if (typeof value === 'string') candidates.add(value);
        if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === 'string') candidates.add(item);
          }
        }
      } else if (
        rule.type === WorkflowAssigneeType.ORGANIZATION_UNIT &&
        rule.subjectId
      ) {
        const matches = await memberships.find({
          where: {
            tenantId: instance.tenantId,
            organizationUnitId: rule.subjectId,
            status: 'active',
          },
        });
        matches.forEach((membership) => candidates.add(membership.userId));
      } else if (
        rule.type === WorkflowAssigneeType.POSITION &&
        rule.subjectId
      ) {
        const matches = await memberships.find({
          where: {
            tenantId: instance.tenantId,
            positionId: rule.subjectId,
            status: 'active',
          },
        });
        matches.forEach((membership) => candidates.add(membership.userId));
      } else if (rule.type === WorkflowAssigneeType.ROLE && rule.subjectId) {
        const matches = await memberships
          .createQueryBuilder('membership')
          .innerJoin('membership.roles', 'role')
          .where('membership.tenant_id = :tenantId', {
            tenantId: instance.tenantId,
          })
          .andWhere('membership.status = :status', { status: 'active' })
          .andWhere('role.id = :roleId', { roleId: rule.subjectId })
          .getMany();
        matches.forEach((membership) => candidates.add(membership.userId));
      }
    }
    if (!candidates.size) {
      const fallback = instance.context['createdBy'];
      if (typeof fallback === 'string') candidates.add(fallback);
    }
    return [...candidates];
  }

  private async refreshInstanceStatus(
    manager: EntityManager,
    instanceId: string,
  ) {
    const instanceRepo = manager.getRepository(WorkflowInstanceEntity);
    const instance = await instanceRepo.findOneOrFail({
      where: { id: instanceId },
    });
    const activeTokens = await manager.getRepository(WorkflowTokenEntity).find({
      where: { instanceId, status: 'active' },
    });
    if (!activeTokens.length) {
      instance.status = 'completed';
      instance.currentNodeId = null;
      instance.completedAt = new Date();
      await instanceRepo.save(instance);
      return;
    }
    const activeTasks = await manager.getRepository(WorkflowTaskEntity).find({
      where: {
        instanceId,
        status: In(['pending', 'claimed', 'blocked']),
      },
    });
    instance.status = activeTasks.some((task) => task.status === 'blocked')
      ? 'blocked'
      : 'running';
    if (activeTokens.length === 1) {
      instance.currentNodeId = activeTokens[0].nodeId;
    }
    await instanceRepo.save(instance);
  }

  private async availableActions(
    instance: WorkflowInstanceEntity,
    tasks: WorkflowTaskEntity[],
    assignments: WorkflowTaskAssignmentEntity[],
    user: AuthUser,
  ) {
    const assignedTaskIds = new Set(
      assignments
        .filter((assignment) => assignment.userId === user.id)
        .map((assignment) => assignment.taskId),
    );
    const eligible = tasks.filter((task) => {
      const requiredPermission = task.node.config['requiredPermission'];
      const hasStepPermission =
        typeof requiredPermission !== 'string' ||
        !requiredPermission ||
        user.permissions.includes(requiredPermission) ||
        user.isPlatformAdmin ||
        user.roleCodes.includes('admin');
      return (
        hasStepPermission &&
        ['pending', 'claimed', 'blocked'].includes(task.status) &&
        (assignedTaskIds.has(task.id) ||
          user.isPlatformAdmin ||
          user.roleCodes.includes('admin'))
      );
    });
    if (!eligible.length) return [];
    const transitions = await this.transitions.find({
      where: {
        versionId: instance.versionId,
        sourceNodeId: In(eligible.map((task) => task.nodeId)),
      },
      order: { sortOrder: 'ASC' },
    });
    return transitions
      .filter(
        (transition) =>
          !transition.condition ||
          this.evaluateCondition(transition.condition, instance.context),
      )
      .map((transition) => ({
        taskId: eligible.find((task) => task.nodeId === transition.sourceNodeId)
          ?.id,
        key: transition.actionKey,
        label: transition.label,
        targetNodeId: transition.targetNodeId,
        requiredPermission:
          eligible.find((task) => task.nodeId === transition.sourceNodeId)?.node
            .config['requiredPermission'] ?? null,
        formFields:
          eligible.find((task) => task.nodeId === transition.sourceNodeId)?.node
            .config['formFields'] ?? [],
      }));
  }

  private async resolveRequesterManager(
    manager: EntityManager,
    instance: WorkflowInstanceEntity,
    config: Record<string, unknown>,
  ) {
    const requesterId =
      typeof instance.context['createdBy'] === 'string'
        ? instance.context['createdBy']
        : null;
    if (!requesterId) return null;
    const memberships = manager.getRepository(TenantMembershipEntity);
    const requesterMembership = await memberships.findOne({
      where: {
        tenantId: instance.tenantId,
        userId: requesterId,
        status: 'active',
      },
    });
    let unitId = requesterMembership?.organizationUnitId ?? null;
    const units = manager.getRepository(OrganizationUnitEntity);
    const configuredPositionId =
      typeof config['managerPositionId'] === 'string'
        ? config['managerPositionId']
        : null;
    for (let depth = 0; unitId && depth < 20; depth += 1) {
      const unit = await units.findOne({
        where: { tenantId: instance.tenantId, id: unitId },
      });
      if (!unit) break;
      const metadataManagerId =
        typeof unit.metadata['managerUserId'] === 'string'
          ? unit.metadata['managerUserId']
          : null;
      if (
        metadataManagerId &&
        (await memberships.exists({
          where: {
            tenantId: instance.tenantId,
            userId: metadataManagerId,
            status: 'active',
          },
        }))
      ) {
        return metadataManagerId;
      }
      if (configuredPositionId) {
        const positionManager = await memberships.findOne({
          where: {
            tenantId: instance.tenantId,
            organizationUnitId: unit.id,
            positionId: configuredPositionId,
            status: 'active',
          },
        });
        if (positionManager) return positionManager.userId;
      }
      unitId = unit.parentId;
    }
    return null;
  }

  private validateActionPayload(
    rawFields: unknown,
    payload: Record<string, unknown>,
    actionKey: string,
  ) {
    if (!Array.isArray(rawFields)) return;
    for (const rawField of rawFields) {
      if (!rawField || typeof rawField !== 'object') continue;
      const field = rawField as Record<string, unknown>;
      const key = typeof field['key'] === 'string' ? field['key'] : '';
      if (!key) continue;
      const actions = field['actions'];
      if (
        Array.isArray(actions) &&
        actions.length &&
        !actions.includes(actionKey)
      ) {
        continue;
      }
      const value = payload[key];
      const label = typeof field['label'] === 'string' ? field['label'] : key;
      const missing =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && !value.trim());
      if (field['required'] === true && missing) {
        throw new BadRequestException(`Trường "${label}" là bắt buộc.`);
      }
      if (missing) continue;
      const type = field['type'];
      const valid =
        type === 'number'
          ? typeof value === 'number' && Number.isFinite(value)
          : type === 'boolean'
            ? typeof value === 'boolean'
            : ['text', 'textarea', 'date', 'select'].includes(String(type))
              ? typeof value === 'string'
              : true;
      if (!valid) {
        throw new BadRequestException(
          `Giá trị của trường "${label}" không hợp lệ.`,
        );
      }
      if (
        type === 'select' &&
        Array.isArray(field['options']) &&
        !field['options'].includes(value)
      ) {
        throw new BadRequestException(
          `Lựa chọn của trường "${label}" không hợp lệ.`,
        );
      }
    }
  }

  private isConditionShapeValid(condition: Record<string, unknown>): boolean {
    if ('all' in condition || 'any' in condition) {
      const clauses = condition['all'] ?? condition['any'];
      return (
        Array.isArray(clauses) &&
        clauses.length > 0 &&
        clauses.every(
          (clause) =>
            typeof clause === 'object' &&
            clause !== null &&
            this.isConditionShapeValid(clause as Record<string, unknown>),
        )
      );
    }
    if ('not' in condition) {
      const clause = condition['not'];
      return (
        typeof clause === 'object' &&
        clause !== null &&
        this.isConditionShapeValid(clause as Record<string, unknown>)
      );
    }
    const allowed = new Set([
      'eq',
      'neq',
      'in',
      'notIn',
      'gt',
      'gte',
      'lt',
      'lte',
      'exists',
      'contains',
    ]);
    return (
      typeof condition['fact'] === 'string' &&
      typeof condition['op'] === 'string' &&
      allowed.has(condition['op'])
    );
  }

  private evaluateCondition(
    condition: Record<string, unknown>,
    context: Record<string, unknown>,
  ): boolean {
    if ('all' in condition) {
      const clauses = condition['all'];
      return (
        Array.isArray(clauses) &&
        clauses.every(
          (clause) =>
            typeof clause === 'object' &&
            clause !== null &&
            this.evaluateCondition(clause as Record<string, unknown>, context),
        )
      );
    }
    if ('any' in condition) {
      const clauses = condition['any'];
      return (
        Array.isArray(clauses) &&
        clauses.some(
          (clause) =>
            typeof clause === 'object' &&
            clause !== null &&
            this.evaluateCondition(clause as Record<string, unknown>, context),
        )
      );
    }
    if ('not' in condition) {
      const clause = condition['not'];
      return (
        typeof clause === 'object' &&
        clause !== null &&
        !this.evaluateCondition(clause as Record<string, unknown>, context)
      );
    }
    const fact =
      typeof condition['fact'] === 'string'
        ? this.getFact(context, condition['fact'])
        : undefined;
    const expected = condition['value'];
    switch (condition['op']) {
      case 'eq':
        return fact === expected;
      case 'neq':
        return fact !== expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(fact);
      case 'notIn':
        return Array.isArray(expected) && !expected.includes(fact);
      case 'gt':
        return (
          typeof fact === 'number' &&
          typeof expected === 'number' &&
          fact > expected
        );
      case 'gte':
        return (
          typeof fact === 'number' &&
          typeof expected === 'number' &&
          fact >= expected
        );
      case 'lt':
        return (
          typeof fact === 'number' &&
          typeof expected === 'number' &&
          fact < expected
        );
      case 'lte':
        return (
          typeof fact === 'number' &&
          typeof expected === 'number' &&
          fact <= expected
        );
      case 'exists':
        return expected === false ? fact === undefined : fact !== undefined;
      case 'contains':
        return Array.isArray(fact)
          ? fact.includes(expected)
          : typeof fact === 'string' &&
              typeof expected === 'string' &&
              fact.includes(expected);
      default:
        return false;
    }
  }

  private getFact(context: Record<string, unknown>, path: string): unknown {
    let current: unknown = context;
    for (const segment of path.split('.')) {
      if (
        typeof current !== 'object' ||
        current === null ||
        !(segment in current)
      ) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }
    return current;
  }
}
