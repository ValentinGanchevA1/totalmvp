import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEventsAndGamification1703700000000 implements MigrationInterface {
  name = 'AddEventsAndGamification1703700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ==================== ENUMS ====================

    // Event enums
    await queryRunner.query(`
      CREATE TYPE "event_category" AS ENUM ('music', 'sports', 'food', 'social', 'business', 'gaming', 'fitness', 'arts', 'networking', 'other')
    `);

    await queryRunner.query(`
      CREATE TYPE "event_status" AS ENUM ('draft', 'active', 'cancelled', 'completed')
    `);

    await queryRunner.query(`
      CREATE TYPE "attendee_status" AS ENUM ('going', 'maybe', 'not_going')
    `);

    // Gamification enums
    await queryRunner.query(`
      CREATE TYPE "achievement_category" AS ENUM ('social', 'events', 'profile', 'premium', 'gifts')
    `);

    await queryRunner.query(`
      CREATE TYPE "rarity" AS ENUM ('common', 'rare', 'epic', 'legendary')
    `);

    await queryRunner.query(`
      CREATE TYPE "challenge_type" AS ENUM ('daily', 'weekly', 'special')
    `);

    // Gifts enums
    await queryRunner.query(`
      CREATE TYPE "gift_category" AS ENUM ('basic', 'premium', 'luxury')
    `);

    // ==================== EVENTS TABLES ====================

    // Events table
    await queryRunner.query(`
      CREATE TABLE "events" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "hostId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "category" event_category NOT NULL DEFAULT 'social',
        "location" geography(Point, 4326) NOT NULL,
        "address" VARCHAR(500),
        "startTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endTime" TIMESTAMP WITH TIME ZONE NOT NULL,
        "maxCapacity" INTEGER,
        "isPublic" BOOLEAN NOT NULL DEFAULT true,
        "coverImageUrl" VARCHAR(500),
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "status" event_status NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_location" ON "events" USING GIST ("location")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_hostId" ON "events" ("hostId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_status_startTime" ON "events" ("status", "startTime")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_events_category" ON "events" ("category")
    `);

    // Event attendees table
    await queryRunner.query(`
      CREATE TABLE "event_attendees" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "status" attendee_status NOT NULL DEFAULT 'going',
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "checkedInAt" TIMESTAMP WITH TIME ZONE,
        UNIQUE ("eventId", "userId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_attendees_userId" ON "event_attendees" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_event_attendees_eventId_status" ON "event_attendees" ("eventId", "status")
    `);

    // ==================== POLLS & Q&A TABLES ====================

    // Polls table
    await queryRunner.query(`
      CREATE TABLE "polls" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
        "creatorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "question" VARCHAR(500) NOT NULL,
        "options" JSONB NOT NULL DEFAULT '[]',
        "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
        "endsAt" TIMESTAMP WITH TIME ZONE,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_polls_eventId" ON "polls" ("eventId")
    `);

    // Poll votes table
    await queryRunner.query(`
      CREATE TABLE "poll_votes" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "pollId" UUID NOT NULL REFERENCES "polls"("id") ON DELETE CASCADE,
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "optionIds" TEXT[] NOT NULL DEFAULT '{}',
        "votedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("pollId", "userId")
      )
    `);

    // Questions table (Q&A)
    await queryRunner.query(`
      CREATE TABLE "questions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "eventId" UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
        "askerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "content" VARCHAR(1000) NOT NULL,
        "upvotes" INTEGER NOT NULL DEFAULT 0,
        "isAnswered" BOOLEAN NOT NULL DEFAULT false,
        "isPinned" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_questions_eventId" ON "questions" ("eventId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_questions_eventId_upvotes" ON "questions" ("eventId", "upvotes" DESC)
    `);

    // Question upvotes table
    await queryRunner.query(`
      CREATE TABLE "question_upvotes" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "questionId" UUID NOT NULL REFERENCES "questions"("id") ON DELETE CASCADE,
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("questionId", "userId")
      )
    `);

    // ==================== GAMIFICATION TABLES ====================

    // Achievements table
    await queryRunner.query(`
      CREATE TABLE "achievements" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(100) NOT NULL,
        "description" VARCHAR(500) NOT NULL,
        "icon" VARCHAR(100) NOT NULL,
        "category" achievement_category NOT NULL,
        "rarity" rarity NOT NULL DEFAULT 'common',
        "xpReward" INTEGER NOT NULL DEFAULT 0,
        "criteria" JSONB NOT NULL DEFAULT '{}',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User achievements table
    await queryRunner.query(`
      CREATE TABLE "user_achievements" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "achievementId" UUID NOT NULL REFERENCES "achievements"("id") ON DELETE CASCADE,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "unlockedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId", "achievementId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_achievements_userId" ON "user_achievements" ("userId")
    `);

    // Challenges table
    await queryRunner.query(`
      CREATE TABLE "challenges" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "title" VARCHAR(200) NOT NULL,
        "description" VARCHAR(500) NOT NULL,
        "type" challenge_type NOT NULL DEFAULT 'daily',
        "criteria" JSONB NOT NULL DEFAULT '{}',
        "xpReward" INTEGER NOT NULL DEFAULT 0,
        "startAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_challenges_active_dates" ON "challenges" ("isActive", "startAt", "endAt")
    `);

    // User challenges table
    await queryRunner.query(`
      CREATE TABLE "user_challenges" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "challengeId" UUID NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "claimedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId", "challengeId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_challenges_userId" ON "user_challenges" ("userId")
    `);

    // ==================== GIFTS TABLES ====================

    // Gift catalog table
    await queryRunner.query(`
      CREATE TABLE "gift_catalog" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" VARCHAR(100) NOT NULL,
        "icon" VARCHAR(100) NOT NULL,
        "category" gift_category NOT NULL DEFAULT 'basic',
        "coinPrice" INTEGER NOT NULL,
        "usdPrice" DECIMAL(10, 2) NOT NULL,
        "animationType" VARCHAR(50) DEFAULT 'default',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_gift_catalog_category" ON "gift_catalog" ("category", "sortOrder")
    `);

    // User wallets table
    await queryRunner.query(`
      CREATE TABLE "user_wallets" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "coinBalance" INTEGER NOT NULL DEFAULT 0,
        "totalEarned" INTEGER NOT NULL DEFAULT 0,
        "totalSpent" INTEGER NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Gift transactions table
    await queryRunner.query(`
      CREATE TABLE "gift_transactions" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "senderId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "recipientId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "giftId" UUID NOT NULL REFERENCES "gift_catalog"("id"),
        "quantity" INTEGER NOT NULL DEFAULT 1,
        "coinAmount" INTEGER NOT NULL,
        "creatorShare" INTEGER NOT NULL,
        "platformFee" INTEGER NOT NULL,
        "message" VARCHAR(500),
        "context" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_gift_transactions_senderId" ON "gift_transactions" ("senderId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_gift_transactions_recipientId" ON "gift_transactions" ("recipientId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_gift_transactions_createdAt" ON "gift_transactions" ("createdAt" DESC)
    `);

    // ==================== ADD XP COLUMN TO USERS ====================

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "xp" INTEGER NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "level" INTEGER NOT NULL DEFAULT 1
    `);

    // ==================== SEED DEFAULT ACHIEVEMENTS ====================

    await queryRunner.query(`
      INSERT INTO "achievements" ("code", "name", "description", "icon", "category", "rarity", "xpReward", "criteria") VALUES
      ('profile_complete', 'Profile Pro', 'Complete your profile 100%', '📝', 'profile', 'common', 50, '{"type": "profile_completion", "target": 100}'),
      ('first_match', 'First Spark', 'Get your first match', '✨', 'social', 'common', 25, '{"type": "matches", "target": 1}'),
      ('matches_10', 'Social Butterfly', 'Get 10 matches', '🦋', 'social', 'rare', 100, '{"type": "matches", "target": 10}'),
      ('matches_50', 'Heart Collector', 'Get 50 matches', '💝', 'social', 'epic', 500, '{"type": "matches", "target": 50}'),
      ('event_host', 'Party Starter', 'Host your first event', '🎉', 'events', 'rare', 75, '{"type": "events_hosted", "target": 1}'),
      ('event_host_10', 'Event Master', 'Host 10 events', '🎊', 'events', 'epic', 300, '{"type": "events_hosted", "target": 10}'),
      ('event_attend_5', 'Regular', 'Attend 5 events', '🎟️', 'events', 'rare', 100, '{"type": "events_attended", "target": 5}'),
      ('verified_all', 'Fully Verified', 'Complete all verifications', '✅', 'profile', 'rare', 200, '{"type": "verifications", "target": 4}'),
      ('gifts_sent_10', 'Generous Soul', 'Send 10 gifts', '🎁', 'gifts', 'rare', 150, '{"type": "gifts_sent", "target": 10}'),
      ('premium_member', 'VIP Status', 'Subscribe to premium', '👑', 'premium', 'legendary', 100, '{"type": "subscription", "target": 1}'),
      ('first_message', 'Ice Breaker', 'Send your first message', '💬', 'social', 'common', 20, '{"type": "messages_sent", "target": 1}'),
      ('super_liker', 'Super Fan', 'Send 5 super likes', '⭐', 'social', 'rare', 75, '{"type": "super_likes", "target": 5}'),
      ('early_bird', 'Early Bird', 'Join the app in first month', '🌅', 'profile', 'legendary', 250, '{"type": "early_adopter", "target": 1}')
    `);

    // ==================== SEED DEFAULT GIFT CATALOG ====================

    await queryRunner.query(`
      INSERT INTO "gift_catalog" ("name", "icon", "category", "coinPrice", "usdPrice", "animationType", "sortOrder") VALUES
      ('Like', '❤️', 'basic', 10, 0.10, 'pulse', 1),
      ('Rose', '🌹', 'basic', 25, 0.25, 'float', 2),
      ('Coffee', '☕', 'basic', 50, 0.50, 'steam', 3),
      ('Kiss', '💋', 'basic', 75, 0.75, 'sparkle', 4),
      ('Champagne', '🍾', 'premium', 100, 1.00, 'pop', 5),
      ('Star', '⭐', 'premium', 200, 2.00, 'twinkle', 6),
      ('Fireworks', '🎆', 'premium', 300, 3.00, 'explode', 7),
      ('Crown', '👑', 'luxury', 500, 5.00, 'glow', 8),
      ('Diamond', '💎', 'luxury', 1000, 10.00, 'shine', 9),
      ('Yacht', '🛥️', 'luxury', 2500, 25.00, 'wave', 10)
    `);

    // ==================== TRIGGERS ====================

    // Auto-update updatedAt for events
    await queryRunner.query(`
      CREATE TRIGGER update_events_updated_at
        BEFORE UPDATE ON "events"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Auto-update updatedAt for user_wallets
    await queryRunner.query(`
      CREATE TRIGGER update_user_wallets_updated_at
        BEFORE UPDATE ON "user_wallets"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON "user_wallets"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_events_updated_at ON "events"`);

    // Remove user columns
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "level"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "xp"`);

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "gift_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_wallets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "gift_catalog"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_challenges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "challenges"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_achievements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "achievements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "question_upvotes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "poll_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "polls"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_attendees"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "gift_category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "challenge_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "rarity"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "achievement_category"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "attendee_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "event_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "event_category"`);
  }
}
