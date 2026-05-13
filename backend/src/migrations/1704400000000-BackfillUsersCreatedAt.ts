import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillUsersCreatedAt1704400000000 implements MigrationInterface {
  name = 'BackfillUsersCreatedAt1704400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Backfill any rows where createdAt is NULL before enforcing the constraint.
    // This guards against rows inserted via raw SQL or before the column default was in place.
    await queryRunner.query(`
      UPDATE "users"
      SET "createdAt" = NOW()
      WHERE "createdAt" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "createdAt" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "createdAt" DROP NOT NULL;
    `);
  }
}
