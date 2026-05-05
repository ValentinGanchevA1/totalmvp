// src/seeds/update-nearby.ts
// Updates existing users to appear online and adds them to Redis geo index
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const GEO_KEY = 'user:locations';

async function main() {
  console.log('Updating users for nearby testing...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433', 10),
    username: process.env.DATABASE_USER || 'g88user',
    password: process.env.DATABASE_PASSWORD || 'g88password',
    database: process.env.DATABASE_NAME || 'g88db',
    synchronize: false,
    logging: false,
  });

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  });

  try {
    await dataSource.initialize();
    console.log('Database connected!');
    console.log('Redis connected!\n');

    // Get all active users with locations
    const users = await dataSource.query(`
      SELECT id, "displayName", "lastLatitude", "lastLongitude"
      FROM users
      WHERE "isActive" = true
        AND "isVisible" = true
        AND "lastLatitude" IS NOT NULL
        AND "lastLongitude" IS NOT NULL
      LIMIT 100
    `);

    console.log(`Found ${users.length} users to update\n`);

    // Update lastSeenAt to recent time (makes them appear online)
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      // Random time in last 5 minutes (to show as online)
      const recentTime = new Date(Date.now() - Math.random() * 5 * 60 * 1000);

      // Update lastSeenAt in PostgreSQL
      await dataSource.query(
        `UPDATE users SET "lastSeenAt" = $1 WHERE id = $2`,
        [recentTime, user.id]
      );

      // Add to Redis geo index (longitude, latitude, member)
      await redis.geoadd(GEO_KEY, user.lastLongitude, user.lastLatitude, user.id);
    }

    console.log(`Updated ${users.length} users:`);
    console.log('   - Set lastSeenAt to recent times (appear online)');
    console.log('   - Added to Redis geo index (appear in nearby queries)\n');

    // Show sample locations
    console.log('Sample users (first 5):');
    for (let i = 0; i < Math.min(5, users.length); i++) {
      const u = users[i];
      console.log(`   ${u.displayName}: (${u.lastLatitude.toFixed(4)}, ${u.lastLongitude.toFixed(4)})`);
    }

    // Show center location
    if (users.length > 0) {
      console.log(`\nUsers are centered around: ${users[0].lastLatitude.toFixed(4)}, ${users[0].lastLongitude.toFixed(4)}`);
      console.log('   (Sofia, Bulgaria area - set your test device location near there)');
    }

  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    redis.disconnect();
  }
}

main();
