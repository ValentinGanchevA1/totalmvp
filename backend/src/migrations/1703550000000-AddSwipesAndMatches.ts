import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSwipesAndMatches1703550000000 implements MigrationInterface {
  name = 'AddSwipesAndMatches1703550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create swipe type enum
    await queryRunner.query(`
      CREATE TYPE "swipe_type_enum" AS ENUM ('like', 'pass', 'super_like');
    `);

    // Create swipes table
    await queryRunner.query(`
      CREATE TABLE "swipes" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "swiperId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "swipedId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" swipe_type_enum NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Unique constraint: one swipe per user pair
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_swipes_swiper_swiped" ON "swipes" ("swiperId", "swipedId");
    `);

    // Index for looking up who swiped on a user
    await queryRunner.query(`
      CREATE INDEX "IDX_swipes_swiped" ON "swipes" ("swipedId");
    `);

    // Create matches table
    await queryRunner.query(`
      CREATE TABLE "matches" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user1Id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "user2Id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "user1Unmatched" BOOLEAN DEFAULT false,
        "user2Unmatched" BOOLEAN DEFAULT false,
        "matchedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "lastInteractionAt" TIMESTAMP
      );
    `);

    // Unique constraint: one match per user pair
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_matches_users" ON "matches" ("user1Id", "user2Id");
    `);

    // Indexes for querying matches by user
    await queryRunner.query(`
      CREATE INDEX "IDX_matches_user1" ON "matches" ("user1Id");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_matches_user2" ON "matches" ("user2Id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "matches";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "swipes";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "swipe_type_enum";`);
  }
}
