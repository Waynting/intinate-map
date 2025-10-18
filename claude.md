# 雙北市私密空間地圖 - 技術實現邏輯分析

## 目錄
1. [系統架構概覽](#系統架構概覽)
2. [地圖標記顯示問題分析](#地圖標記顯示問題分析)
3. [資料流程](#資料流程)
4. [前端實現細節](#前端實現細節)
5. [後端實現細節](#後端實現細節)
6. [已知問題與解決方案](#已知問題與解決方案)

---

## 系統架構概覽

### 技術棧
- **前端**: Next.js 15 + React 18 + TypeScript + Tailwind CSS
- **後端**: Express.js + TypeScript
- **資料庫**: SQLite + Prisma ORM
- **地圖**: Google Maps JavaScript API
- **部署**: 前端 (Vercel/Netlify), 後端 (Railway/Render)

### 專案結構
```
Hw4/
├── frontend/           # Next.js 前端應用
│   ├── app/           # 頁面路由 (App Router)
│   ├── components/    # React 元件
│   └── lib/          # API 客戶端與工具
├── backend/           # Express 後端 API
│   ├── src/
│   │   ├── places/   # 場所相關服務
│   │   ├── routes/   # API 路由
│   │   └── db/       # 資料庫設置
│   └── prisma/       # 資料庫 Schema 與遷移
└── Hotel-json/       # 原始資料集
```

---

## 地圖標記顯示問題分析

### 問題描述
用戶報告：「點在地圖上的呈現還是失敗（有跳錯誤訊息）」

### 已檢查項目
1. ✅ **資料庫數據完整性**
   - 資料表: `places` (lowercase)
   - 總數據量: 1,137 個場所
   - 座標範圍:
     - 緯度: 23.975744 ~ 25.7
     - 經度: 118.363273 ~ 121.988556

2. ✅ **Google Maps API Key 配置**
   - 前端環境變數: `NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY` 已設置
   - API Key: AIzaSyDAApFFh2nC5fd5lOTwuofx2QwHQraG0Ig

3. ✅ **地圖元件實現** ([PlaceMap.tsx](frontend/components/places/PlaceMap.tsx))
   - 使用 `@googlemaps/js-api-loader` 載入地圖
   - 地圖中心點: (25.0330, 121.5654) - 台北市
   - 預設縮放層級: 11

### 潛在問題點

#### 1. 資料載入與座標解析
**問題**: Place 資料的 `latitude` 和 `longitude` 是否正確傳遞到地圖元件

**檢查點**:
```typescript
// frontend/lib/api.ts:68-90
export interface Place {
  id: string;
  name: string;
  type: PlaceType;
  address: string | null;
  latitude: number;  // ← 必須是數字型別
  longitude: number; // ← 必須是數字型別
  ...
}
```

**可能的錯誤**:
- 從 API 返回的座標可能是字串而非數字
- Prisma 的 `Float` 型別序列化問題

#### 2. 標記創建邏輯
**位置**: [PlaceMap.tsx:208-307](frontend/components/places/PlaceMap.tsx#L208-L307)

```typescript
places.forEach((place) => {
  const marker = new google.maps.Marker({
    position: { lat: place.latitude, lng: place.longitude }, // ← 關鍵行
    map: googleMapRef.current!,
    ...
  });
});
```

**可能導致錯誤的情況**:
1. `place.latitude` 或 `place.longitude` 是 `null`/`undefined`
2. 座標值不在有效範圍 (緯度: -90~90, 經度: -180~180)
3. 資料庫中存在無效座標 (例如: 0, 0)

#### 3. 地圖邊界計算
**位置**: [PlaceMap.tsx:310-338](frontend/components/places/PlaceMap.tsx#L310-L338)

```typescript
if (places.length > 0 && googleMapRef.current) {
  const bounds = new google.maps.LatLngBounds();
  places.forEach((place) => {
    bounds.extend({ lat: place.latitude, lng: place.longitude });
  });
  googleMapRef.current.fitBounds(bounds, { ... });
}
```

**可能的問題**:
- 如果座標範圍過大 (例如包含台灣以外的地點)，地圖會縮放到極小比例
- 當前數據顯示經度範圍: 118.36 ~ 121.99，這包含了台灣西部海域，可能導致視野不正常

---

## 資料流程

### 1. 初始資料載入

#### 首頁 ([page.tsx](frontend/app/page.tsx))
```typescript
// 載入城市統計
loadPlaceCount()
  ↓
placesApi.getCityStats()
  ↓
GET /api/places/stats/cities
  ↓
返回: { cities: [{ name: "台北市", count: X }, ...] }
```

#### 場所頁面 ([places/page.tsx](frontend/app/places/page.tsx))
```typescript
// 載入所有場所
loadAllPlaces()
  ↓
placesApi.list({ limit: 1500 })
  ↓
GET /api/places?limit=1500
  ↓
返回: { places: Place[], count: number }
  ↓
setPlaces(data.places)
  ↓
傳遞給 PlaceMap 元件
```

### 2. 地圖標記渲染流程

```mermaid
graph TD
    A[PlaceMap 接收 places props] --> B{檢查 isLoaded 和 googleMapRef}
    B -->|未載入| C[等待 Google Maps API 載入]
    B -->|已載入| D[清除現有標記]
    D --> E{檢查 places.length}
    E -->|= 0| F[重置地圖到預設視圖]
    E -->|> 0| G[遍歷 places 陣列]
    G --> H[為每個 place 創建 Marker]
    H --> I[設置 marker 事件監聽器]
    I --> J[計算地圖邊界]
    J --> K[調整地圖縮放與中心點]
```

### 3. 標記互動流程

#### 點擊標記
```
用戶點擊標記
  ↓
marker "click" 事件
  ↓
關閉上一個 InfoWindow
  ↓
創建新的 InfoWindow (含場所資訊)
  ↓
調用 onMarkerClick(place)
  ↓
更新 selectedPlaceId
  ↓
觸發標記樣式更新 (放大、變色、動畫)
```

#### 懸停標記
```
滑鼠移入標記
  ↓
marker "mouseover" 事件
  ↓
放大標記 (+2 scale)
  ↓
顯示簡易 tooltip (僅顯示名稱)
```

---

## 前端實現細節

### PlaceMap 元件狀態管理

```typescript
// frontend/components/places/PlaceMap.tsx
const mapRef = useRef<HTMLDivElement>(null);              // 地圖容器 DOM
const googleMapRef = useRef<google.maps.Map | null>(null); // Google Maps 實例
const markersRef = useRef<Map<string, google.maps.Marker>>(new Map()); // 標記集合
const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);     // 資訊視窗
const glowMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map()); // 光暈效果
const hoverTooltipRef = useRef<google.maps.InfoWindow | null>(null);   // 懸停提示
```

### 標記顏色邏輯

```typescript
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    hotel: "#059669",      // 飯店 - 綠色
    motel: "#db2777",      // 汽車旅館 - 粉色
    short_stay: "#f97316", // 民宿 - 橘色
  };
  return colors[type] || "#6b7280"; // 預設灰色
}
```

### 標記大小響應式設計

```typescript
const baseScale = isMobile ? 12 : 8;        // 一般標記
const selectedScale = isMobile ? 18 : 14;   // 選中標記
```

### 地圖樣式自定義

[PlaceMap.tsx:51-75](frontend/components/places/PlaceMap.tsx#L51-L75)
- 隱藏 POI (興趣點)
- 隱藏大眾運輸資訊
- 簡化道路標籤
- 自定義水域和陸地顏色

---

## 後端實現細節

### Place 資料模型

**Prisma Schema** ([backend/prisma/schema.prisma:36-72](backend/prisma/schema.prisma#L36-L72))

```prisma
model Place {
  id        String   @id @default(uuid())
  name      String
  type      String   // hotel | motel | short_stay
  address   String?
  latitude  Float    // ← 關鍵：Float 型別
  longitude Float    // ← 關鍵：Float 型別

  googlePlaceId      String? @map("google_place_id")
  googleRating       Float?  @map("google_rating")
  googleRatingsTotal Int?    @map("google_ratings_total")
  googlePriceLevel   Int?    @map("google_price_level")

  privacyTags String? @map("privacy_tags") // JSON array

  source    String  @default("user")
  createdBy String? @map("created_by")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([latitude, longitude], name: "idx_places_latlng")
  @@map("places")
}
```

### API 端點

#### GET /api/places
**功能**: 取得場所列表 (支援過濾與分頁)

**查詢參數**:
```typescript
interface PlaceFilters {
  type?: PlaceType;
  city?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  minRating?: number;
  maxPriceLevel?: number;
  q?: string; // 搜尋關鍵字
  limit?: number;
  offset?: number;
}
```

**回應格式**:
```json
{
  "places": [
    {
      "id": "uuid",
      "name": "場所名稱",
      "type": "hotel",
      "address": "台北市...",
      "latitude": 25.06,
      "longitude": 121.52,
      "googleRating": 4.5,
      "googleRatingsTotal": 1234,
      "privacyTags": ["self_checkin", "soundproof"],
      "reviewCount": 10,
      "averageRating": 4.2
    }
  ],
  "count": 1137,
  "limit": 1500,
  "offset": 0
}
```

#### GET /api/places/stats/cities
**功能**: 取得各城市場所數量統計

**回應格式**:
```json
{
  "cities": [
    { "name": "台北市", "count": 543 },
    { "name": "新北市", "count": 594 }
  ]
}
```

---

## 已知問題與解決方案

### 問題 1: 地圖標記無法顯示

#### 可能原因 A: 座標資料型別錯誤
**症狀**: 標記完全不顯示，控制台出現 `Invalid LatLng` 錯誤

**診斷方法**:
```javascript
// 在瀏覽器控制台執行
console.log(typeof places[0].latitude);  // 應該是 "number"
console.log(typeof places[0].longitude); // 應該是 "number"
```

**解決方案**:
```typescript
// 在 PlaceMap.tsx 中添加類型轉換
places.forEach((place) => {
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);

  if (isNaN(lat) || isNaN(lng)) {
    console.error(`Invalid coordinates for ${place.name}:`, place.latitude, place.longitude);
    return; // 跳過此標記
  }

  const marker = new google.maps.Marker({
    position: { lat, lng },
    ...
  });
});
```

#### 可能原因 B: Google Maps API 配額超限
**症狀**: 地圖顯示但標記不出現，控制台顯示 `OVER_QUERY_LIMIT`

**檢查方法**:
1. 開啟 [Google Cloud Console](https://console.cloud.google.com/google/maps-apis/quotas)
2. 查看 Maps JavaScript API 使用量

**臨時解決方案**:
- 減少一次性顯示的標記數量
- 實現標記聚合 (Marker Clustering)

#### 可能原因 C: 資料庫中存在無效座標
**症狀**: 部分標記無法顯示

**檢查 SQL**:
```sql
-- 查找座標為 0 或 null 的記錄
SELECT id, name, latitude, longitude
FROM places
WHERE latitude = 0 OR longitude = 0
   OR latitude IS NULL OR longitude IS NULL;

-- 查找座標超出台灣範圍的記錄
SELECT id, name, latitude, longitude
FROM places
WHERE latitude < 21.5 OR latitude > 26.0
   OR longitude < 118.0 OR longitude > 122.5;
```

**解決方案**:
```typescript
// 在後端過濾無效座標
const TAIWAN_BOUNDS = {
  minLat: 21.5, maxLat: 26.0,
  minLng: 118.0, maxLng: 122.5
};

const places = await prisma.place.findMany({
  where: {
    latitude: { gte: TAIWAN_BOUNDS.minLat, lte: TAIWAN_BOUNDS.maxLat },
    longitude: { gte: TAIWAN_BOUNDS.minLng, lte: TAIWAN_BOUNDS.maxLng },
  },
});
```

### 問題 2: 地圖縮放異常

#### 現象
- 地圖初始顯示時縮放層級過小，看不清楚標記
- 或地圖縮放層級過大，只顯示一小部分區域

#### 原因
地圖邊界計算包含了離群值座標 (例如: 經度 118.36 在台灣西部海域)

#### 解決方案
在計算邊界時過濾離群值:

```typescript
// PlaceMap.tsx - 改進邊界計算
if (places.length > 0 && googleMapRef.current) {
  const bounds = new google.maps.LatLngBounds();

  // 定義雙北市合理範圍
  const SHUANGBEI_BOUNDS = {
    minLat: 24.6, maxLat: 25.3,
    minLng: 121.3, maxLng: 121.8
  };

  places.forEach((place) => {
    const lat = place.latitude;
    const lng = place.longitude;

    // 僅添加在合理範圍內的座標
    if (lat >= SHUANGBEI_BOUNDS.minLat && lat <= SHUANGBEI_BOUNDS.maxLat &&
        lng >= SHUANGBEI_BOUNDS.minLng && lng <= SHUANGBEI_BOUNDS.maxLng) {
      bounds.extend({ lat, lng });
    }
  });

  if (!bounds.isEmpty()) {
    googleMapRef.current.fitBounds(bounds, {
      top: 50, right: 50, bottom: 50, left: 50
    });
  }
}
```

### 問題 3: 效能問題 (1000+ 標記)

#### 現象
- 地圖載入緩慢
- 瀏覽器卡頓
- 互動回應延遲

#### 解決方案 A: 實現標記聚合
使用 [@googlemaps/markerclusterer](https://www.npmjs.com/package/@googlemaps/markerclusterer)

```typescript
import { MarkerClusterer } from "@googlemaps/markerclusterer";

// 在 PlaceMap.tsx 中
const clusterer = new MarkerClusterer({
  map: googleMapRef.current,
  markers: Array.from(markersRef.current.values()),
});
```

#### 解決方案 B: 視野範圍過濾
僅顯示當前視野內的標記:

```typescript
// 添加地圖移動事件監聽
googleMapRef.current.addListener("idle", () => {
  const bounds = googleMapRef.current?.getBounds();
  if (bounds) {
    const visiblePlaces = places.filter(place =>
      bounds.contains({ lat: place.latitude, lng: place.longitude })
    );
    updateMarkers(visiblePlaces);
  }
});
```

---

## 推薦除錯步驟

### 1. 檢查瀏覽器控制台
開啟開發者工具 (F12)，查看 Console 標籤是否有錯誤訊息:
- ❌ `Google Maps API error: InvalidKeyMapError` → API Key 無效
- ❌ `Invalid LatLng: (NaN, NaN)` → 座標資料有誤
- ❌ `Uncaught TypeError: Cannot read property 'lat' of undefined` → 資料結構問題

### 2. 檢查 Network 請求
查看 Network 標籤，確認 API 請求成功:
```
GET /api/places?limit=1500
Status: 200 OK
Response: { "places": [...], "count": 1137 }
```

### 3. 驗證資料庫內容
```bash
cd backend
sqlite3 prisma/dev.db

# 檢查總數量
SELECT COUNT(*) FROM places;

# 檢查座標範圍
SELECT
  MIN(latitude) as min_lat,
  MAX(latitude) as max_lat,
  MIN(longitude) as min_lng,
  MAX(longitude) as max_lng
FROM places;

# 檢查是否有無效座標
SELECT COUNT(*) FROM places
WHERE latitude = 0 OR longitude = 0;
```

### 4. 測試 API 端點
```bash
# 測試場所列表 API
curl http://localhost:3000/api/places?limit=5

# 測試城市統計 API
curl http://localhost:3000/api/places/stats/cities
```

### 5. 檢查環境變數
```bash
cd frontend
cat .env | grep GOOGLE
# 應輸出: NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=AIzaSy...
```

---

## 維護與優化建議

### 1. 資料清理
定期檢查並修正無效座標:
```sql
-- 找出疑似錯誤的座標
SELECT id, name, address, latitude, longitude
FROM places
WHERE
  (latitude < 22 OR latitude > 26) OR
  (longitude < 119 OR longitude > 122) OR
  (latitude = 0 AND longitude = 0);
```

### 2. 效能監控
- 使用 Chrome DevTools Performance 分析渲染瓶頸
- 監控 API 回應時間 (應 < 500ms)
- 追蹤前端 bundle 大小

### 3. 錯誤追蹤
考慮整合錯誤追蹤服務:
- Sentry (錯誤監控)
- LogRocket (用戶行為回放)

### 4. 測試覆蓋
添加自動化測試:
```typescript
// 測試標記渲染
describe('PlaceMap', () => {
  it('should render markers for all places', () => {
    const mockPlaces = [
      { id: '1', latitude: 25.0, longitude: 121.5, ... }
    ];
    render(<PlaceMap places={mockPlaces} />);
    // 驗證標記數量
  });
});
```

---

## 結論

### 系統優勢
✅ 完整的雙北市旅宿資料集 (1137 筆)
✅ 響應式地圖介面 (支援桌面與行動裝置)
✅ 豐富的互動功能 (點擊、懸停、鍵盤導航)
✅ 隱私保護機制 (匿名評論)
✅ 可擴展的架構 (Prisma + TypeScript)

### 待改進項目
⚠️ 標記聚合功能 (效能優化)
⚠️ 更嚴格的座標驗證
⚠️ 錯誤處理與用戶提示
⚠️ 單元測試與 E2E 測試
⚠️ API 速率限制與快取策略

---

**文檔版本**: v1.0
**最後更新**: 2025-10-17
**作者**: Claude AI Assistant
