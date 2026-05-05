import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWavesTable1703800000000 implements MigrationInterface {
  name = 'CreateWavesTable1703800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "waves" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "fromUserId" uuid NOT NULL,
        "toUserId" uuid NOT NULL,
        "isRead" boolean DEFAULT false,
        "readAt" timestamp,
        "createdAt" timestamp DEFAULT now(),
        CONSTRAINT "FK_waves_fromUser" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_waves_toUser" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE
      );

      CREATE INDEX "IDX_waves_from_to_created" ON "waves" ("fromUserId", "toUserId", "createdAt");
      CREATE INDEX "IDX_waves_to_unread" ON "waves" ("toUserId", "isRead");
      CREATE INDEX "IDX_waves_toUser" ON "waves" ("toUserId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "waves"`);
  }
}
