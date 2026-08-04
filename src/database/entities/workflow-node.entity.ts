import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowTemplateEntity } from './workflow-template.entity';
import { WorkflowTransitionEntity } from './workflow-transition.entity';

export const WORKFLOW_NODE_TYPES = [
  'start',
  'task',
  'approval',
  'condition',
  'end',
] as const;
export type WorkflowNodeType = (typeof WORKFLOW_NODE_TYPES)[number];

/** Ai sẽ được giao việc tại node này */
export const ASSIGNEE_TYPES = [
  'USER',
  'ROLE',
  'POSITION',
  'MANAGER_OF_REQUESTER',
  'PREVIOUS_STEP_ACTOR',
] as const;
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number];

/** Chiến lược duyệt khi giao cho nhóm */
export const ASSIGNMENT_STRATEGIES = ['ANY', 'ALL'] as const;
export type AssignmentStrategy = (typeof ASSIGNMENT_STRATEGIES)[number];

/**
 * form_schema JSONB structure:
 * {
 *   fields: [
 *     { key: "result_note", label: "Kết quả thực hiện", type: "textarea", required: true },
 *     { key: "passed", label: "Đạt yêu cầu?", type: "checkbox", required: true },
 *     { key: "measured_value", label: "Giá trị đo được", type: "number", required: false },
 *     { key: "evidence", label: "Minh chứng ảnh", type: "file", required: true, accept: "image/*" }
 *   ]
 * }
 */
export interface WorkflowFormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'file';
  required: boolean;
  options?: string[]; // for select type
  accept?: string; // for file type
}
export interface WorkflowFormSchema {
  fields: WorkflowFormField[];
}

@Entity({ name: 'workflow_nodes' })
export class WorkflowNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  @Index()
  templateId!: string;

  @ManyToOne(() => WorkflowTemplateEntity, (t) => t.nodes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template!: WorkflowTemplateEntity;

  /** Mã bước để hệ thống định tuyến, ví dụ "task-1", "review", "approve" */
  @Column({ name: 'step_key', length: 80 })
  stepKey!: string;

  @Column({ length: 220 })
  name!: string;

  @Column({ length: 20, default: 'task' })
  type!: WorkflowNodeType;

  /** Loại tác nhân nhận việc */
  @Column({ name: 'assignee_type', type: 'varchar', length: 40, nullable: true })
  assigneeType!: AssigneeType | null;

  /**
   * Giá trị tương ứng với assignee_type:
   * - USER: uuid của user
   * - ROLE: role_key hoặc uuid của role
   * - POSITION: uuid của position
   * - MANAGER_OF_REQUESTER / PREVIOUS_STEP_ACTOR: null (tính động)
   */
  @Column({ name: 'assignee_value', type: 'varchar', length: 120, nullable: true })
  assigneeValue!: string | null;

  /** ANY: chỉ cần 1 người duyệt; ALL: tất cả phải duyệt */
  @Column({ name: 'assignment_strategy', length: 10, default: 'ANY' })
  assignmentStrategy!: AssignmentStrategy;

  /** SLA tính bằng phút */
  @Column({ name: 'sla_minutes', type: 'integer', nullable: true })
  slaMinutes!: number | null;

  /** Biểu mẫu động dạng JSON Schema */
  @Column({ name: 'form_schema', type: 'jsonb', nullable: true })
  formSchema!: WorkflowFormSchema | null;

  /** Quyền bắt buộc phải có để thực hiện node này */
  @Column({
    name: 'required_permissions',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  requiredPermissions!: string[];

  /** Vị trí hiển thị trên Mini-map */
  @Column({ name: 'position_x', type: 'float', default: 0 })
  positionX!: number;

  @Column({ name: 'position_y', type: 'float', default: 0 })
  positionY!: number;

  @OneToMany(() => WorkflowTransitionEntity, (t) => t.sourceNode)
  outgoingTransitions!: WorkflowTransitionEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
