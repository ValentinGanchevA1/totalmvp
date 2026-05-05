// src/seeds/seed.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { seedUsers } from './users.seed';

dotenv.config();

async function main() {
  console.log('Starting database seeding...\n');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5433', 10),
    username: process.env.DATABASE_USER || 'g88user',
    password: process.env.DATABASE_PASSWORD || 'g88password',
    database: process.env.DATABASE_NAME || 'g88db',
    entities: [],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected!\n');

    // Run seeders
    console.log('=== Seeding Users ===');
    await seedUsers(dataSource);
    console.log('');

    // Seed sample events
    console.log('=== Seeding Sample Events ===');
    await seedEvents(dataSource);
    console.log('');

    // Seed sample challenges
    console.log('=== Seeding Sample Challenges ===');
    await seedChallenges(dataSource);
    console.log('');

    console.log('All seeds completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

async function seedEvents(dataSource: DataSource): Promise<void> {
  // Get a random host user
  const [user] = await dataSource.query(`
    SELECT id, "lastLatitude", "lastLongitude" FROM users LIMIT 1
  `);

  if (!user) {
    console.log('No users found, skipping event seed');
    return;
  }

  const eventCount = await dataSource.query(`SELECT COUNT(*) as count FROM events`);
  if (parseInt(eventCount[0].count) > 0) {
    console.log('Events already seeded, skipping...');
    return;
  }

  const now = new Date();
  const events = [
    {
      title: 'Weekend Coffee Meetup',
      description: 'Casual coffee and conversation at the local cafe. Meet new people in a relaxed setting!',
      category: 'social',
      lat: user.lastLatitude + 0.005,
      lng: user.lastLongitude + 0.003,
      address: 'Central Coffee House, 123 Main St',
      startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      maxCapacity: 20,
    },
    {
      title: 'Sunset Yoga in the Park',
      description: 'Join us for a peaceful yoga session as the sun sets. All levels welcome. Bring your own mat!',
      category: 'fitness',
      lat: user.lastLatitude - 0.008,
      lng: user.lastLongitude + 0.006,
      address: 'City Park, East Lawn',
      startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
      maxCapacity: 30,
    },
    {
      title: 'Tech Networking Night',
      description: 'Connect with local tech professionals. Developers, designers, and entrepreneurs welcome!',
      category: 'networking',
      lat: user.lastLatitude + 0.002,
      lng: user.lastLongitude - 0.004,
      address: 'Innovation Hub, 456 Tech Blvd',
      startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      maxCapacity: 50,
    },
    {
      title: 'Live Music Friday',
      description: 'Local bands performing live! Great drinks, great vibes, great people.',
      category: 'music',
      lat: user.lastLatitude - 0.003,
      lng: user.lastLongitude - 0.007,
      address: 'The Blue Note Bar, 789 Music Ave',
      startTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      maxCapacity: 100,
    },
    {
      title: 'Weekend Hiking Adventure',
      description: 'Moderate difficulty hike with stunning views. 5km trail, expect 2-3 hours.',
      category: 'sports',
      lat: user.lastLatitude + 0.015,
      lng: user.lastLongitude + 0.012,
      address: 'Mountain Trail Entrance, Highway 7',
      startTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
      maxCapacity: 15,
    },
    {
      title: 'Foodie Walking Tour',
      description: 'Explore the best local eateries! 5 stops, tastings included. Come hungry!',
      category: 'food',
      lat: user.lastLatitude - 0.001,
      lng: user.lastLongitude + 0.002,
      address: 'Starting at Plaza Square',
      startTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endTime: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      maxCapacity: 12,
    },
  ];

  for (const event of events) {
    await dataSource.query(`
      INSERT INTO events (
        "hostId", "title", "description", "category", "location",
        "address", "startTime", "endTime", "maxCapacity", "isPublic", "status"
      ) VALUES (
        $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
        $7, $8, $9, $10, true, 'active'
      )
    `, [
      user.id,
      event.title,
      event.description,
      event.category,
      event.lng,
      event.lat,
      event.address,
      event.startTime,
      event.endTime,
      event.maxCapacity,
    ]);
  }

  console.log(`Seeded ${events.length} events!`);
}

async function seedChallenges(dataSource: DataSource): Promise<void> {
  const challengeCount = await dataSource.query(`SELECT COUNT(*) as count FROM challenges`);
  if (parseInt(challengeCount[0].count) > 0) {
    console.log('Challenges already seeded, skipping...');
    return;
  }

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const challenges = [
    {
      title: 'Social Starter',
      description: 'Send 5 messages to new matches',
      type: 'daily',
      criteria: { action: 'send_message', target: 5 },
      xpReward: 30,
      startAt: now,
      endAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    {
      title: 'Event Explorer',
      description: 'Join 2 events this week',
      type: 'weekly',
      criteria: { action: 'join_event', target: 2 },
      xpReward: 100,
      startAt: weekStart,
      endAt: weekEnd,
    },
    {
      title: 'Profile Perfectionist',
      description: 'Complete your profile to 100%',
      type: 'special',
      criteria: { action: 'complete_profile', target: 100 },
      xpReward: 75,
      startAt: now,
      endAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Super Liker',
      description: 'Use 3 super likes today',
      type: 'daily',
      criteria: { action: 'super_like', target: 3 },
      xpReward: 25,
      startAt: now,
      endAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
    {
      title: 'Gift Giver',
      description: 'Send gifts to 3 different users this week',
      type: 'weekly',
      criteria: { action: 'send_gift', target: 3 },
      xpReward: 75,
      startAt: weekStart,
      endAt: weekEnd,
    },
    {
      title: 'Verified VIP',
      description: 'Complete 2 verifications',
      type: 'special',
      criteria: { action: 'verification', target: 2 },
      xpReward: 150,
      startAt: now,
      endAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const challenge of challenges) {
    await dataSource.query(`
      INSERT INTO challenges (
        "title", "description", "type", "criteria", "xpReward", "startAt", "endAt", "isActive"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `, [
      challenge.title,
      challenge.description,
      challenge.type,
      JSON.stringify(challenge.criteria),
      challenge.xpReward,
      challenge.startAt,
      challenge.endAt,
    ]);
  }

  console.log(`Seeded ${challenges.length} challenges!`);
}

main();
