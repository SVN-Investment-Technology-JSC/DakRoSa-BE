import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkflowTemplateEntity } from '../database/entities/workflow-template.entity';
import { WorkflowNodeEntity } from '../database/entities/workflow-node.entity';
import { WorkflowTransitionEntity } from '../database/entities/workflow-transition.entity';
import { NotificationEntity } from '../database/entities/notification.entity';
import {
  WorkOrderEntity,
  WorkOrderStatus,
} from '../database/entities/work-order.entity';
import { WorkOrderLogEntity } from '../database/entities/work-order-log.entity';
import { TenantMembershipEntity } from '../database/entities/tenant-membership.entity';
import {
  CreateWorkflowTemplateDto,
  ExecuteWorkflowStepDto,
} from './dto/workflow.dto';
import { AuthUser } from '../common/interfaces/auth-user.interface';

@Injectable()
export class WorkflowEngineService {
  constructor(
    @InjectRepository(WorkflowTemplateEntity)
    private readonly templateRepo: Repository<WorkflowTemplateEntity>,
    @InjectRepository(WorkflowNodeEntity)
    private readonly nodeRepo: Repository<WorkflowNodeEntity>,
    @InjectRepository(WorkflowTransitionEntity)
    private readonly transitionRepo: Repository<WorkflowTransitionEntity>,
    @InjectRepository(NotificationEntity)
    private readonly notificationRepo: Repository<NotificationEntity>,
    @InjectRepository(WorkOrderEntity)
    private readonly workOrderRepo: Repository<WorkOrderEntity>,
    @InjectRepository(WorkOrderLogEntity)
    private readonly logRepo: Repository<WorkOrderLogEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly membershipRepo: Repository<TenantMembershipEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── CRUD Templates ───────────────────────────────────────────────────────

  async createTemplate(
    tenantId: string,
    dto: CreateWorkflowTemplateDto,
  ): Promise<WorkflowTemplateEntity> {
    return this.dataSource.transaction(async (em) => {
      const template = em.create(WorkflowTemplateEntity, {
        tenantId,
        key: dto.key,
        name: dto.name,
        description: dto.description ?? null,
        status: 'draft',
      });
      await em.save(template);

      // Tạo nodes và lưu map stepKey -> nodeId
      const nodeMap = new Map<string, string>();
      for (const nodeDto of dto.nodes) {
        const node = em.create(WorkflowNodeEntity, {
          templateId: template.id,
          stepKey: nodeDto.stepKey,
          name: nodeDto.name,
          type: nodeDto.type,
          assigneeType: nodeDto.assigneeType ?? null,
          assigneeValue: nodeDto.assigneeValue ?? null,
          assignmentStrategy: nodeDto.assignmentStrategy ?? 'ANY',
          slaMinutes: nodeDto.slaMinutes ?? null,
          formSchema: nodeDto.formSchema ?? null,
          requiredPermissions: nodeDto.requiredPermissions ?? [],
          positionX: nodeDto.positionX ?? 0,
          positionY: nodeDto.positionY ?? 0,
        });
        await em.save(node);
        nodeMap.set(nodeDto.stepKey, node.id);
      }

      // Đặt start node
      if (dto.startStepKey && nodeMap.has(dto.startStepKey)) {
        template.startNodeId = nodeMap.get(dto.startStepKey)!;
        await em.save(template);
      }

      // Tạo transitions
      for (const transDto of dto.transitions) {
        const sourceId = nodeMap.get(transDto.sourceStepKey);
        const targetId = nodeMap.get(transDto.targetStepKey);
        if (!sourceId || !targetId) continue;
        const transition = em.create(WorkflowTransitionEntity, {
          sourceNodeId: sourceId,
          targetNodeId: targetId,
          condition: transDto.condition ?? 'DEFAULT',
          label: transDto.label ?? null,
        });
        await em.save(transition);
      }

      return template;
    });
  }

  async listTemplates(tenantId: string): Promise<WorkflowTemplateEntity[]> {
    return this.templateRepo.find({
      where: { tenantId },
      relations: ['nodes', 'nodes.outgoingTransitions'],
      order: { createdAt: 'DESC' },
    });
  }

  async getTemplatePreview(
    tenantId: string,
    templateId: string,
  ): Promise<WorkflowTemplateEntity> {
    const template = await this.templateRepo.findOne({
      where: { id: templateId, tenantId },
      relations: ['nodes', 'nodes.outgoingTransitions'],
    });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu quy trình');
    return template;
  }

  // ─── Assignment Resolution ─────────────────────────────────────────────────

  /**
   * Giải quyết tác nhân động thành userId cụ thể.
   * Trả về danh sách userId sẽ nhận việc.
   */
  async resolveAssignees(
    node: WorkflowNodeEntity,
    workOrder: WorkOrderEntity,
    previousActorId?: string,
  ): Promise<string[]> {
    if (!node.assigneeType) return [];

    switch (node.assigneeType) {
      case 'USER':
        return node.assigneeValue ? [node.assigneeValue] : [];

      case 'PREVIOUS_STEP_ACTOR':
        return previousActorId ? [previousActorId] : [];

      case 'MANAGER_OF_REQUESTER': {
        if (!workOrder.reporterId) return [];
        // Tìm trưởng bộ phận của người báo cáo
        const membership = await this.membershipRepo.findOne({
          where: { userId: workOrder.reporterId, tenantId: workOrder.tenantId },
          relations: ['organizationUnit'],
        });
        if (!membership?.organizationUnitId) return [];
        // Tìm tất cả membership trong cùng OU với role cao hơn
        const managers = await this.membershipRepo.find({
          where: {
            organizationUnitId: membership.organizationUnitId,
            tenantId: workOrder.tenantId,
          },
        });
        return managers
          .map((m) => m.userId)
          .filter((id) => id !== workOrder.reporterId);
      }

      case 'ROLE': {
        if (!node.assigneeValue) return [];
        const members = await this.membershipRepo
          .createQueryBuilder('m')
          .innerJoin('m.roles', 'r')
          .where('m.tenant_id = :tenantId', { tenantId: workOrder.tenantId })
          .andWhere('r.key = :roleKey', { roleKey: node.assigneeValue })
          .getMany();
        return members.map((m) => m.userId);
      }

      case 'POSITION': {
        if (!node.assigneeValue) return [];
        const members = await this.membershipRepo.find({
          where: {
            positionId: node.assigneeValue,
            tenantId: workOrder.tenantId,
          },
        });
        return members.map((m) => m.userId);
      }

      default:
        return [];
    }
  }

  // ─── Workflow Step Execution ───────────────────────────────────────────────

  async executeStep(
    user: AuthUser,
    dto: ExecuteWorkflowStepDto,
  ): Promise<WorkOrderEntity> {
    const workOrder = await this.workOrderRepo.findOne({
      where: { id: dto.workOrderId, tenantId: user.tenantId },
      relations: ['workflow_template'],
    });
    if (!workOrder)
      throw new NotFoundException('Không tìm thấy phiếu công việc');

    // Tìm template đang dùng
    const template = await this.templateRepo.findOne({
      where: {
        tenantId: user.tenantId,
        key: 'maintenance-standard',
        status: 'active',
      },
      relations: [
        'nodes',
        'nodes.outgoingTransitions',
        'nodes.outgoingTransitions.targetNode',
      ],
    });
    if (!template)
      throw new BadRequestException(
        'Không tìm thấy mẫu quy trình đang hoạt động',
      );

    // Tìm node hiện tại theo step_key
    const currentNode = template.nodes.find((n) => n.stepKey === dto.stepKey);
    if (!currentNode) throw new BadRequestException('Bước không hợp lệ');

    // Tìm transition phù hợp với action
    const transition = currentNode.outgoingTransitions.find(
      (t) => t.condition === dto.action || t.condition === 'DEFAULT',
    );
    if (!transition)
      throw new BadRequestException('Không có bước tiếp theo phù hợp');

    const nextNode = transition.targetNode;

    return this.dataSource.transaction(async (em) => {
      // Ghi log hành động
      const log = em.create(WorkOrderLogEntity, {
        workOrderId: workOrder.id,
        tenantId: user.tenantId,
        actorId: user.id,
        action: dto.action === 'APPROVED' ? 'COMPLETED_STEP' : 'REJECTED_STEP',
        note: dto.note ?? null,
        metadata: {
          stepKey: dto.stepKey,
          nextStepKey: nextNode.stepKey,
          formData: dto.formData ?? {},
        },
      });
      await em.save(log);

      // Cập nhật trạng thái phiếu nếu là bước cuối cùng
      if (nextNode.type === 'end') {
        workOrder.status = WorkOrderStatus.COMPLETED;
      } else if (dto.action === 'REJECTED') {
        // Giữ nguyên IN_PROGRESS, chuyển về bước cũ
        workOrder.status = WorkOrderStatus.IN_PROGRESS;
      }

      // Giải quyết người nhận việc ở bước tiếp theo
      if (nextNode.type !== 'end' && nextNode.type !== 'start') {
        const assignees = await this.resolveAssignees(
          nextNode,
          workOrder,
          user.id,
        );
        if (assignees.length > 0) {
          workOrder.assigneeId = assignees[0]; // ANY strategy: gán người đầu tiên
        }

        // SLA: store deadline in endTime field
        if (nextNode.slaMinutes) {
          const deadline = new Date();
          deadline.setMinutes(deadline.getMinutes() + nextNode.slaMinutes);
          workOrder.endTime = deadline;
        }

        // Tạo thông báo cho người được giao
        for (const assigneeId of assignees) {
          const notif = em.create(NotificationEntity, {
            tenantId: user.tenantId,
            userId: assigneeId,
            type:
              dto.action === 'REJECTED'
                ? 'workflow_task_rejected'
                : 'workflow_task_assigned',
            title:
              dto.action === 'REJECTED'
                ? `Yêu cầu làm lại: ${workOrder.title}`
                : `Công việc mới: ${workOrder.title}`,
            body: dto.note ?? `Bạn được giao bước "${nextNode.name}"`,
            actionUrl: `/work-orders/${workOrder.id}`,
            payload: { workOrderId: workOrder.id, stepKey: nextNode.stepKey },
          });
          await em.save(notif);
        }
      } else if (nextNode.type === 'end') {
        // Thông báo hoàn thành cho reporter
        if (workOrder.reporterId) {
          const notif = em.create(NotificationEntity, {
            tenantId: user.tenantId,
            userId: workOrder.reporterId,
            type: 'workflow_completed',
            title: `Quy trình hoàn thành: ${workOrder.title}`,
            body: 'Phiếu công việc đã hoàn tất toàn bộ quy trình duyệt.',
            actionUrl: `/work-orders/${workOrder.id}`,
            payload: { workOrderId: workOrder.id },
          });
          await em.save(notif);
        }
      }

      await em.save(workOrder);
      return workOrder;
    });
  }
}
