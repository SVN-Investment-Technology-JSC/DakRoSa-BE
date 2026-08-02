import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { MaintenanceJobPlanStepEntity } from './maintenance-job-plan-step.entity';
import { UserEntity } from './user.entity';
import { WorkOrderEntity } from './work-order.entity';

@Entity({ name: 'work_order_checklist_results' })
@Unique('UQ_work_order_checklist_results_order_step', ['workOrderId', 'stepId'])
export class WorkOrderChecklistResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'work_order_id', type: 'uuid' })
  @Index()
  workOrderId!: string;

  @ManyToOne(() => WorkOrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder!: WorkOrderEntity;

  @Column({ name: 'step_id', type: 'uuid' })
  stepId!: string;

  @ManyToOne(() => MaintenanceJobPlanStepEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'step_id' })
  step!: MaintenanceJobPlanStepEntity;

  @Column({ length: 30, default: 'pending' })
  status!: 'pending' | 'passed' | 'failed' | 'not_applicable';

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  value!: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'completed_by', type: 'uuid', nullable: true })
  completedBy!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'completed_by' })
  completer!: UserEntity | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
