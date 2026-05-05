// Move users to San Francisco area (default map location)
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const GEO_KEY = 'user:locations';

// San Francisco - matches MapScreen default
const CENTER_LAT = 37.78825;
const CENTER_LNG = -122.4324;
const RADIUS_KM = 5;

function randomLocation(): { lat: number; lng: number } {
  const r = RADIUS_KM * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const latOffset = (r / 111) * Math.cos(theta);
  const lngOffset = (r / (111 * Math.cos(CENTER_LAT * Math.PI / 180))) * Math.sin(theta);
  return {
    lat: CENTER_LAT + latOffset,
    lng: CENTER_LNG + lngOffset,
  };
}

async function main() {
  console.log('Moving users to San Francisco area...\n');

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

    // Get all users
    const users = await dataSource.query(`
      SELECT id, "displayName" FROM users
      WHERE "isActive" = true AND "isVisible" = true
      LIMIT 60
    `);

    console.log(`Moving ${users.length} users to San Francisco area...\n`);

    for (const user of users) {
      const loc = randomLocation();
      const recentTime = new Date(Date.now() - Math.random() * 5 * 60 * 1000);

      // Update PostgreSQL
      await dataSource.query(`
        UPDATE users SET
          "lastLatitude" = $1,
          "lastLongitude" = $2,
          "lastSeenAt" = $3,
          "lastLocationUpdate" = $3,
          "location" = ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        WHERE id = $4
      `, [loc.lat, loc.lng, recentTime, user.id]);

      // Update Redis geo index
      await redis.geoadd(GEO_KEY, loc.lng, loc.lat, user.id);
    }

    console.log(`Done! ${users.length} users now around San Francisco.\n`);
    console.log('Set your emulator location to:');
    console.log(`  Latitude:  ${CENTER_LAT}`);
    console.log(`  Longitude: ${CENTER_LNG}`);
    console.log('\nOr just open the map - it defaults to this location!');

  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    redis.disconnect();
  }
}

main();
