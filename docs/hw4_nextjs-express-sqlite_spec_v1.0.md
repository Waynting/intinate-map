
# HW4：地圖功能導向全端應用（**Next.js + shadcn / Express + SQLite**）技術說明
Version: v1.0 • Date: 2025-10-17 (Asia/Taipei)

> 本文件將「作業說明」轉換為你的指定技術棧：**前端 Next.js 15 + Tailwind + shadcn/ui**、**後端 Node.js + Express**、**資料庫 SQLite**，並提供可重現的架構、.env、DB Schema、API 規格、Google Maps（Geocoding）串接與測試流程。

---

## 目錄
1. TL;DR / 為何這樣拆
2. Repo 結構與技術棧
3. `.env.example`（前後端）
4. DB Schema（SQLite + Prisma 版 / 原生 SQL 版）
5. 後端 API 設計（Auth + Spots CRUD）
6. Google Maps（**Geocoding API**）整合：名稱｜功能｜範例應用
7. 前端頁面與互動（Next.js + shadcn）
8. 安全性與權限
9. 啟動與測試流程（含 cURL 範例 ≥ 5）
10. 已知風險與優化
11. Next 3 Actions

---

## 1) TL;DR / 為何這樣拆
- **前端**用 **Next.js 15（App Router）** + **shadcn/ui**，提供地圖頁、登入頁與 Spot 表單；直接載入 **Google Maps JavaScript API**。
- **後端**使用 **Node.js + Express** 提供 REST API：`/auth/*` 與 `/api/spots/*`；**伺服器端**串 **Geocoding API**（地址↔座標），把結果與 Spot 一起存入 **SQLite**。
- **分離式**好處：開發/測試清楚、CORS 設定明確、Google Server Key 僅在後端使用。

---

## 2) Repo 結構與技術棧
```
hw4/
├─ frontend/                    # Next.js 15 + shadcn/ui + Tailwind
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (app)/spots/page.tsx        # 地圖 + 清單
│  │  ├─ (app)/spots/new/page.tsx    # 新增 Spot 表單
│  │  └─ layout.tsx
│  ├─ components/ (Map, SpotCard, SpotForm, Header, ...)
│  ├─ lib/ (api client, zod schemas, utils)
│  ├─ styles/
│  ├─ .env.example
│  └─ package.json
└─ backend/                     # Express + SQLite (Prisma/或原生)
   ├─ src/
   │  ├─ index.ts               # app.listen + middlewares (CORS, JSON, cookie)
   │  ├─ auth/
   │  │  ├─ routes.ts           # /auth (register/login/logout)
   │  │  └─ service.ts          # hash, JWT, guards
   │  ├─ spots/
   │  │  ├─ routes.ts           # /api/spots CRUD
   │  │  └─ service.ts          # geocoding + db
   │  ├─ maps/google.ts         # Geocoding client
   │  ├─ db/
   │  │  ├─ prisma.ts           # Prisma client (選擇 Prisma 方案時)
   │  │  └─ sql.ts              # 原生 sql 工具（若不使用 Prisma）
   │  └─ types.ts
   ├─ prisma/schema.prisma      # (Prisma 版)
   ├─ .env.example
   └─ package.json
```

**主要套件**
- 前端：`next`, `react`, `@googlemaps/js-api-loader`, `axios`, `zod`, `shadcn/ui`, `tailwindcss`
- 後端：`express`, `cors`, `dotenv`, `zod`, `bcrypt` 或 `argon2`, `jsonwebtoken`, `@googlemaps/google-maps-services-js`
- DB：`sqlite3` + （**建議**）`prisma`（型別/遷移更順手）

---

## 3) `.env.example`（前後端）

**frontend/.env.example**
```
# Maps JavaScript API（Browser Key；限制到 localhost:5173 或 next dev port）
NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=YOUR_BROWSER_KEY

# 後端 REST API base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

**backend/.env.example**
```
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173

# SQLite（Prisma）
DATABASE_URL="file:./dev.db"

# Auth（JWT）
JWT_SECRET=replace_me
JWT_EXPIRES_IN=7d

# Google Maps（Server Key；啟用 Geocoding）
GOOGLE_MAPS_SERVER_KEY=YOUR_SERVER_KEY
```

> **注意**：Server Key 請盡量做 IP 限制（本地可暫鬆綁，README 必須標註風險）。

---

## 4) DB Schema（SQLite）

### A) Prisma 版本（建議）
`backend/prisma/schema.prisma`
```prisma
datasource db { provider = "sqlite"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  spots        Spot[]
}

model Spot {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  description String?
  address     String?
  latitude    Float
  longitude   Float
  category    String   @default("skyline") // skyline/street/rooftop/reflection/landmark
  bestTime    String   @default("night")   // sunset/blue_hour/night/late_night
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([latitude, longitude])
  @@index([bestTime])
}
```

### B) 原生 SQL（選擇不用 Prisma 時）
```sql
create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  created_at text default (datetime('now'))
);

create table if not exists spots (
  id text primary key,
  user_id text not null,
  title text not null,
  description text,
  address text,
  latitude real not null,
  longitude real not null,
  category text default 'skyline',
  best_time text default 'night',
  created_at text default (datetime('now')),
  updated_at text default (datetime('now')),
  foreign key (user_id) references users(id) on delete cascade
);

create index if not exists idx_spots_latlng on spots(latitude, longitude);
create index if not exists idx_spots_best_time on spots(best_time);
```

---

## 5) 後端 API 設計（Auth + Spots CRUD）

### Auth
- `POST /auth/register`  
  **req**: `{ email, password }`  → 201；重複 email → 409  
- `POST /auth/login`  
  **req**: `{ email, password }`  → 200 `{ token }`（JWT）  
- `POST /auth/logout`（選做）  
  JWT 客戶端丟棄或黑名單策略（作業可省）

### Spots
- `GET /api/spots?q=&bestTime=&lat=&lng=&radius=` → 列表（可選關鍵字/時段/半徑過濾）
- `GET /api/spots/:id` → 單筆
- `POST /api/spots`（需 JWT）  
  **req**: `{ title, description?, address?, latitude?, longitude?, bestTime?, category? }`  
  **行為**：
  - 若 `address` 有值但沒座標 → 後端呼叫 **Geocoding** 取得 `lat/lng` 後存 DB。  
  - 若只有 `lat/lng` → 可選擇同時做 **Reverse Geocoding** 存 `address`。  
- `PATCH /api/spots/:id`（需 JWT；僅 owner 可改）  
  **req**: 任一欄位；如 address 改變 → 重新 Geocode。  
- `DELETE /api/spots/:id`（需 JWT；僅 owner）

**驗證**：Zod schema；錯誤碼：400/401/403/404/422/500。

---

## 6) Google Maps（Geocoding）整合

| 名稱 | 功能 | 範例應用 |
|---|---|---|
| **Geocoding API** | **地址 ↔ 經緯度 互相轉換** | 1) 使用者輸入「台北101」，**後端**轉成 `(25.033, 121.565)` 存入 DB。 2) **逆向地理編碼**：用 `(lat,lng)` 查地址，顯示於詳情頁或表單回填。 |

**套件**：`@googlemaps/google-maps-services-js`（伺服器端）  
`backend/src/maps/google.ts`
```ts
import { Client } from "@googlemaps/google-maps-services-js";

const client = new Client({});

export async function geocodeAddress(address: string) {
  const res = await client.geocode({
    params: { address, key: process.env.GOOGLE_MAPS_SERVER_KEY! }
  });
  const result = res.data.results[0];
  if (!result) return null;
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    formattedAddress: result.formatted_address
  };
}

export async function reverseGeocode(lat: number, lng: number) {
  const res = await client.reverseGeocode({
    params: { latlng: { lat, lng }, key: process.env.GOOGLE_MAPS_SERVER_KEY! }
  });
  const result = res.data.results[0];
  return result?.formatted_address ?? null;
}
```

**後端使用（建立 Spot 範例）**
```ts
// POST /api/spots
// 1) 若有 address 沒座標 → geocodeAddress()；2) 若有座標沒地址 → reverseGeocode()
```

---

## 7) 前端頁面與互動（Next.js + shadcn）

- `/login`：Email/Password；成功後儲存 JWT（localStorage）→ Axios 攜帶 `Authorization: Bearer <token>`。
- `/spots`：地圖 + 卡片清單  
  - **地圖互動**：點地圖產生「新增 Spot」Dialog（座標自帶），或在搜尋列輸入地址 → 打後端 geocode → 地圖定位。  
  - 篩選：`bestTime`、關鍵字。  
- `/spots/new`：表單（title, address 或 lat/lng, bestTime, category, description）。

**UI**：shadcn Card/Form/Dialog/Toaster；`@googlemaps/js-api-loader` 載入 Map，Marker 可拖曳更新座標（呼叫 PATCH）。

---

## 8) 安全性與權限
- 密碼 **bcrypt/argon2** 雜湊；JWT（`Authorization: Bearer`）。
- CORS：允許 `http://localhost:3000`（Next dev）與 `http://127.0.0.1:5173`（如需）。
- 權限：僅 owner 可 `PATCH/DELETE` 自己的 Spot。

---

## 9) 啟動與測試流程（含 cURL 範例）
### 啟動
```bash
# backend
cd backend
npm i
npx prisma migrate dev --name init   # 若用 Prisma
npm run dev

# frontend
cd ../frontend
npm i
npm run dev
```

### cURL / httpie 範例（≥ 5）
1) 註冊
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"pass1234"}'
```

2) 登入（取得 token）
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"me@example.com","password":"pass1234"}'
# 回傳: { "token": "..." }
```

3) 建立 Spot（**僅地址**，後端 geocode）
```bash
TOKEN=... # 上一步取得
curl -X POST http://localhost:3000/api/spots \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"台北101平台","address":"台北市信義區信義路五段7號","bestTime":"blue_hour"}'
# 預期：DB 會存下 geocode 後的 latitude/longitude 與 formattedAddress
```

4) 建立 Spot（**僅座標**，後端 reverse geocode）
```bash
curl -X POST http://localhost:3000/api/spots \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"象山六巨石","latitude":25.0260,"longitude":121.5709,"bestTime":"night"}'
# 預期：DB 將自動補上 address（若取得到）
```

5) 查詢列表（半徑 1km + 時段）
```bash
curl "http://localhost:3000/api/spots?lat=25.033&lng=121.565&radius=1000&bestTime=blue_hour"
```

6) 更新 Spot（拖曳後 PATCH 座標 → 後端自動 reverse geocode）
```bash
curl -X PATCH http://localhost:3000/api/spots/<spotId> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"latitude":25.0272,"longitude":121.5704}'
```

7) 刪除 Spot
```bash
curl -X DELETE http://localhost:3000/api/spots/<spotId> \
  -H "Authorization: Bearer $TOKEN"
```

---

## 10) 已知風險與優化
- Geocoding 需計費（有免費額度），Server Key 請加 IP 限制；注意錯誤重試與配額保護。
- 逆向地理編碼在小徑/山林可能回傳較遠地址；可允許使用者手動覆寫。
- 清洗輸入（address/座標）與錯誤碼對齊（422/400）。

---

## 11) Next 3 Actions
1. 建立 `backend`（Express + Prisma + SQLite），實作 `/auth` 與 `/api/spots` 基本 CRUD。  
2. 接上 `@googlemaps/google-maps-services-js`，完成 `geocodeAddress` / `reverseGeocode`，串到 `POST/PATCH` 流程。  
3. 前端建立 `/spots`（地圖 + 表單）基本流程：**點地圖→開表單→送出→渲染新 Marker**。

---

> 補：若你想改用原生 SQL，不用 Prisma，也可沿用本文件的 API 規格與流程不變，只需替換資料層實作即可。
