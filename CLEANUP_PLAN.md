# 🧹 專案清理計劃

## 用戶需求
1. ❌ 移除所有 Google Maps API 相關功能
2. ❌ 移除所有登入/註冊相關功能
3. ✅ 保留 Leaflet + OpenStreetMap（免費地圖）
4. ✅ 保留場所資料展示功能（不需登入即可查看）

---

## 需要刪除的內容

### 後端 (Backend)

#### 1. 刪除整個認證模組
- [ ] `backend/src/auth/` 整個目錄
  - auth/routes.ts
  - auth/service.ts
  - auth/middleware.ts

#### 2. 刪除 Google Maps 模組
- [x] `backend/src/maps/` 整個目錄

#### 3. 更新主程式
- [ ] `backend/src/index.ts`
  - 移除 `import authRoutes`
  - 移除 `app.use('/auth', authRoutes)`

#### 4. 更新 places 模組
- [x] `backend/src/places/service.ts`
  - 移除 geocoding 邏輯
- [ ] `backend/src/places/routes.ts`
  - 移除 `authenticateToken` middleware
  - 移除 POST/PATCH/DELETE 端點（不允許新增/編輯）
  - 只保留 GET 端點（查看場所）

#### 5. 刪除其他需要認證的模組
- [ ] `backend/src/reviews/` - 評論系統（需登入）
- [ ] `backend/src/reports/` - 舉報系統（需登入）
- [ ] `backend/src/routes/favorites/` - 收藏功能（需登入）

#### 6. 更新資料庫 Schema
- [ ] `backend/prisma/schema.prisma`
  - 保留 User model（因為舊資料可能有 createdBy）
  - 刪除 Review, Report, Favorite models
  - 移除 Place 的關聯（reviews, reports, favorites）

#### 7. 更新依賴套件
- [x] `backend/package.json`
  - 移除 `@googlemaps/google-maps-services-js`
  - 移除 `bcrypt` 和 `@types/bcrypt`（認證用）
  - 移除 `jsonwebtoken` 和 `@types/jsonwebtoken`（認證用）

---

### 前端 (Frontend)

#### 1. 刪除認證相關頁面
- [ ] `frontend/app/auth/` 整個目錄
  - 登入頁面
  - 註冊頁面

#### 2. 刪除需要認證的場所操作
- [ ] `frontend/app/places/new/` - 新增場所頁面
- [ ] `frontend/app/places/edit/` - 編輯場所頁面

#### 3. 刪除舊的 Google Maps 元件
- [x] `frontend/components/places/PlaceMap.tsx.backup`
- [x] `frontend/components/places/MapSearchBar.tsx`

#### 4. 更新主要元件
- [ ] `frontend/components/places/PlaceDetailPanel.tsx`
  - 移除編輯/刪除按鈕
- [ ] `frontend/app/places/page.tsx`
  - 移除「新增場所」按鈕

#### 5. 更新 API 客戶端
- [ ] `frontend/lib/api.ts`
  - 移除 auth 相關 API 呼叫
  - 移除需要 token 的 places CRUD 操作

#### 6. 更新依賴套件
- [x] `frontend/package.json`
  - 移除 `@types/google.maps`

---

### 文檔

#### 1. 更新 README.md
- [ ] 移除 Google Maps API 設定說明
- [ ] 移除登入/註冊說明
- [ ] 移除認證相關 API 文檔
- [ ] 更新為「純展示型地圖」說明

#### 2. 更新環境變數範例
- [x] `backend/.env.example` - 移除 Google Maps API Key
- [x] `frontend/.env.example` - 移除 Google Maps API Key

---

## 清理後的專案架構

### 後端功能
```
✅ GET /health                     - 健康檢查
✅ GET /api/places                 - 取得場所列表（支援篩選）
✅ GET /api/places/:id             - 取得單一場所
✅ GET /api/places/stats/cities    - 城市統計
✅ GET /api/places/ntu             - NTU 區域場所
❌ POST /api/places                - 刪除（需登入）
❌ PATCH /api/places/:id           - 刪除（需登入）
❌ DELETE /api/places/:id          - 刪除（需登入）
❌ /auth/*                         - 刪除（整個認證模組）
❌ /api/reviews/*                  - 刪除（需登入）
❌ /api/reports/*                  - 刪除（需登入）
❌ /api/favorites/*                - 刪除（需登入）
```

### 前端功能
```
✅ /                               - 首頁（顯示統計）
✅ /places                         - 場所地圖頁面（Leaflet）
✅ /places/:id                     - 場所詳細頁面
❌ /auth/login                     - 刪除
❌ /auth/register                  - 刪除
❌ /places/new                     - 刪除
❌ /places/edit/:id                - 刪除
```

### 資料庫 Schema（簡化）
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  places    Place[]  // 保留關聯（舊資料用）
}

model Place {
  id                 String   @id @default(uuid())
  name               String
  type               String
  address            String?
  latitude           Float
  longitude          Float
  googlePlaceId      String?  // 保留（舊資料可能有）
  googleRating       Float?   // 保留（舊資料可能有）
  googleRatingsTotal Int?
  googlePriceLevel   Int?
  privacyTags        String?
  source             String   @default("import")
  createdBy          String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  creator User? @relation(fields: [createdBy], references: [id])

  @@index([latitude, longitude])
  @@index([type])
}
```

---

## 執行順序

1. ✅ 刪除 Google Maps 模組與依賴
2. ⏳ 刪除認證模組與依賴
3. ⏳ 刪除評論/舉報/收藏模組
4. ⏳ 更新 places routes（移除 auth middleware）
5. ⏳ 更新 Prisma schema
6. ⏳ 更新前端（移除登入/註冊頁面）
7. ⏳ 更新 README.md
8. ⏳ 測試所有功能

---

**是否繼續執行清理？請確認！**
