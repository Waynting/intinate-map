/**
 * Fix Outlier Coordinates
 * 修正資料庫中超出合理範圍的座標
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 雙北市合理座標範圍
 */
const SHUANGBEI_BOUNDS = {
  minLat: 24.6,
  maxLat: 25.4,
  minLng: 121.2,
  maxLng: 121.9,
};

/**
 * 手動修正已知的錯誤座標
 * 這些座標是透過 Google Maps 查詢地址得到的正確值
 */
const MANUAL_FIXES: Record<string, { latitude: number; longitude: number; source: string }> = {
  // 東暘旅店 - 新北市三重區成功路97號
  '007a1fba-3796-4215-ad39-de7c354be331': {
    latitude: 25.0625,
    longitude: 121.4856,
    source: 'manual_correction',
  },
  // 和旅瓏旅館西門館 - 臺北市萬華區西寧南路105號
  '1fcb74d6-3ba5-4702-b2b1-8a832955b686': {
    latitude: 25.0430,
    longitude: 121.5074,
    source: 'manual_correction',
  },
};

async function main() {
  console.log('🔍 檢查離群值座標...\n');

  // 1. 查找超出雙北市範圍的場所
  const outliers = await prisma.place.findMany({
    where: {
      OR: [
        { latitude: { lt: SHUANGBEI_BOUNDS.minLat } },
        { latitude: { gt: SHUANGBEI_BOUNDS.maxLat } },
        { longitude: { lt: SHUANGBEI_BOUNDS.minLng } },
        { longitude: { gt: SHUANGBEI_BOUNDS.maxLng } },
      ],
    },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

  console.log(`📊 找到 ${outliers.length} 筆離群值資料:\n`);

  for (const place of outliers) {
    console.log(`  ❌ ${place.name}`);
    console.log(`     地址: ${place.address}`);
    console.log(`     當前座標: (${place.latitude}, ${place.longitude})`);
    console.log(`     ID: ${place.id}\n`);
  }

  // 2. 應用手動修正
  console.log('\n🔧 開始修正座標...\n');

  let fixedCount = 0;
  let skippedCount = 0;

  for (const place of outliers) {
    const fix = MANUAL_FIXES[place.id];

    if (fix) {
      console.log(`  ✅ 修正: ${place.name}`);
      console.log(`     舊座標: (${place.latitude}, ${place.longitude})`);
      console.log(`     新座標: (${fix.latitude}, ${fix.longitude})`);

      await prisma.place.update({
        where: { id: place.id },
        data: {
          latitude: fix.latitude,
          longitude: fix.longitude,
          source: fix.source,
        },
      });

      fixedCount++;
      console.log(`     ✓ 已更新\n`);
    } else {
      console.log(`  ⚠️  跳過: ${place.name} (無修正資料)`);
      console.log(`     需要手動查詢正確座標\n`);
      skippedCount++;
    }
  }

  // 3. 驗證修正結果
  console.log('\n📈 修正統計:');
  console.log(`  ✅ 已修正: ${fixedCount} 筆`);
  console.log(`  ⚠️  跳過: ${skippedCount} 筆`);

  // 4. 再次檢查是否還有離群值
  const remainingOutliers = await prisma.place.count({
    where: {
      OR: [
        { latitude: { lt: SHUANGBEI_BOUNDS.minLat } },
        { latitude: { gt: SHUANGBEI_BOUNDS.maxLat } },
        { longitude: { lt: SHUANGBEI_BOUNDS.minLng } },
        { longitude: { gt: SHUANGBEI_BOUNDS.maxLng } },
      ],
    },
  });

  console.log(`  📍 剩餘離群值: ${remainingOutliers} 筆\n`);

  if (remainingOutliers === 0) {
    console.log('✨ 所有離群值已修正完成!\n');
  } else {
    console.log('⚠️  仍有部分離群值需要手動處理\n');
  }

  // 5. 顯示修正後的座標範圍
  const stats = await prisma.place.aggregate({
    _min: { latitude: true, longitude: true },
    _max: { latitude: true, longitude: true },
  });

  console.log('📊 修正後的座標範圍:');
  console.log(`  緯度: ${stats._min.latitude} ~ ${stats._max.latitude}`);
  console.log(`  經度: ${stats._min.longitude} ~ ${stats._max.longitude}\n`);
}

main()
  .catch((error) => {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
