import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileFields1784070000000 implements MigrationInterface {
  name = 'AddUserProfileFields1784070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN "short_name" character varying(80),
        ADD COLUMN "email" character varying(254),
        ADD COLUMN "phone" character varying(30),
        ADD COLUMN "address" character varying(500),
        ADD COLUMN "joined_at" date,
        ADD COLUMN "work_shift" character varying(100)
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET
        "email" = LOWER("username") || '@dakrosa.local',
        "phone" = LPAD(ABS(HASHTEXT("id"::text)::bigint)::text, 10, '0'),
        "joined_at" = "created_at"::date
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "email" SET NOT NULL,
        ALTER COLUMN "phone" SET NOT NULL,
        ALTER COLUMN "joined_at" SET NOT NULL
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX "UQ_users_email_lower" ON "users" (LOWER("email"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_users_email_lower"');
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN "work_shift",
        DROP COLUMN "joined_at",
        DROP COLUMN "address",
        DROP COLUMN "phone",
        DROP COLUMN "email",
        DROP COLUMN "short_name"
    `);
  }
}
