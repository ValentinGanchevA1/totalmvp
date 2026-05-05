import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkillsSystem1704300000000 implements MigrationInterface {
  name = 'AddSkillsSystem1704300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create UserStatus enum type
    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM (
        'free',
        'verified',
        'pro',
        'incognito'
      );
    `);

    // Add skills columns to users table
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "status" "user_status_enum" NOT NULL DEFAULT 'free';
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "datingScore" int NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "socialScore" int NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "traderScore" int NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "overallLevel" int NOT NULL DEFAULT 1;
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "skillsLastCalculatedAt" TIMESTAMP NULL;
    `);

    // Create SkillChangeReason enum type
    await queryRunner.query(`
      CREATE TYPE "skill_change_reason_enum" AS ENUM (
        'match_created',
        'match_lost',
        'message_exchange',
        'follower_gained',
        'follower_lost',
        'event_rsvp',
        'gift_sent',
        'gift_received',
        'transaction_completed',
        'transaction_cancelled',
        'rating_received',
        'dispute_resolved',
        'verification_completed',
        'status_upgraded',
        'inactivity_decay',
        'manual_adjustment'
      );
    `);

    // Create user_skills_history table
    await queryRunner.query(`
      CREATE TABLE "user_skills_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "skillType" varchar NOT NULL,
        "scoreBefore" int NOT NULL,
        "scoreAfter" int NOT NULL,
        "delta" int NOT NULL,
        "reason" "skill_change_reason_enum" NOT NULL,
        "metadata" jsonb,
        "description" varchar,
        "isRecent" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        FOREIGN KEY("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Create indexes for user_skills_history
    await queryRunner.query(`
      CREATE INDEX "IDX_user_skills_history_userId_createdAt" 
      ON "user_skills_history" ("userId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_skills_history_userId_skillType" 
      ON "user_skills_history" ("userId", "skillType");
    `);

    // Create indexes on skills columns for leaderboard queries
    await queryRunner.query(`
      CREATE INDEX "IDX_users_datingScore" ON "users" ("datingScore" DESC) 
      WHERE "status" IN ('verified', 'pro');
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_socialScore" ON "users" ("socialScore" DESC) 
      WHERE "status" IN ('verified', 'pro');
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_traderScore" ON "users" ("traderScore" DESC) 
      WHERE "status" IN ('verified', 'pro');
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_overallLevel" ON "users" ("overallLevel" DESC) 
      WHERE "status" IN ('verified', 'pro');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_users_overallLevel";`);
    await queryRunner.query(`DROP INDEX "IDX_users_traderScore";`);
    await queryRunner.query(`DROP INDEX "IDX_users_socialScore";`);
    await queryRunner.query(`DROP INDEX "IDX_users_datingScore";`);
    await queryRunner.query(`DROP INDEX "IDX_user_skills_history_userId_skillType";`);
    await queryRunner.query(`DROP INDEX "IDX_user_skills_history_userId_createdAt";`);

    // Drop table
    await queryRunner.query(`DROP TABLE "user_skills_history";`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "skill_change_reason_enum";`);

    // Drop columns from users table
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "skillsLastCalculatedAt";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "overallLevel";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "traderScore";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "socialScore";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "datingScore";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status";`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "user_status_enum";`);
  }
}
