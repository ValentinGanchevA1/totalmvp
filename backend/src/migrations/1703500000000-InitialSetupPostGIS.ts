import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSetupPostGIS1703500000000 implements MigrationInterface {
  name = 'InitialSetupPostGIS1703500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════════
    // Enable PostGIS Extension
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis_topology;`);
    
    // ═══════════════════════════════════════════════════════════════════════
    // Create ENUM Types
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TYPE "gender_enum" AS ENUM (
        'male', 'female', 'non_binary', 'other', 'prefer_not_to_say'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "subscription_tier_enum" AS ENUM (
        'free', 'basic', 'premium', 'vip'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "verification_type_enum" AS ENUM (
        'phone', 'email', 'photo', 'id', 'social'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "verification_status_enum" AS ENUM (
        'pending', 'approved', 'rejected', 'expired'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "social_provider_enum" AS ENUM (
        'google', 'apple', 'facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "conversation_type_enum" AS ENUM ('direct', 'group');
    `);

    await queryRunner.query(`
      CREATE TYPE "message_type_enum" AS ENUM (
        'text', 'image', 'location', 'audio', 'video', 'file', 'system'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "message_status_enum" AS ENUM ('sent', 'delivered', 'read');
    `);

    await queryRunner.query(`
      CREATE TYPE "geofence_type_enum" AS ENUM ('circle', 'polygon');
    `);

    await queryRunner.query(`
      CREATE TYPE "geofence_trigger_enum" AS ENUM ('enter', 'exit', 'both');
    `);

    await queryRunner.query(`
      CREATE TYPE "notification_type_enum" AS ENUM (
        'nearby_user', 'message', 'match', 'geofence', 
        'verification', 'payment', 'system', 'promotional'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "admin_role_enum" AS ENUM (
        'super_admin', 'admin', 'moderator', 'reviewer'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "audit_action_enum" AS ENUM (
        'id_approved', 'id_rejected', 'photo_approved', 'photo_rejected',
        'verification_reset', 'user_banned', 'user_unbanned', 'user_deleted',
        'content_removed', 'report_resolved', 'geofence_created', 
        'geofence_updated', 'geofence_deleted', 'admin_login', 
        'admin_created', 'settings_changed'
      );
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Users Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255),
        "phone" VARCHAR(20),
        "passwordHash" VARCHAR(255) NOT NULL,
        "displayName" VARCHAR(50) NOT NULL,
        "avatarUrl" VARCHAR(500),
        "location" geography(Point, 4326),
        "lastLatitude" DOUBLE PRECISION,
        "lastLongitude" DOUBLE PRECISION,
        "lastLocationUpdate" TIMESTAMP,
        "profile" JSONB DEFAULT '{}',
        "badges" JSONB DEFAULT '{}',
        "verificationScore" INTEGER DEFAULT 0,
        "subscriptionTier" subscription_tier_enum DEFAULT 'free',
        "stripeCustomerId" VARCHAR(255),
        "isVisible" BOOLEAN DEFAULT true,
        "isActive" BOOLEAN DEFAULT true,
        "isBanned" BOOLEAN DEFAULT false,
        "bannedReason" TEXT,
        "settings" JSONB DEFAULT '{}',
        "lastSeenAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // User indexes
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email") WHERE "email" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone") WHERE "phone" IS NOT NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_location" ON "users" USING GIST ("location");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_is_visible" ON "users" ("isVisible") WHERE "isVisible" = true;
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Verifications Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "verifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" verification_type_enum NOT NULL,
        "status" verification_status_enum DEFAULT 'pending',
        "metadata" JSONB DEFAULT '{}',
        "verifiedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_verifications_user_type" ON "verifications" ("userId", "type");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_verifications_status_created" ON "verifications" ("status", "createdAt");
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Social Links Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "social_links" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "provider" social_provider_enum NOT NULL,
        "providerId" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255),
        "displayName" VARCHAR(255),
        "profileUrl" VARCHAR(500),
        "avatarUrl" VARCHAR(500),
        "metadata" JSONB,
        "isVisible" BOOLEAN DEFAULT true,
        "linkedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_social_links_provider_id" ON "social_links" ("provider", "providerId");
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Conversations Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" conversation_type_enum DEFAULT 'direct',
        "participant1Id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "participant2Id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "participantIds" TEXT[],
        "groupName" VARCHAR(100),
        "groupAvatarUrl" VARCHAR(500),
        "lastMessageText" TEXT,
        "lastMessageAt" TIMESTAMP,
        "metadata" JSONB DEFAULT '{}',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_conversations_participants" 
      ON "conversations" ("participant1Id", "participant2Id") 
      WHERE "type" = 'direct';
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Messages Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
        "senderId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" message_type_enum DEFAULT 'text',
        "content" TEXT NOT NULL,
        "metadata" JSONB,
        "status" message_status_enum DEFAULT 'sent',
        "readAt" TIMESTAMP,
        "isDeleted" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_messages_conversation_created" ON "messages" ("conversationId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_messages_sender_created" ON "messages" ("senderId", "createdAt");
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Geofences Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "geofences" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "type" geofence_type_enum DEFAULT 'circle',
        "boundary" geography(Geometry, 4326) NOT NULL,
        "radiusMeters" DOUBLE PRECISION,
        "centerLatitude" DOUBLE PRECISION NOT NULL,
        "centerLongitude" DOUBLE PRECISION NOT NULL,
        "trigger" geofence_trigger_enum DEFAULT 'enter',
        "notification" JSONB DEFAULT '{}',
        "isActive" BOOLEAN DEFAULT true,
        "expiresAt" TIMESTAMP,
        "createdBy" UUID,
        "metadata" JSONB DEFAULT '{}',
        "triggerCount" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_geofences_boundary" ON "geofences" USING GIST ("boundary");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_geofences_active_expires" ON "geofences" ("isActive", "expiresAt");
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Notifications Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "type" notification_type_enum NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "body" TEXT NOT NULL,
        "imageUrl" VARCHAR(500),
        "data" JSONB DEFAULT '{}',
        "isRead" BOOLEAN DEFAULT false,
        "readAt" TIMESTAMP,
        "isPushed" BOOLEAN DEFAULT false,
        "pushedAt" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_created" ON "notifications" ("userId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_read" ON "notifications" ("userId", "isRead");
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Admin Users Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "admin_users" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        "displayName" VARCHAR(100) NOT NULL,
        "role" admin_role_enum DEFAULT 'reviewer',
        "isActive" BOOLEAN DEFAULT true,
        "permissions" JSONB DEFAULT '{}',
        "lastLoginAt" TIMESTAMP,
        "lastLoginIp" VARCHAR(45),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Audit Logs Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "adminId" UUID NOT NULL REFERENCES "admin_users"("id"),
        "action" audit_action_enum NOT NULL,
        "targetUserId" UUID,
        "targetVerificationId" UUID,
        "targetResourceId" UUID,
        "metadata" JSONB,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_action_created" ON "audit_logs" ("action", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_target_created" ON "audit_logs" ("targetUserId", "createdAt");
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_admin_created" ON "audit_logs" ("adminId", "createdAt");
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Helper Functions for Geospatial Queries
    // ═══════════════════════════════════════════════════════════════════════
    
    // Function to find users within radius (in meters)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION find_users_within_radius(
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        radius_meters DOUBLE PRECISION,
        limit_count INTEGER DEFAULT 50
      )
      RETURNS TABLE (
        id UUID,
        "displayName" VARCHAR,
        "avatarUrl" VARCHAR,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        distance_meters DOUBLE PRECISION
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          u.id,
          u."displayName",
          u."avatarUrl",
          u."lastLatitude" AS latitude,
          u."lastLongitude" AS longitude,
          ST_Distance(
            u.location::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
          ) AS distance_meters
        FROM users u
        WHERE u."isVisible" = true
          AND u."isActive" = true
          AND u."isBanned" = false
          AND u.location IS NOT NULL
          AND ST_DWithin(
            u.location::geography,
            ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
            radius_meters
          )
        ORDER BY distance_meters
        LIMIT limit_count;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Function to check if point is within geofence
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_geofence_trigger(
        user_lat DOUBLE PRECISION,
        user_lng DOUBLE PRECISION
      )
      RETURNS TABLE (
        geofence_id UUID,
        geofence_name VARCHAR,
        trigger_type geofence_trigger_enum,
        notification JSONB
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          g.id AS geofence_id,
          g.name AS geofence_name,
          g.trigger AS trigger_type,
          g.notification
        FROM geofences g
        WHERE g."isActive" = true
          AND (g."expiresAt" IS NULL OR g."expiresAt" > NOW())
          AND ST_Contains(
            g.boundary::geometry,
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
          );
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Triggers for Updated Timestamps
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW."updatedAt" = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    const tablesWithUpdatedAt = [
      'users',
      'verifications',
      'conversations',
      'geofences',
      'admin_users',
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryRunner.query(`
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON "${table}"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    const tablesWithUpdatedAt = [
      'users',
      'verifications',
      'conversations',
      'geofences',
      'admin_users',
    ];

    for (const table of tablesWithUpdatedAt) {
      await queryRunner.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON "${table}";`);
    }

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS check_geofence_trigger(DOUBLE PRECISION, DOUBLE PRECISION);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS find_users_within_radius(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER);`);

    // Drop tables in reverse order (due to foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_users";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "geofences";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "conversations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "social_links";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "verifications";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "admin_role_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "geofence_trigger_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "geofence_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "message_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "conversation_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "social_provider_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "verification_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "verification_type_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscription_tier_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "gender_enum";`);

    // Drop PostGIS extensions
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis_topology;`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS postgis;`);
  }
}
