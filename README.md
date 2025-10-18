# 雙北市私密空間地圖 🏨

純展示型的互動式地圖應用，提供雙北市（台北市與新北市）超過 1,100 個飯店、汽車旅館與民宿的查詢服務。無需登入，完全開放使用。

## 🎯 核心功能

- **互動式地圖查看** - 使用 Leaflet + OpenStreetMap 免費地圖服務
- **智能搜尋與篩選** - 依類型、城市、評分、價位快速定位
- **Google 商家評分整合** - 顯示真實的 Google 評價與評分
- **隱私特色標籤** - 標示自助入住、隔音良好等特色
- **台大周邊專區** - 快速查看台大總區、台大醫院、台北車站周邊旅宿

## 🏗️ 技術架構

### 技術棧

**前端:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Leaflet + OpenStreetMap (免費地圖)
- TanStack Query (資料快取)
- Axios + Zod

**後端:**
- Node.js + Express
- TypeScript
- Prisma ORM + SQLite/PostgreSQL
- Zod 資料驗證
- CORS 跨域支援

### 專案結構

```
intinate-map/
├── backend/
│   ├── src/
│   │   ├── places/          # 場所查詢 API
│   │   ├── types.ts         # TypeScript 類型定義
│   │   └── index.ts         # Express 應用入口
│   ├── prisma/
│   │   └── schema.prisma    # 資料庫 Schema
│   ├── .env.example         # 環境變數範本
│   └── package.json
│
└── frontend/
    ├── app/
    │   ├── places/          # 地圖與場所頁面
    │   ├── layout.tsx       # 根佈局
    │   └── page.tsx         # 首頁
    ├── components/
    │   ├── ui/              # shadcn/ui 元件
    │   └── places/          # 場所相關元件
    ├── lib/
    │   ├── api.ts           # API 客戶端
    │   └── utils.ts         # 工具函數
    ├── .env.example         # 環境變數範本
    └── package.json
```

## 🚀 快速開始

### 環境需求

- Node.js 18+ 與 npm
- 無需 API Key（使用免費的 OpenStreetMap）

### 後端設定

1. 進入後端目錄：
```bash
cd backend
```

2. 安裝依賴：
```bash
npm install
```

3. 建立環境變數檔案：
```bash
cp .env.example .env
```

4. 設定 `.env`：
```env
PORT=3000
CORS_ORIGINS=http://localhost:3001
DATABASE_URL="file:./dev.db"
```

5. 初始化資料庫並執行遷移：
```bash
npx prisma migrate dev --name init
```

6. （選用）匯入資料：
```bash
npm run db:seed
```

7. 啟動開發伺服器：
```bash
npm run dev
```

後端將執行於 `http://localhost:3000`

### 前端設定

1. 進入前端目錄：
```bash
cd frontend
```

2. 安裝依賴：
```bash
npm install
```

3. 建立環境變數檔案：
```bash
cp .env.example .env.local
```

4. 設定 `.env.local`：
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

5. 啟動開發伺服器：
```bash
npm run dev
```

前端將執行於 `http://localhost:3001`

## 📡 API 文件

### 場所端點（只讀）

#### GET `/api/places`
取得場所列表（支援篩選）

**查詢參數：**
- `type` (string): 場所類型 - hotel | motel | short_stay
- `city` (string): 城市名稱（如：臺北市、新北市）
- `q` (string): 搜尋關鍵字（名稱或地址）
- `minRating` (number): 最低評分（0-5）
- `maxPriceLevel` (number): 最高價位等級（0-4）
- `lat`, `lng`, `radius` (number): 半徑搜尋（米）
- `boundsNE_lat`, `boundsNE_lng`: 地圖視窗東北角座標
- `boundsSW_lat`, `boundsSW_lng`: 地圖視窗西南角座標
- `limit` (number): 回傳筆數上限（預設 2500）
- `offset` (number): 分頁偏移量

**回應範例 (200):**
```json
{
  "places": [
    {
      "id": "uuid",
      "name": "台北喜來登大飯店",
      "type": "hotel",
      "address": "臺北市中正區忠孝東路一段12號",
      "latitude": 25.0445,
      "longitude": 121.5213,
      "googlePlaceId": "ChIJ...",
      "googleRating": 4.3,
      "googleRatingsTotal": 2847,
      "googlePriceLevel": 3,
      "privacyTags": ["self_checkin", "soundproof"],
      "source": "google_maps",
      "createdAt": "2025-10-18T...",
      "updatedAt": "2025-10-18T...",
      "reviewCount": 0,
      "averageRating": null
    }
  ],
  "count": 1,
  "limit": 2500,
  "offset": 0
}
```

#### GET `/api/places/stats/cities`
取得城市統計資料

**回應範例 (200):**
```json
{
  "cities": [
    { "name": "臺北市", "count": 683 },
    { "name": "新北市", "count": 456 }
  ]
}
```

#### GET `/api/places/ntu`
取得台大周邊場所（台大總區、台大醫院、台北車站）

**查詢參數：** 同 `/api/places`

#### GET `/api/places/:id`
取得單一場所詳情

**回應範例 (200):**
```json
{
  "id": "uuid",
  "name": "台北喜來登大飯店",
  ...
}
```

## 🎨 前端功能

### 頁面

1. **首頁** (`/`)
   - 專案簡介
   - 快速連結：台大周邊地圖、雙北全區地圖
   - 場所統計資訊

2. **地圖頁面** (`/places`)
   - Leaflet 互動式地圖（使用 OpenStreetMap）
   - 場所標記聚合（Clustering）
   - 浮動搜尋列與篩選器
   - 點擊標記顯示詳細資訊
   - 台大周邊 / 雙北全區切換

3. **場所詳細頁面** (`/places/:id`)
   - 完整場所資訊
   - Google 評分與評論數
   - 導航連結（Google 地圖）

### 元件

- **LeafletMap** - Leaflet 互動式地圖，支援標記聚合
- **MapSearchBar** - 搜尋列與篩選按鈕
- **PlaceDetailPanel** - 場所詳細資訊面板
- **FilterDialog** - 進階篩選對話框
- **shadcn/ui** - Button, Input, Card, Select, Badge, Dialog 等 UI 元件

## 📊 資料庫 Schema

```prisma
model Place {
  id                  String    @id @default(uuid())
  name                String
  type                String    // hotel | motel | short_stay
  address             String?
  latitude            Float
  longitude           Float
  googlePlaceId       String?   @unique
  googleRating        Float?
  googleRatingsTotal  Int?
  googlePriceLevel    Int?      // 0-4
  privacyTags         String?   // JSON array
  source              String    @default("user")
  createdBy           String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@index([latitude, longitude])
  @@index([type])
}
```

## 🛠️ 開發指令

### 後端
```bash
npm run dev          # 啟動開發伺服器（含 watch 模式）
npm run build        # 編譯 TypeScript
npm run start        # 執行生產版本
npm run db:push      # 推送 Schema 變更
npm run db:migrate   # 建立遷移
npm run db:seed      # 匯入種子資料
npm run db:studio    # 開啟 Prisma Studio
```

### 前端
```bash
npm run dev          # 啟動 Next.js 開發伺服器
npm run build        # 建置生產版本
npm run start        # 啟動生產伺服器
npm run lint         # 執行 ESLint
```

## 🐛 疑難排解

### 地圖無法載入
- 檢查瀏覽器主控台是否有錯誤訊息
- 確認前端 API Base URL 設定正確
- 確認後端伺服器正在執行

### API 呼叫失敗
- 檢查後端 `.env` 中的 CORS_ORIGINS 是否包含前端網址
- 確認資料庫已正確初始化
- 查看後端主控台的錯誤訊息

### 資料庫錯誤
- 刪除 `dev.db` 並重新執行遷移
- 執行 `npx prisma generate` 重新產生 Prisma Client
- 確認 `.env` 中的 DATABASE_URL 正確

## 🚀 部署

### 推薦平台

- **Vercel** - 前端部署（免費）
- **Railway** / **Render** - 後端部署（免費方案）
- **Zeabur** - 全端部署（支援台灣節點）

### 環境變數設定

**後端：**
- `PORT` - 伺服器埠號
- `CORS_ORIGINS` - 允許的前端網址
- `DATABASE_URL` - 資料庫連線字串

**前端：**
- `NEXT_PUBLIC_API_BASE_URL` - 後端 API 網址

## 📝 授權

MIT

## 🙏 致謝

- OpenStreetMap 社群提供免費地圖圖資
- Google Maps Platform 提供商家評分資料
- Next.js、Prisma、Leaflet 等開源專案
- shadcn/ui 元件庫
