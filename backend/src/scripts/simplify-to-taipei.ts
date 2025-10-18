#!/usr/bin/env tsx
/**
 * 簡化資料集腳本 - 只保留雙北市（台北市 + 新北市）
 * 執行: cd backend && npx tsx src/scripts/simplify-to-taipei.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 資料簡化腳本 - 保留雙北市場所\n');
  console.log('=' .repeat(60));

  // Step 1: 分析當前資料
  console.log('\n📊 Step 1: 分析當前資料庫狀態...\n');

  const allPlaces = await prisma.place.findMany({
    where: {
      address: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      address: true,
    },
  });

  console.log(`總場所數: ${allPlaces.length.toLocaleString()}`);

  // 統計各城市數量
  const cityCounts: Record<string, number> = {};
  allPlaces.forEach((place) => {
    if (place.address) {
      const city = place.address.substring(0, 3);
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    }
  });

  console.log('\n各城市場所分布:');
  Object.entries(cityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([city, count]) => {
      console.log(`  ${city}: ${count.toLocaleString()}`);
    });

  // Step 2: 計算雙北市數量
  console.log('\n📍 Step 2: 雙北市場所統計...\n');

  const taipeiPlaces = allPlaces.filter(
    (p) => p.address?.startsWith('臺北市') || p.address?.startsWith('台北市')
  );
  const newTaipeiPlaces = allPlaces.filter((p) => p.address?.startsWith('新北市'));

  console.log(`台北市場所: ${taipeiPlaces.length.toLocaleString()}`);
  console.log(`新北市場所: ${newTaipeiPlaces.length.toLocaleString()}`);
  console.log(`雙北市總計: ${(taipeiPlaces.length + newTaipeiPlaces.length).toLocaleString()}`);

  // Step 3: 確認刪除
  const toDelete = allPlaces.length - taipeiPlaces.length - newTaipeiPlaces.length;
  console.log(`\n⚠️  將刪除場所: ${toDelete.toLocaleString()} 個`);

  // 等待確認（自動執行）
  console.log('\n⏳ 3秒後開始刪除...');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 4: 備份資料庫
  console.log('\n💾 Step 3: 備份資料庫...');
  const fs = await import('fs');
  const path = await import('path');

  const dbPath = path.join(__dirname, '../../prisma/dev.db');
  const backupPath = path.join(
    __dirname,
    '../../prisma',
    `dev.db.backup-${new Date().toISOString().replace(/:/g, '-')}`
  );

  fs.copyFileSync(dbPath, backupPath);
  console.log(`✅ 備份完成: ${path.basename(backupPath)}`);

  // Step 5: 刪除非雙北市場所
  console.log('\n🗑️  Step 4: 刪除非雙北市場所...\n');

  const deleteResult = await prisma.place.deleteMany({
    where: {
      AND: [
        {
          address: {
            not: null,
          },
        },
        {
          NOT: [
            { address: { startsWith: '臺北市' } },
            { address: { startsWith: '台北市' } },
            { address: { startsWith: '新北市' } },
          ],
        },
      ],
    },
  });

  console.log(`✅ 已刪除 ${deleteResult.count.toLocaleString()} 個場所`);

  // Step 6: 驗證結果
  console.log('\n✅ Step 5: 驗證結果...\n');

  const remainingPlaces = await prisma.place.count();
  const remainingWithAddress = await prisma.place.count({
    where: {
      address: {
        not: null,
      },
    },
  });

  console.log(`保留場所總數: ${remainingPlaces.toLocaleString()}`);
  console.log(`有地址的場所: ${remainingWithAddress.toLocaleString()}`);

  // 再次統計城市分布
  const remainingByCity = await prisma.place.findMany({
    where: {
      address: {
        not: null,
      },
    },
    select: {
      address: true,
    },
  });

  const finalCityCounts: Record<string, number> = {};
  remainingByCity.forEach((place) => {
    if (place.address) {
      const city = place.address.substring(0, 3);
      finalCityCounts[city] = (finalCityCounts[city] || 0) + 1;
    }
  });

  console.log('\n最終城市分布:');
  Object.entries(finalCityCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([city, count]) => {
      console.log(`  ${city}: ${count.toLocaleString()}`);
    });

  // Step 7: 清理相關資料
  console.log('\n🧹 Step 6: 清理孤立的評論和收藏...\n');

  // 獲取所有現存的 place IDs
  const existingPlaceIds = await prisma.place.findMany({
    select: { id: true },
  });
  const existingIds = new Set(existingPlaceIds.map((p) => p.id));

  // 刪除孤立的評論
  const orphanedReviews = await prisma.review.findMany({
    select: { id: true, placeId: true },
  });

  const reviewsToDelete = orphanedReviews.filter(
    (r) => !existingIds.has(r.placeId)
  );

  if (reviewsToDelete.length > 0) {
    const deletedReviews = await prisma.review.deleteMany({
      where: {
        id: {
          in: reviewsToDelete.map((r) => r.id),
        },
      },
    });
    console.log(`✅ 刪除 ${deletedReviews.count.toLocaleString()} 個孤立評論`);
  } else {
    console.log('✅ 沒有孤立評論需要刪除');
  }

  // 刪除孤立的收藏
  const orphanedFavorites = await prisma.favorite.findMany({
    select: { id: true, placeId: true },
  });

  const favoritesToDelete = orphanedFavorites.filter(
    (f) => !existingIds.has(f.placeId)
  );

  if (favoritesToDelete.length > 0) {
    const deletedFavorites = await prisma.favorite.deleteMany({
      where: {
        id: {
          in: favoritesToDelete.map((f) => f.id),
        },
      },
    });
    console.log(`✅ 刪除 ${deletedFavorites.count.toLocaleString()} 個孤立收藏`);
  } else {
    console.log('✅ 沒有孤立收藏需要刪除');
  }

  // 刪除孤立的舉報
  const orphanedReports = await prisma.report.findMany({
    select: { id: true, placeId: true },
  });

  const reportsToDelete = orphanedReports.filter(
    (r) => r.placeId && !existingIds.has(r.placeId)
  );

  if (reportsToDelete.length > 0) {
    const deletedReports = await prisma.report.deleteMany({
      where: {
        id: {
          in: reportsToDelete.map((r) => r.id),
        },
      },
    });
    console.log(`✅ 刪除 ${deletedReports.count.toLocaleString()} 個孤立舉報`);
  } else {
    console.log('✅ 沒有孤立舉報需要刪除');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 資料簡化完成！\n');
  console.log('📋 摘要:');
  console.log(`  原始場所數: ${allPlaces.length.toLocaleString()}`);
  console.log(`  保留場所數: ${remainingPlaces.toLocaleString()}`);
  console.log(`  刪除場所數: ${deleteResult.count.toLocaleString()}`);
  console.log(`  台北市: ${finalCityCounts['臺北市'] || finalCityCounts['台北市'] || 0}`);
  console.log(`  新北市: ${finalCityCounts['新北市'] || 0}`);
  console.log(`  備份檔案: ${path.basename(backupPath)}\n`);
}

main()
  .catch((error) => {
    console.error('❌ 錯誤:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
