import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTradingFeature1703900000000 implements MigrationInterface {
  name = 'AddTradingFeature1703900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ═══════════════════════════════════════════════════════════════════════
    // Create ENUM Types
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TYPE "listing_category" AS ENUM (
        'clothing', 'electronics', 'collectibles', 'books',
        'sports', 'home', 'toys', 'accessories', 'other'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "item_condition" AS ENUM (
        'new', 'like_new', 'good', 'fair', 'worn'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "listing_status" AS ENUM (
        'active', 'pending', 'completed', 'cancelled', 'expired'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "offer_status" AS ENUM (
        'pending', 'accepted', 'rejected', 'withdrawn', 'expired'
      )
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Trade Listings Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "trade_listings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "sellerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "title" VARCHAR(100) NOT NULL,
        "description" TEXT,
        "category" listing_category NOT NULL,
        "condition" item_condition NOT NULL,
        "photos" TEXT[] NOT NULL DEFAULT '{}',
        "location" geography(Point, 4326) NOT NULL,
        "address" VARCHAR(500),
        "lookingFor" TEXT,
        "status" listing_status NOT NULL DEFAULT 'active',
        "viewCount" INTEGER NOT NULL DEFAULT 0,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for trade_listings
    await queryRunner.query(`
      CREATE INDEX "IDX_trade_listings_location" ON "trade_listings" USING GIST ("location")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trade_listings_sellerId" ON "trade_listings" ("sellerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trade_listings_status_category" ON "trade_listings" ("status", "category")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trade_listings_status_createdAt" ON "trade_listings" ("status", "createdAt" DESC)
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Trade Offers Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "trade_offers" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "listingId" UUID NOT NULL REFERENCES "trade_listings"("id") ON DELETE CASCADE,
        "buyerId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "message" VARCHAR(500),
        "offerItems" TEXT,
        "status" offer_status NOT NULL DEFAULT 'pending',
        "respondedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("listingId", "buyerId")
      )
    `);

    // Indexes for trade_offers
    await queryRunner.query(`
      CREATE INDEX "IDX_trade_offers_listingId" ON "trade_offers" ("listingId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trade_offers_buyerId" ON "trade_offers" ("buyerId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trade_offers_status" ON "trade_offers" ("status")
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Trade Favorites Table
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TABLE "trade_favorites" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "listingId" UUID NOT NULL REFERENCES "trade_listings"("id") ON DELETE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE ("userId", "listingId")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trade_favorites_userId" ON "trade_favorites" ("userId")
    `);

    // ═══════════════════════════════════════════════════════════════════════
    // Triggers for Updated Timestamps
    // ═══════════════════════════════════════════════════════════════════════
    await queryRunner.query(`
      CREATE TRIGGER update_trade_listings_updated_at
        BEFORE UPDATE ON "trade_listings"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);

    await queryRunner.query(`
      CREATE TRIGGER update_trade_offers_updated_at
        BEFORE UPDATE ON "trade_offers"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_trade_offers_updated_at ON "trade_offers"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS update_trade_listings_updated_at ON "trade_listings"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_favorites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_offers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trade_listings"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "offer_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "listing_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "item_condition"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "listing_category"`);
  }
}
