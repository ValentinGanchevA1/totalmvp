// src/seeds/users.seed.ts
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Sample data pools
const FIRST_NAMES_MALE = [
  'James', 'Michael', 'David', 'Alex', 'Daniel', 'Chris', 'Ryan', 'Kevin',
  'Jason', 'Brandon', 'Marcus', 'Tyler', 'Justin', 'Andrew', 'Matthew',
  'Joshua', 'Anthony', 'Steven', 'Eric', 'Nathan', 'Brian', 'Adam',
  'Patrick', 'Kyle', 'Jake', 'Ethan', 'Noah', 'Lucas', 'Mason', 'Logan'
];

const FIRST_NAMES_FEMALE = [
  'Emma', 'Sophia', 'Olivia', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Madison',
  'Avery', 'Ella', 'Scarlett', 'Grace', 'Chloe', 'Victoria', 'Riley',
  'Aria', 'Lily', 'Zoey', 'Hannah', 'Layla', 'Natalie', 'Luna', 'Camila'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Moore',
  'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark',
  'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott'
];

const INTERESTS = [
  'Travel', 'Music', 'Photography', 'Cooking', 'Fitness', 'Reading', 'Movies',
  'Gaming', 'Art', 'Dancing', 'Hiking', 'Yoga', 'Sports', 'Fashion', 'Coffee',
  'Wine', 'Foodie', 'Tech', 'Nature', 'Beach', 'Mountains', 'Dogs', 'Cats',
  'Running', 'Cycling', 'Swimming', 'Tennis', 'Golf', 'Concerts', 'Theater'
];

const GOALS = [
  'Looking for relationship', 'Making new friends', 'Networking',
  'Just exploring', 'Finding activity partners', 'Dating casually',
  'Something serious', 'Open to anything'
];

const OCCUPATIONS = [
  'Software Engineer', 'Designer', 'Marketing Manager', 'Doctor', 'Teacher',
  'Entrepreneur', 'Photographer', 'Writer', 'Consultant', 'Lawyer',
  'Financial Analyst', 'Nurse', 'Chef', 'Artist', 'Sales Manager',
  'Product Manager', 'Data Scientist', 'Architect', 'Real Estate Agent',
  'Personal Trainer', 'Psychologist', 'Journalist', 'Pilot', 'Engineer'
];

const EDUCATION = [
  'Harvard University', 'Stanford University', 'MIT', 'Yale University',
  'Columbia University', 'UCLA', 'NYU', 'UC Berkeley', 'University of Michigan',
  'Duke University', 'Northwestern University', 'University of Chicago',
  'University of Pennsylvania', 'Cornell University', 'Brown University'
];

const BIOS = [
  "Adventure seeker and coffee enthusiast. Let's explore the city together!",
  "Love spontaneous road trips and trying new restaurants. Dog parent.",
  "Passionate about fitness and healthy living. Always up for a hike!",
  "Tech nerd by day, foodie by night. Looking for someone to share experiences with.",
  "Music lover, concert-goer, and vinyl collector. What's your favorite album?",
  "Bookworm who enjoys cozy cafes and deep conversations.",
  "Travel addict with 30+ countries under my belt. Where should I go next?",
  "Yoga instructor who believes in good vibes and positive energy.",
  "Aspiring chef who loves hosting dinner parties. Will cook for you!",
  "Art gallery hopper and museum enthusiast. Culture is my love language.",
  "Beach bum at heart. Happiest with sand between my toes.",
  "Mountain lover and skiing enthusiast. Winter is my favorite season.",
  "Film buff and amateur critic. Always down for movie nights.",
  "Startup founder working on making the world a better place.",
  "Weekend warrior who loves hiking, biking, and outdoor adventures.",
  "Wine connoisseur and cheese lover. Let's plan a tasting!",
  "Dancing queen looking for someone to salsa with.",
  "Photography enthusiast capturing life's beautiful moments.",
  "Fitness fanatic and marathon runner. Training for my next race!",
  "Plant parent with too many succulents. Help me name them!"
];

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
];

// Center location (Sofia, Bulgaria - adjust as needed)
const CENTER_LAT = 42.6977;
const CENTER_LNG = 23.3219;
const RADIUS_KM = 10;

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomLocation(): { lat: number; lng: number } {
  // Generate random point within radius
  const r = RADIUS_KM * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;

  // Convert to lat/lng offset (approximate)
  const latOffset = (r / 111) * Math.cos(theta);
  const lngOffset = (r / (111 * Math.cos(CENTER_LAT * Math.PI / 180))) * Math.sin(theta);

  return {
    lat: CENTER_LAT + latOffset,
    lng: CENTER_LNG + lngOffset,
  };
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'icloud.com'];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${randomElement(domains)}`;
}

function generatePhone(): string {
  return `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`;
}

export async function seedUsers(dataSource: DataSource): Promise<void> {
  // Check if users already exist
  const [result] = await dataSource.query('SELECT COUNT(*) as count FROM users');
  const existingCount = parseInt(result.count, 10);
  if (existingCount > 10) {
    console.log(`Found ${existingCount} users, skipping seed...`);
    return;
  }

  console.log('Seeding users...');

  const users = [];
  const passwordHash = await bcrypt.hash('Password123!', 10);

  for (let i = 1; i <= 60; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const firstName = gender === 'male'
      ? randomElement(FIRST_NAMES_MALE)
      : randomElement(FIRST_NAMES_FEMALE);
    const lastName = randomElement(LAST_NAMES);
    const location = randomLocation();

    // Subscription distribution: 70% free, 20% basic, 8% premium, 2% VIP
    let subscriptionTier = 'free';
    const tierRoll = Math.random();
    if (tierRoll > 0.98) subscriptionTier = 'vip';
    else if (tierRoll > 0.90) subscriptionTier = 'premium';
    else if (tierRoll > 0.70) subscriptionTier = 'basic';

    // Verification badges
    const badges: Record<string, boolean> = {};
    if (Math.random() > 0.3) badges.email = true;
    if (Math.random() > 0.5) badges.phone = true;
    if (Math.random() > 0.7) badges.photo = true;
    if (subscriptionTier !== 'free') badges.premium = true;

    // Calculate verification score based on badges
    let verificationScore = 0;
    if (badges.email) verificationScore += 20;
    if (badges.phone) verificationScore += 25;
    if (badges.photo) verificationScore += 30;
    if (badges.premium) verificationScore += 25;

    // Random photos (1-4)
    const photoCount = randomInt(1, 4);
    const photoUrls = randomElements(SAMPLE_PHOTOS, photoCount);

    const user = {
      email: generateEmail(firstName, lastName, i),
      phone: Math.random() > 0.3 ? generatePhone() : null,
      passwordHash,
      displayName: `${firstName} ${lastName.charAt(0)}.`,
      avatarUrl: photoUrls[0],
      subscriptionTier,
      verificationScore,
      isVisible: true,
      isActive: true,
      isBanned: false,
      xp: randomInt(0, 500),
      level: randomInt(1, 10),
      lastLatitude: location.lat,
      lastLongitude: location.lng,
      lastLocationUpdate: new Date(),
      badges,
      settings: {
        notifications: true,
        locationSharing: true,
        showOnline: Math.random() > 0.2,
        distanceUnit: Math.random() > 0.5 ? 'km' : 'miles',
      },
      profile: {
        bio: randomElement(BIOS),
        age: randomInt(22, 45),
        gender,
        interestedIn: Math.random() > 0.1
          ? (gender === 'male' ? 'female' : 'male')
          : 'both',
        interests: randomElements(INTERESTS, randomInt(3, 7)),
        goals: randomElements(GOALS, randomInt(1, 3)),
        photoUrls,
        height: gender === 'male' ? randomInt(165, 195) : randomInt(155, 180),
        occupation: randomElement(OCCUPATIONS),
        education: Math.random() > 0.3 ? randomElement(EDUCATION) : null,
        languages: ['English', ...(Math.random() > 0.5 ? ['Spanish'] : [])],
        completedAt: new Date().toISOString(),
      },
      createdAt: new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000),
      lastSeenAt: new Date(Date.now() - randomInt(0, 24) * 60 * 60 * 1000),
    };

    users.push(user);
  }

  // Insert users
  for (const userData of users) {
    try {
      // Use raw query to set location as geography
      await dataSource.query(`
        INSERT INTO "users" (
          "email", "phone", "passwordHash", "displayName", "avatarUrl",
          "subscriptionTier", "verificationScore", "isVisible", "isActive", "isBanned",
          "xp", "level", "lastLatitude", "lastLongitude", "lastLocationUpdate",
          "badges", "settings", "profile", "createdAt", "lastSeenAt", "location"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          ST_SetSRID(ST_MakePoint($14, $13), 4326)::geography
        )
      `, [
        userData.email,
        userData.phone,
        userData.passwordHash,
        userData.displayName,
        userData.avatarUrl,
        userData.subscriptionTier,
        userData.verificationScore,
        userData.isVisible,
        userData.isActive,
        userData.isBanned,
        userData.xp,
        userData.level,
        userData.lastLatitude,
        userData.lastLongitude,
        userData.lastLocationUpdate,
        JSON.stringify(userData.badges),
        JSON.stringify(userData.settings),
        JSON.stringify(userData.profile),
        userData.createdAt,
        userData.lastSeenAt,
      ]);
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation - skip
        console.log(`Skipping duplicate user: ${userData.email}`);
      } else {
        throw error;
      }
    }
  }

  console.log(`Seeded ${users.length} users successfully!`);
}
