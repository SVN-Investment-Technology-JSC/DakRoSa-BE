import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { WorkflowTaskEntity } from './workflow-task.entity';

@Entity({ name: 'workflow_task_assignments' })
@Unique('UQ_workflow_task_assignments_task_user', ['taskId', 'userId'])
export class WorkflowTaskAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'uuid' })
  @Index()
  taskId!: string;

  @ManyToOne(() => WorkflowTaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task!: WorkflowTaskEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ length: 30, default: 'candidate' })
  type!: 'candidate' | 'assignee' | 'watcher';

  @Column({ name: 'acted_at', type: 'timestamptz', nullable: true })
  actedAt!: Date | null;
}
