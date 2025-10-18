#!/usr/bin/env tsx
/**
 * 修正台北市命名 - 將「台北市」統一改為「臺北市」
 * 執行: npx tsx src/scripts/fix-taipei-naming.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 修正台北市地址命名\n');
  console.log('=' .repeat(50));

  // Step 1: 檢查需要修正的資料
  console.log('\n📊 Step 1: 檢查需要修正的資料...\n');

  const placesToFix = await prisma.place.findMany({
    where: {
      address: {
        startsWith: '台北市',
      },
    },
    select: {
      id: true,
      name: true,
      address: true,
    },
  });

  console.log(`找到 ${placesToFix.length} 筆需要修正的資料`);

  if (placesToFix.length === 0) {
    console.log('\n✅ 沒有需要修正的資料');
    return;
  }

  console.log('\n需要修正的場所:');
  placesToFix.forEach((place, index) => {
    console.log(`  ${index + 1}. ${place.name}`);
    console.log(`     ${place.address}`);
  });

  // Step 2: 執行修正
  console.log('\n🔄 Step 2: 執行地址修正...\n');

  let fixedCount = 0;

  for (const place of placesToFix) {
    if (place.address) {
      const newAddress = place.address.replace(/^台北市/, '臺北市');

      await prisma.place.update({
        where: { id: place.id },
        data: { address: newAddress },
      });

      console.log(`✅ ${place.name}`);
      console.log(`   ${place.address} → ${newAddress}`);
      fixedCount++;
    }
  }

  // Step 3: 驗證結果
  console.log('\n📋 Step 3: 驗證修正結果...\n');

  const remaining = await prisma.place.count({
    where: {
      address: {
        startsWith: '台北市',
      },
    },
  });

  const taipei = await prisma.place.count({
    where: {
      address: {
        startsWith: '臺北市',
      },
    },
  });

  console.log(`臺北市場所數: ${taipei}`);
  console.log(`台北市場所數: ${remaining} (應為 0)`);

  console.log('\n' + '='.repeat(50));
  console.log('🎉 修正完成！\n');
  console.log(`總共修正: ${fixedCount} 筆資料`);
}

main()
  .catch((error) => {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
