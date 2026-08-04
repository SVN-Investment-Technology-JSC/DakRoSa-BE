import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowNodeEntity } from './workflow-node.entity';

export const WORKFLOW_TEMPLATE_STATUSES = [
  'draft',
  'active',
  'archived',
] as const;
export type WorkflowTemplateStatus =
  (typeof WORKFLOW_TEMPLATE_STATUSES)[number];

@Entity({ name: 'workflow_templates' })
export class WorkflowTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Multi-tenant isolation */
  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  /** Mã định danh ngắn, ví dụ "maintenance-3step" */
  @Column({ length: 80 })
  key!: string;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ length: 220 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ length: 20, default: 'draft' })
  status!: WorkflowTemplateStatus;

  /** node_id của bước bắt đầu */
  @Column({ name: 'start_node_id', type: 'uuid', nullable: true })
  startNodeId!: string | null;

  @OneToMany(() => WorkflowNodeEntity, (node) => node.template, {
    cascade: true,
  })
  nodes!: WorkflowNodeEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
