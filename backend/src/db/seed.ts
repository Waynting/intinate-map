import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database for Intimate Spaces Taipei...\n');

  // Create demo user
  const demoEmail = 'demo@intimate-spaces.com';
  const demoPassword = 'demo1234';
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      passwordHash,
      role: 'user',
    },
  });

  console.log(`✅ Created demo user: ${demoEmail} (password: ${demoPassword})`);

  // Create admin user
  const adminEmail = 'admin@intimate-spaces.com';
  const adminPassword = 'admin1234';
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
      role: 'admin',
    },
  });

  console.log(`✅ Created admin user: ${adminEmail} (password: ${adminPassword})\n`);

  // Sample places data (will be replaced by actual Taiwan hotel data import later)
  const samplePlaces = [
    {
      name: '台北中山商旅',
      type: 'hotel',
      address: '臺北市中山區中山北路二段',
      latitude: 25.0600,
      longitude: 121.5233,
      privacyTags: JSON.stringify(['self_checkin', 'garage']),
      source: 'user',
      createdBy: demoUser.id,
    },
    {
      name: '信義區精品旅店',
      type: 'motel',
      address: '臺北市信義區松仁路',
      latitude: 25.0333,
      longitude: 121.5654,
      privacyTags: JSON.stringify(['soundproof', 'kiosk', 'hourly_rate']),
      source: 'user',
      createdBy: demoUser.id,
    },
    {
      name: '西門町短租公寓',
      type: 'short_stay',
      address: '臺北市萬華區漢口街',
      latitude: 25.0422,
      longitude: 121.5063,
      privacyTags: JSON.stringify(['self_checkin', 'cash_only']),
      source: 'user',
      createdBy: demoUser.id,
    },
  ];

  // Create sample places
  for (const placeData of samplePlaces) {
    const place = await prisma.place.upsert({
      where: { id: `seed-${placeData.name}` }, // Use name as temp ID for upsert
      update: {},
      create: placeData,
    });
    console.log(`✓ ${place.name} (${place.type})`);
  }

  console.log(`\n✅ Successfully seeded ${samplePlaces.length} sample places!`);
  console.log('\n💡 Note: Run data import script to add Taiwan hotel data from government open data.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
