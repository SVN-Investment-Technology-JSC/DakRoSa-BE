import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WorkflowDefinitionEntity, WorkflowDefinitionStatus } from '../database/entities/workflow-definition.entity';
import { WorkflowVersionEntity, WorkflowVersionStatus } from '../database/entities/workflow-version.entity';
import { WorkflowRoleMappingEntity } from '../database/entities/workflow-role-mapping.entity';
import { WorkflowNodeEntity } from '../database/entities/workflow-node.entity';
import { WorkflowTransitionEntity } from '../database/entities/workflow-transition.entity';
import { WorkOrderEntity } from '../database/entities/work-order.entity';
import { WorkOrderLogEntity } from '../database/entities/work-order-log.entity';
import { NotificationService } from '../notification/notification.service';
import { DraftWorkflowVersionDto, ExecuteWorkflowStepDto, UpdateMasterBoardCellDto } from './dto/workflow.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@Injectable()
export class WorkflowEngineService {
  constructor(
    @InjectRepository(WorkflowDefinitionEntity)
    private defRepo: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(WorkflowVersionEntity)
    private versionRepo: Repository<WorkflowVersionEntity>,
    @InjectRepository(WorkflowNodeEntity)
    private nodeRepo: Repository<WorkflowNodeEntity>,
    @InjectRepository(WorkflowTransitionEntity)
    private transitionRepo: Repository<WorkflowTransitionEntity>,
    @InjectRepository(WorkflowRoleMappingEntity)
    private roleMappingRepo: Repository<WorkflowRoleMappingEntity>,
    @InjectRepository(WorkOrderEntity)
    private workOrderRepo: Repository<WorkOrderEntity>,
    @InjectRepository(WorkOrderLogEntity)
    private logRepo: Repository<WorkOrderLogEntity>,
    private notificationService: NotificationService,
  ) {}

  async listDefinitions(tenantId: string, archived: boolean) {
    const definitions = await this.defRepo.find({
      where: {
        tenantId,
        status: archived ? WorkflowDefinitionStatus.ARCHIVED : undefined,
      },
      order: { updatedAt: 'DESC' },
      relations: ['versions'],
    });

    return definitions.map(def => ({
      ...def,
      status: def.status,
    }));
  }

  async getDefinition(tenantId: string, id: string) {
    const def = await this.defRepo.findOne({
      where: { id, tenantId },
      relations: ['versions'],
    });

    if (!def) throw new NotFoundException('Workflow definition not found');

    const latestVersion = def.versions?.sort((a, b) => {
      // Prioritize DRAFT, then latest versionNumber
      if (a.status === WorkflowVersionStatus.DRAFT && b.status !== WorkflowVersionStatus.DRAFT) return -1;
      if (a.status !== WorkflowVersionStatus.DRAFT && b.status === WorkflowVersionStatus.DRAFT) return 1;
      return b.versionNumber - a.versionNumber;
    })[0];

    let graph = null;
    if (latestVersion) {
      const nodes = await this.nodeRepo.find({ where: { versionId: latestVersion.id } });
      const transitions = await this.transitionRepo.find({ where: { versionId: latestVersion.id } });
      graph = {
        version: latestVersion,
        nodes,
        transitions,
      };
    }

    return { ...def, graph };
  }

  async createDefinition(tenantId: string, dto: { key: string; name: string; description?: string | null }) {
    const def = this.defRepo.create({
      tenantId,
      key: dto.key,
      name: dto.name,
      description: dto.description || null,
      status: WorkflowDefinitionStatus.DRAFT,
    });
    await this.defRepo.save(def);

    const version = this.versionRepo.create({
      definitionId: def.id,
      versionNumber: 1,
      status: WorkflowVersionStatus.DRAFT,
      changelog: 'Initial draft',
    });
    await this.versionRepo.save(version);

    return this.getDefinition(tenantId, def.id);
  }

  async saveDraft(tenantId: string, id: string, dto: DraftWorkflowVersionDto) {
    const def = await this.defRepo.findOne({ where: { id, tenantId } });
    if (!def) throw new NotFoundException('Definition not found');

    let draftVersion = await this.versionRepo.findOne({
      where: { definitionId: id, status: WorkflowVersionStatus.DRAFT },
    });

    if (!draftVersion) {
      const lastVersion = await this.versionRepo.findOne({
        where: { definitionId: id },
        order: { versionNumber: 'DESC' },
      });
      const nextVersionNumber = (lastVersion?.versionNumber || 0) + 1;
      draftVersion = this.versionRepo.create({
        definitionId: id,
        versionNumber: nextVersionNumber,
        status: WorkflowVersionStatus.DRAFT,
        changelog: dto.changelog || 'Auto saved draft',
      });
      await this.versionRepo.save(draftVersion);
    } else {
      if (dto.changelog) {
        draftVersion.changelog = dto.changelog;
        await this.versionRepo.save(draftVersion);
      }
      await this.nodeRepo.delete({ versionId: draftVersion.id });
      await this.transitionRepo.delete({ versionId: draftVersion.id });
    }

    if (dto.nodes && dto.nodes.length > 0) {
      const nodesData = dto.nodes.map((n: any) => ({
        ...n,
        versionId: draftVersion!.id,
      }));
      const nodes = this.nodeRepo.create(nodesData);
      await this.nodeRepo.save(nodes);
    }

    if (dto.transitions && dto.transitions.length > 0) {
      const transitionsData = dto.transitions.map((t: any) => ({
        ...t,
        versionId: draftVersion!.id,
      }));
      const transitions = this.transitionRepo.create(transitionsData);
      await this.transitionRepo.save(transitions);
    }

    return this.getDefinition(tenantId, id);
  }

  async publishDefinition(tenantId: string, definitionId: string) {
    const def = await this.defRepo.findOne({ where: { id: definitionId, tenantId } });
    if (!def) throw new NotFoundException('Definition not found');

    const draft = await this.versionRepo.findOne({
      where: { definitionId, status: WorkflowVersionStatus.DRAFT },
    });
    if (!draft) throw new NotFoundException('No draft version to publish');

    // Archive current active
    await this.versionRepo.update(
      { definitionId, status: WorkflowVersionStatus.PUBLISHED },
      { status: WorkflowVersionStatus.RETIRED },
    );

    // Promote draft to active
    draft.status = WorkflowVersionStatus.PUBLISHED;
    await this.versionRepo.save(draft);
    
    def.status = WorkflowDefinitionStatus.PUBLISHED;
    await this.defRepo.save(def);

    return this.getDefinition(tenantId, definitionId);
  }

  async cloneDefinition(tenantId: string, id: string, dto: { key: string; name: string }) {
    const existing = await this.getDefinition(tenantId, id);
    if (!existing) throw new NotFoundException('Definition not found');

    const newDef = await this.createDefinition(tenantId, {
      key: dto.key,
      name: dto.name,
      description: existing.description,
    });

    if (existing.graph) {
      await this.saveDraft(tenantId, newDef.id, {
        nodes: existing.graph.nodes as any,
        transitions: existing.graph.transitions as any,
        changelog: 'Cloned from ' + existing.key,
      });
    }
    return newDef;
  }

  async updateDefinitionStatus(tenantId: string, id: string, status: string) {
    const def = await this.defRepo.findOne({ where: { id, tenantId } });
    if (!def) throw new NotFoundException('Definition not found');

    def.status = status as WorkflowDefinitionStatus;
    await this.defRepo.save(def);
    return def;
  }

  async validateDefinition(tenantId: string, id: string) {
    // Basic validation stub
    return { valid: true, errors: [] };
  }

  async getMasterBoard(tenantId: string, definitionId: string) {
    const def = await this.defRepo.findOne({ where: { id: definitionId, tenantId } });
    if (!def) throw new NotFoundException('Definition not found');

    const mappings = await this.roleMappingRepo.find({
      where: { definitionId },
    });
    return mappings;
  }

  async updateMasterBoard(tenantId: string, definitionId: string, dto: { mappings: any[] }) {
    const def = await this.defRepo.findOne({ where: { id: definitionId, tenantId } });
    if (!def) throw new NotFoundException('Definition not found');

    await this.roleMappingRepo.delete({ definitionId });

    if (dto.mappings && dto.mappings.length > 0) {
      const mappingsData = dto.mappings.map(m => ({
        ...m,
        definitionId,
      }));
      const mappings = this.roleMappingRepo.create(mappingsData);
      await this.roleMappingRepo.save(mappings);
    }
    return { success: true };
  }
  async getGlobalMasterBoard(tenantId: string) {
    const definitions = await this.defRepo.find({
      where: {
        tenantId,
        status: In([WorkflowDefinitionStatus.DRAFT, WorkflowDefinitionStatus.PUBLISHED]),
      },
      order: { updatedAt: 'DESC' },
      relations: ['versions', 'versions.nodes'],
    });

    if (definitions.length === 0) return { definitions: [], mappings: [] };
    
    const defIds = definitions.map(d => d.id);
    const mappings = await this.roleMappingRepo.find({
      where: { definitionId: In(defIds) },
    });
    
    return { definitions, mappings };
  }

  async updateMasterBoardCell(tenantId: string, dto: UpdateMasterBoardCellDto) {
    const def = await this.defRepo.findOne({ where: { id: dto.workflowId, tenantId } });
    if (!def) throw new NotFoundException('Definition not found');

    if (dto.mappedValue.startsWith('__remove__')) {
       const roleId = dto.mappedValue.replace('__remove__', '');
       await this.roleMappingRepo.delete({
         definitionId: dto.workflowId,
         variableKey: dto.variableKey,
         mappedType: dto.mappedType,
         mappedValue: roleId
       });
       return { success: true, deleted: true };
    }

    let mapping = await this.roleMappingRepo.findOne({
      where: {
        definitionId: dto.workflowId,
        variableKey: dto.variableKey,
        mappedType: dto.mappedType,
        mappedValue: dto.mappedValue
      }
    });

    if (!mapping) {
      mapping = this.roleMappingRepo.create({
        definitionId: dto.workflowId,
        variableKey: dto.variableKey,
        mappedType: dto.mappedType,
        mappedValue: dto.mappedValue
      });
      await this.roleMappingRepo.save(mapping);
    }
    return mapping;
  }
  async resolveRoleMapping(definitionId: string, variableKeys: string[]) {
    if (!variableKeys || variableKeys.length === 0) return [];
    
    const mappings = await this.roleMappingRepo.find({
      where: variableKeys.map(k => ({ definitionId, variableKey: k })),
    });
    
    return mappings;
  }

  async deleteDefinition(tenantId: string, id: string) {
    await this.defRepo.delete({ id, tenantId });
  }

  async executeStep(user: AuthUser, dto: ExecuteWorkflowStepDto) {
    const wo = await this.workOrderRepo.findOne({ where: { id: dto.workOrderId } });
    if (!wo) throw new NotFoundException('Work order not found');

    const log = this.logRepo.create({
      workOrderId: wo.id,
      userId: user.id,
      action: 'WORKFLOW_STEP',
      note: `Executed step ${dto.stepKey} with action ${dto.action}`,
      metadata: dto.formData || {},
    });
    await this.logRepo.save(log);

    // Dynamic resolution based on config.doers / config.reporters could be applied here
    // for subsequent tasks.
    
    await this.notificationService.create({
      tenantId: wo.tenantId,
      userId: user.id,
      type: 'workflow' as any,
      title: 'Workflow step executed',
      body: `Step ${dto.stepKey} was executed`,
      actionUrl: `/work-orders/${wo.id}`,
    });

    return { success: true };
  }
}
