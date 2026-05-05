import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBoostedUntil1703600000000 implements MigrationInterface {
  name = 'AddBoostedUntil1703600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "boostedUntil" TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "boostedUntil"
    `);
  }
}
