import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WorkflowNodeEntity } from './workflow-node.entity';

/**
 * Các điều kiện để kích hoạt nhánh rẽ:
 * - APPROVED: người duyệt bấm "Đồng ý / Hoàn thành"
 * - REJECTED: người duyệt bấm "Từ chối / Yêu cầu làm lại"
 * - DEFAULT: nhánh mặc định (không điều kiện)
 */
export const TRANSITION_CONDITIONS = [
  'APPROVED',
  'REJECTED',
  'DEFAULT',
] as const;
export type TransitionCondition = (typeof TRANSITION_CONDITIONS)[number];

@Entity({ name: 'workflow_transitions' })
export class WorkflowTransitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'source_node_id', type: 'uuid' })
  @Index()
  sourceNodeId!: string;

  @ManyToOne(() => WorkflowNodeEntity, (n) => n.outgoingTransitions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'source_node_id' })
  sourceNode!: WorkflowNodeEntity;

  @Column({ name: 'target_node_id', type: 'uuid' })
  targetNodeId!: string;

  @ManyToOne(() => WorkflowNodeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_node_id' })
  targetNode!: WorkflowNodeEntity;

  /** Điều kiện kích hoạt nhánh này */
  @Column({ length: 30, default: 'DEFAULT' })
  condition!: TransitionCondition;

  /** Nhãn hiển thị trên cạnh sơ đồ (ví dụ: "Đồng ý", "Từ chối") */
  @Column({ type: 'varchar', length: 80, nullable: true })
  label!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
