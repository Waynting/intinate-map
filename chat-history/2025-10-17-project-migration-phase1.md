# 專案遷移進度報告 - Phase 1
**日期**: 2025-10-17
**專案**: 從「台北夜景攝影點」遷移至「Intimate Spaces Taipei (台北性空間地圖)」
**作業**: WP1141 Hw4

---

## 📋 遷移概述

### 原專案 (Night Photo Spots)
- **主題**: 台北夜景攝影景點分享平台
- **資料模型**: User, Spot
- **核心功能**: 景點 CRUD、地圖顯示、基本搜尋

### 新專案 (Intimate Spaces Taipei)
- **主題**: 台北私密空間地圖（旅館/汽旅/短時房）
- **資料模型**: User, Place, Review, Report
- **核心功能**: 場所 CRUD、評論系統、舉報機制、Google Places 整合、進階篩選

---

## ✅ Phase 1 完成項目

### 1. 資料庫 Schema 重構 (Prisma)

**檔案**: `backend/prisma/schema.prisma`

#### 變更摘要
- ✅ User model 擴充
  - 新增 `role` 欄位 (user | admin | moderator)
  - 新增與 Place, Review, Report 的關聯

- ✅ Spot model → Place model (完全替換)
  - 移除: title, category, bestTime, lensHint, accessNote, isPublic
  - 新增: name, type, googlePlaceId, googleRating, googleRatingsTotal, googlePriceLevel, privacyTags
  - 保留: latitude, longitude, address, createdBy, createdAt, updatedAt

- ✅ Review model (全新)
  - placeId, userId, rating (1-5), content, tags, isAnonymous
  - 支援匿名評論（預設開啟）
  - JSON tags: ["clean", "quiet", "safe", "friendly_staff", "value"]

- ✅ Report model (全新)
  - placeId, reviewId, userId, type, payload, status
  - type: data_fix | abuse | safety
  - status: open | resolved | rejected

#### 索引設計
```prisma
// Places
@@index([latitude, longitude])  // 地理搜尋
@@index([type])                  // 類型篩選
@@index([googleRating])          // 評分排序
@@index([googlePriceLevel])      // 價位篩選

// Reviews
@@index([placeId])               // 查詢特定場所的評論
@@index([userId])                // 查詢使用者的評論

// Reports
@@index([status])                // 審核工作流程
@@index([type])                  // 舉報類型篩選
```

---

### 2. TypeScript 型別系統重構

**檔案**: `backend/src/types.ts`

#### 新增型別定義

**Auth Types**
```typescript
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;  // 新增 role
  };
}

export type UserRole = 'user' | 'admin' | 'moderator';
```

**Place Types**
```typescript
export type PlaceType = 'hotel' | 'motel' | 'short_stay';
export type PlaceSource = 'taipei-open-data' | 'user' | 'system';
export type PrivacyTag =
  | 'self_checkin' | 'soundproof' | 'garage'
  | 'cash_only' | 'kiosk' | 'hourly_rate'
  | 'no_id_required' | 'parking_inside';
```

**Review Types**
```typescript
export type ReviewTag =
  | 'clean' | 'quiet' | 'safe'
  | 'friendly_staff' | 'value' | 'privacy'
  | 'comfortable' | 'spacious';
```

**Report Types**
```typescript
export type ReportType = 'data_fix' | 'abuse' | 'safety';
export type ReportStatus = 'open' | 'resolved' | 'rejected';

export interface ReportPayload {
  reason: string;
  description?: string;
  suggestedFix?: {
    name?: string;
    address?: string;
    type?: PlaceType;
    latitude?: number;
    longitude?: number;
  };
}
```

**Google Places API Types**
```typescript
export interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number; } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number; } };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { ... };
  formatted_phone_number?: string;
  website?: string;
}
```

**Filter Types**
```typescript
export interface PlaceFilters {
  type?: PlaceType;
  lat?: number;
  lng?: number;
  radius?: number;        // in meters
  minRating?: number;
  maxPriceLevel?: number;
  q?: string;            // search query
  boundsNE?: { lat: number; lng: number };
  boundsSW?: { lat: number; lng: number };
  limit?: number;
  offset?: number;
}
```

---

### 3. 內容審核系統

**重要功能**: `moderateContent(text: string)` 函數

#### 審核規則
```typescript
export const CONTENT_MODERATION_PATTERNS = [
  // 露骨性內容
  /性交/gi, /做愛/gi, /\b(?:sex|fuck|porn)\b/gi,

  // 人身攻擊
  /垃圾/gi, /白癡/gi, /智障/gi,

  // 聯絡資訊（防止垃圾訊息）
  /\d{10,}/g,  // 10位以上數字（電話/身分證）
  /line\s*[:：]?\s*\w+/gi,
  /wechat\s*[:：]?\s*\w+/gi,

  // 價格資訊（OTA 政策合規）
  /\$\d+/g,
  /NT\$?\d+/gi,
  /元\d+|價格?\d+/gi,
];
```

#### 長度限制
- 評論內容最多 1000 字元

#### 使用範例
```typescript
const result = moderateContent(reviewContent);
if (!result.isAllowed) {
  return res.status(422).json({
    error: 'Content not allowed',
    reasons: result.reasons,
  });
}
```

---

## 🔄 資料遷移計劃

### 資料庫遷移步驟

1. **清空現有資料庫**
   ```bash
   cd backend
   rm -f dev.db dev.db-journal
   ```

2. **生成新的 Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **建立新的 migration**
   ```bash
   npx prisma migrate dev --name init_intimate_spaces
   ```

4. **驗證 schema**
   ```bash
   npx prisma studio  # 檢查資料表結構
   ```

### 舊資料處理
- ❌ **不保留** Spot 資料（專案主題完全不同）
- ✅ **保留** User 資料（email, passwordHash）
- ⚠️ **需手動遷移** role 欄位（全部設為 'user'）

---

## 📝 待辦事項 (Phase 2-5)

### Phase 2: 後端服務實作
- [ ] 更新 `backend/src/maps/google.ts`
  - [ ] 新增 `textSearch()` - Places Text Search API
  - [ ] 新增 `placeDetails()` - Place Details API
  - [ ] 新增節流機制（throttle/rate limit）

- [ ] 刪除 `backend/src/spots/*`

- [ ] 建立 `backend/src/places/service.ts`
  - [ ] createPlace (含 Geocoding + Places 配對)
  - [ ] listPlaces (支援進階篩選)
  - [ ] getPlace
  - [ ] updatePlace (owner/admin only)
  - [ ] deletePlace (owner/admin only)

- [ ] 建立 `backend/src/places/routes.ts`
  - [ ] GET /api/places (含完整篩選參數)
  - [ ] GET /api/places/:id
  - [ ] POST /api/places (需 JWT)
  - [ ] PATCH /api/places/:id (需 JWT + 權限)
  - [ ] DELETE /api/places/:id (需 JWT + 權限)

- [ ] 建立 `backend/src/reviews/service.ts`
  - [ ] createReview (含內容審核)
  - [ ] getReviewsByPlace
  - [ ] deleteReview (作者或 admin)

- [ ] 建立 `backend/src/reviews/routes.ts`
  - [ ] GET /api/places/:id/reviews
  - [ ] POST /api/places/:id/reviews (需 JWT)
  - [ ] DELETE /api/reviews/:id (需 JWT + 權限)

- [ ] 建立 `backend/src/reports/service.ts`
  - [ ] createReport
  - [ ] updateReportStatus (moderator/admin only)
  - [ ] listReports (moderator/admin only)

- [ ] 建立 `backend/src/reports/routes.ts`
  - [ ] POST /api/reports (需 JWT)
  - [ ] PATCH /api/reports/:id (需 moderator/admin)
  - [ ] GET /api/reports (需 moderator/admin)

- [ ] 更新 `backend/src/index.ts`
  - [ ] 移除 spotsRoutes
  - [ ] 新增 placesRoutes, reviewsRoutes, reportsRoutes

### Phase 3: 資料匯入腳本
- [ ] `backend/scripts/ingest-open-data.ts`
  - [ ] 讀取台北市旅館登記 CSV/JSON
  - [ ] 正規化名稱（去括號、全半形轉換）
  - [ ] Geocoding 補全座標
  - [ ] INSERT OR IGNORE 寫入資料庫

- [ ] `backend/scripts/enrich-places.ts`
  - [ ] 對無 google_place_id 的 Place
  - [ ] 呼叫 Text Search API 配對
  - [ ] 呼叫 Place Details API 取得 rating/price_level
  - [ ] 節流控制（150ms/request）
  - [ ] 錯誤處理與重試

### Phase 4: 前端改造
- [ ] 更新 `frontend/lib/api.ts`
  - [ ] placesApi (取代 spotsApi)
  - [ ] reviewsApi (全新)
  - [ ] reportsApi (全新)

- [ ] 刪除 `frontend/components/spots/*`

- [ ] 建立 `frontend/components/places/*`
  - [ ] PlaceCard.tsx
  - [ ] PlaceForm.tsx (含 privacy tags 選擇器)
  - [ ] PlaceFilters.tsx (type, rating, price_level, radius)

- [ ] 建立 `frontend/components/reviews/*`
  - [ ] ReviewList.tsx
  - [ ] ReviewForm.tsx (rating, content, tags, anonymous toggle)

- [ ] 建立 `frontend/components/reports/*`
  - [ ] ReportDialog.tsx

- [ ] 更新 `frontend/components/GoogleMap.tsx`
  - [ ] 實作點地圖新增 Place 功能
  - [ ] 拖曳修正座標功能
  - [ ] Cluster 標記點

- [ ] 更新 `frontend/app/spots/page.tsx` → `frontend/app/map/page.tsx`
  - [ ] 更新為 Place 相關邏輯
  - [ ] 整合新的篩選器

- [ ] 建立 `frontend/app/places/[id]/page.tsx`
  - [ ] Place 詳情頁
  - [ ] Reviews 列表與新增
  - [ ] Report 按鈕

- [ ] 刪除 `frontend/app/spots/new/page.tsx`
- [ ] 刪除 `frontend/app/spots/edit/[id]/page.tsx`

### Phase 5: 文件更新
- [ ] README.md - 完全重寫
- [ ] SETUP.md - 更新設定步驟
- [ ] 新增 COMPLIANCE.md - 合規說明
- [ ] 新增 DATA_SOURCES.md - 資料來源說明

---

## 🔐 合規與安全考量

### 已實作
✅ 內容審核系統（moderateContent）
✅ 匿名評論支援
✅ 舉報機制資料模型
✅ 不儲存即時價格（只用 Google price_level 0-4）

### 待實作
⚠️ Rate limiting (API 層)
⚠️ CSRF protection
⚠️ EXIF 去除（圖片上傳時）
⚠️ Admin/Moderator 審核介面

---

## 📊 資料來源規劃

### 合規資料來源
1. **台北市旅館登記開放資料** (政府資料開放平台)
   - 欄位: 名稱、地址、電話、營業許可字號
   - 授權: 政府資料開放授權條款

2. **Google Places API** (官方 API)
   - Text Search: 配對 place_id
   - Place Details: rating, user_ratings_total, price_level
   - 授權: Google Maps Platform 服務條款

### 禁止來源
❌ OTA 網站爬蟲（Agoda, Booking.com, Google Maps 頁面）
❌ 即時動態價格資訊
❌ 未授權的第三方資料庫

---

## 🎯 下一步行動

### 立即執行
1. Commit Phase 1 變更
2. 執行資料庫 migration
3. 開始實作 Phase 2（後端服務）

### 優先順序
**P0 (必須)**: Places service, Reviews service
**P1 (重要)**: Google Places 整合, 資料匯入腳本
**P2 (增強)**: Reports service, Admin 介面

---

## 📈 進度追蹤

- [x] Phase 1: 資料庫 Schema 重構
- [x] Phase 1: TypeScript 型別系統
- [x] Phase 1: 內容審核系統
- [ ] Phase 2: 後端服務實作 (0%)
- [ ] Phase 3: 資料匯入腳本 (0%)
- [ ] Phase 4: 前端改造 (0%)
- [ ] Phase 5: 文件更新 (0%)

**整體完成度**: ~15%

---

## 📞 技術決策記錄

### 為何選擇 SQLite？
- ✅ 符合作業要求
- ✅ 簡單部署（單一檔案）
- ✅ 足夠的效能（<10k records）
- ⚠️ 生產環境建議升級至 PostgreSQL

### 為何使用 JSON 欄位儲存 tags？
- ✅ Schema 彈性（tags 可能變動）
- ✅ 避免多對多關聯表的複雜度
- ⚠️ 無法用 SQL 直接篩選 tags（需應用層處理）

### Google Places API 配額管理
- Text Search: $32/1000 requests
- Place Details: $17/1000 requests
- 策略:
  - 本地快取 place_id 配對結果
  - 批次處理時節流（150ms/request）
  - 失敗重試機制（指數退避）

---

**文件建立時間**: 2025-10-17
**下次更新**: Phase 2 完成後
