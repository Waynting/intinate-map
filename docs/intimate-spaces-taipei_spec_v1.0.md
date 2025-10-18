
# 台北性空間地圖（Intimate Spaces Taipei）— 技術企劃 v1.0
Date: 2025-10-17 • Stack: **Frontend** Next.js 15 + Tailwind + shadcn/ui • **Backend** Node.js + Express • **DB** SQLite • **Maps** Google Maps (JS + Geocoding + Places)

> 目標：打造一個聚焦「私密友善空間」的地圖型服務（例如：旅館/汽旅/短時房）。支援**登入、CRUD、評論/回饋、地圖互動（新增/拖曳/篩選）**。資料來源以**合規**為優先：**政府開放資料 → Google Places 富化（評分/價位等級）→ 使用者回報**。

---

## 1) TL;DR / Why now
- 市面資訊分散且缺乏「隱私標籤」與「真實回饋」。本專案聚焦：**可搜尋、可標記、可評論**。
- 技術練習：**Next.js/shadcn** UI、**Express + SQLite** 後端、**Google Maps/Places/Geocoding** 串接、**資料匯入腳本**、權限與合規。
- **合規策略**：不抓取違反網站條款的價格資訊；以**政府開放資料**與**Google Places 官方 API**為主，並開放使用者回報。

---

## 2) Scope
### v0（MVP 必要）
- 帳號：本地帳密登入（JWT）。
- 地圖：顯示點位（旅館/汽旅/短時房），**點地圖新增**與**拖曳修正座標**。
- CRUD：`Place`（建立/讀取/更新/刪除——僅擁有者或管理員可刪改），`Review`（新增/刪除自評）。
- 篩選：**類型**（hotel/motel/short-stay）、**Google price_level（0–4）**、**Google rating（1–5）**。
- 匯入：以**台北市旅館登記開放資料**（名稱/地址/電話/座標）為底稿 → 以 **Geocoding**（若缺座標）與 **Places Details**（rating/price_level）富化。

### v1（增強）
- 進階搜尋：半徑/地圖邊界、營業時間、付費/現金、是否有 kiosk、自助入住、隔音等**隱私標籤**。
- 排序：綜合評分（Google + 站內）、價位等級、距離。
- 舉報/修正：`Report`（錯誤資訊、歧視/騷擾回報）。
- 圖片：用戶上傳（**客戶端壓縮 + EXIF 去除**）。

### v2（進階）
- 行程規劃（多點路線、時間窗）
- 审核流程（moderator 工作台）
- AB 測試：不同排序策略對轉化的影響

**Out of scope（v0 不做）**：即時最低價（多數 OTA 嚴格限制）；色情/露骨內容（違規移除）。

---

## 3) User Stories / JTBD
- 我想搜尋附近的**短時房**並依**價位等級**與**評分**排序。
- 我想在地圖上**新增/編輯**一個店家，補上**隱私相關標籤**（如：自助入住/隔音/車庫直達）。
- 我想發表**匿名評論**，並可對評論按有用/沒用。
- 我想回報錯誤資訊或不當內容。

---

## 4) System Sketch
- **Frontend**（Next.js + shadcn）  
  Pages：`/login`、`/map`（主頁）`/places/[id]`（詳情+評論）`/admin`（審核 v1）  
  Components：`Map`, `PlaceCard`, `PlaceForm`, `Filters`, `ReviewList`  
- **Backend**（Express）  
  Routes：`/auth/*`、`/api/places/*`、`/api/reviews/*`、`/api/reports/*`、`/api/admin/*`  
  Jobs：`scripts/ingest-open-data.ts`、`scripts/enrich-places.ts`（Places API 配對/富化）  
- **DB**（SQLite）  
- **Maps/APIs**：Google Maps JS（前端地圖）、Geocoding + Places（後端富化）

---

## 5) Data Model（SQLite）
> 支援**官方評分**（Google）與**站內評分**（加權）。「價位」以 **Google price_level 0–4**（相對級距）為主，避免觸犯 OTA 條款。

```sql
-- users
create table if not exists users (
  id text primary key,
  email text unique not null,
  password_hash text not null,
  role text default 'user', -- user | admin | moderator
  created_at text default (datetime('now'))
);

-- places（核心）
create table if not exists places (
  id text primary key,
  name text not null,
  type text check (type in ('hotel','motel','short_stay')) not null,
  address text,
  latitude real not null,
  longitude real not null,
  google_place_id text,       -- 用於後續 Places 詳細資料拉取
  google_rating real,         -- 官方評分（平均）
  google_ratings_total int,
  google_price_level int,     -- 0–4（相對價位等級）
  privacy_tags text,          -- JSON: ["self_checkin","soundproof","garage","cash_only"]
  source text,                -- e.g., 'taipei-open-data'
  created_by text,            -- user id
  created_at text default (datetime('now')),
  updated_at text default (datetime('now'))
);

create index if not exists idx_places_latlng on places(latitude, longitude);
create index if not exists idx_places_type on places(type);
create index if not exists idx_places_rating on places(google_rating);
create index if not exists idx_places_price on places(google_price_level);

-- reviews（站內評論）
create table if not exists reviews (
  id text primary key,
  place_id text not null references places(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  rating int check (rating between 1 and 5) not null,
  content text,               -- 不得露骨/人身攻擊；後端審核
  tags text,                  -- JSON: ["clean","quiet","safe","friendly_staff"]
  is_anonymous int default 1, -- 1 = true
  created_at text default (datetime('now'))
);

-- reports（回報/舉報）
create table if not exists reports (
  id text primary key,
  place_id text,
  review_id text,
  user_id text,
  type text check (type in ('data_fix','abuse','safety')) not null,
  payload text,               -- JSON 詳述
  status text default 'open', -- open/resolved/rejected
  created_at text default (datetime('now')),
  updated_at text default (datetime('now'))
);
```

---

## 6) API 設計（Express, REST）
### Auth
- `POST /auth/register` → `{email,password}` → 201/409
- `POST /auth/login` → `{email,password}` → 200 `{token}`（JWT, HS256）

### Places
- `GET /api/places?type=&lat=&lng=&radius=&minRating=&maxPriceLevel=&q=`  
  支援半徑/邊界（可選 boundsNE/boundsSW）、關鍵字（name/address）。
- `GET /api/places/:id`
- `POST /api/places`（需 JWT）  
  Body（至少其一）：`{ name, type, address? OR (latitude,longitude), privacy_tags? }`  
  行為：
  1) 若有 address 缺座標 → **Geocoding** 取 lat/lng。  
  2) 用 name+address 呼叫 **Places Text Search** 嘗試對齊 `google_place_id`，再 **Places Details** 取 rating/ratings_total/price_level。  
- `PATCH /api/places/:id`（owner/admin）  
  若 address 改變 → 重新 geocode + 重新配對 place_id。  
- `DELETE /api/places/:id`（owner/admin）

### Reviews
- `GET /api/places/:id/reviews`
- `POST /api/places/:id/reviews`（需 JWT）→ `{ rating, content?, tags?, is_anonymous? }`
- `DELETE /api/reviews/:id`（作者或管理員）

### Reports
- `POST /api/reports` → 舉報/資料修正
- `PATCH /api/reports/:id`（moderator/admin）→ 更新狀態

**錯誤碼**：400/401/403/404/409/422/500。

---

## 7) 合規的資料來源與**匯入流程**
### 7.1 推薦來源（合規）
1) **政府開放資料**（例如：台北市旅館/民宿登記資料）  
   - 欄位：名稱/地址/電話/座標/營業許可等（價格/評分通常沒有）。  
2) **Google Places API**（官方）  
   - **Text Search / Find Place**：用名稱+地址找 `place_id`。  
   - **Place Details**：取 `rating`、`user_ratings_total`、`price_level`、`opening_hours`。  
   - **Geocoding**：地址↔座標轉換（缺值補全）。

> **不建議**直接爬 OTA（Agoda/Booking/Google Maps 頁面）的**動態價格**：多數明確禁止抓取/存儲。若真要做價格資訊，建議只存**price_level（相對級距）**，或**使用者回報價位區間**（站內字段）。

### 7.2 匯入步驟（scripts/）
- `scripts/ingest-open-data.ts`：
  1. 讀取政府開放資料（CSV/JSON）。  
  2. 正規化名稱（去括號/全半形/空白）。  
  3. 若缺座標 → `geocodeAddress()` 填入。  
  4. `INSERT OR IGNORE` 至 `places`，`source='taipei-open-data'`。

- `scripts/enrich-places.ts`：
  1. 對沒有 `google_place_id` 的 `places`，以 `name + address` 呼叫 **Text Search**→ 取最相似一筆。  
  2. 用 `place_id` 呼叫 **Place Details**，寫回 `google_rating/user_ratings_total/price_level`。  
  3. 加上節流（每秒 ≤ 查詢配額）、失敗重試、錯誤記錄。

**偽代碼**
```ts
// ingest-open-data.ts
for (const row of rows) {
  let { name, address, lat, lng, type } = normalize(row);
  if (!lat || !lng) {
    const geo = await geocodeAddress(address);
    if (geo) { lat = geo.lat; lng = geo.lng; address = geo.formattedAddress; }
  }
  await db.run(
    `insert or ignore into places (id,name,type,address,latitude,longitude,source,created_by)
     values (?,?,?,?,?,?,?,?)`,
    [uuid(), name, type, address, lat, lng, 'taipei-open-data', 'system']
  );
}

// enrich-places.ts
for (const place of await db.all(`select * from places where google_place_id is null`)) {
  const match = await textSearch(`${place.name} ${place.address}`);
  if (match) {
    const details = await placeDetails(match.place_id);
    await db.run(
      `update places set google_place_id=?, google_rating=?, google_ratings_total=?, google_price_level=? where id=?`,
      [match.place_id, details.rating, details.user_ratings_total, details.price_level, place.id]
    );
    await sleep(150); // throttle
  }
}
```

---

## 8) Google API 串接（後端）
- `@googlemaps/google-maps-services-js`：Geocoding / Places（Server Key 使用；限制 IP）。
- **Maps JavaScript API**（前端載圖）：用 Browser Key（限制網域）。
- **費用/配額**：以日常開發用量而言多數在免費額度，仍須控管節流（指數退避重試、日配額上限）。

---

## 9) 前端互動（Next.js + shadcn）
- `/map`：
  - 地圖載入（Loader），**Cluster** 標記點；點圖開「新增 Place」Dialog（帶座標）。
  - 側欄：篩選（type / price_level / rating）。
- `/places/[id]`：
  - 顯示 Google rating/price_level + 站內平均分數。  
  - 評論清單（匿名開關、標籤）+ 回報按鈕。

**注意**：評論內容做基本審核（長度、敏感詞），禁止露骨/人身攻擊。

---

## 10) 安全 & 合規
- **法律/條款**：
  - 嚴格遵守開放資料授權（標註來源/日期）。
  - 僅透過**官方 API**獲取評分與相對價位等級，不抓取動態價格。  
  - 站內評論需內容審核與舉報機制；移除違規內容。
- **隱私**：移除 EXIF、匿名評論預設開啟。
- **濫用防護**：Rate limit、JWT 驗權、CSRF（同源）。

---

## 11) DevX & Repo Hygiene
```
intimate-map/
├─ frontend/ (Next.js + shadcn)
└─ backend/  (Express + SQLite)
   └─ scripts/ (ingest-open-data.ts, enrich-places.ts)
```
- Lint/format、型別界線、README（含 key 設定與法遵說明）。

---

## 12) 測試流程
1. `scripts/ingest-open-data.ts` 先匯入 50–200 筆台北旅館/汽旅。  
2. `scripts/enrich-places.ts` 富化 Google rating/price_level。  
3. 前端 `/map` 可見點位；嘗試以半徑與價位篩選。  
4. 新增 1 筆 Place（填地址→後端 geocode）；查看地圖立即呈現。  
5. 新增評論並刪除自己的評論。  
6. 回報資料錯誤，於 `/admin`（v1）將其設為 resolved。

---

## 13) Risks & Unknowns（含緩解）
- **Open Data 缺漏/過時**：定期重新匯入 + 人工回報機制。  
- **Google API 配對誤差**：對齊時採用**名稱+地址**並設相似度閾值；人工覆核黑名單。  
- **價格需求**：遵守條款，使用**price_level**或**使用者回報價位區間**代替「即時價格」。

---

## 14) Appendix
### `.env.example`
```
# frontend
NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=

# backend
PORT=3000
DATABASE_URL=file:./dev.db
JWT_SECRET=change_me
GOOGLE_MAPS_SERVER_KEY=
```

### API 範例
**POST /api/places**
```json
{
  "name": "某某汽車旅館",
  "type": "motel",
  "address": "台北市內湖區某路123號",
  "privacy_tags": ["garage", "self_checkin", "soundproof"]
}
```
**GET /api/places?type=motel&minRating=4&maxPriceLevel=2&lat=25.05&lng=121.56&radius=2000**

### UI Wireframe（ASCII）
```
/map
+--------------------------------------------------------+
| Filters: [Type ⌄][Rating ★3+][PriceLevel $0-$2][Search]|
| ------------------------------------------------------ |
|  | Google Map (clusters, click to add marker)      |  |
|  | Sidebar list (cards with rating & $ level)      |  |
| ------------------------------------------------------ |
|  [Bottom Sheet: New Place / Details / Reviews]         |
+--------------------------------------------------------+
```

---

## 15) Next 3 Actions
1. 建 `backend` 專案與 DB schema，實作 `/auth`、`/api/places`（含 Geocoding + Places 配對）。  
2. 撰寫 `scripts/ingest-open-data.ts` 與 `scripts/enrich-places.ts`，完成 100 筆示範資料。  
3. 建 `frontend` `/map` 頁：地圖載入、Cluster、篩選、**點地圖新增 Place** 主流程打通。
