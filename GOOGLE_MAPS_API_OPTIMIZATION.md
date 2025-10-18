# Google Maps API 使用分析與優化方案

> **專案背景**: 雙北市私密空間地圖 - 1137+ 場所標記
> **問題**: Google Maps API 有使用額度限制，需要優化調用次數
> **目標**: 在不影響使用體驗的前提下，最大化減少 API 費用

---

## 📊 第一部分：目前 API 使用情況分析

### 1. Google Maps JavaScript API 調用點

#### 🔴 核心調用（每次產生費用）

| 調用位置 | API 類型 | 觸發時機 | 頻率 | 估計費用影響 |
|---------|---------|---------|-----|------------|
| **PlaceMap.tsx:50-53** | Maps JavaScript API 載入 | 進入 `/places` 頁面時 | 每次訪問 | ⭐⭐⭐ 高 |
| **PlaceMap.tsx:220** | Directions API (導航連結) | 點擊"導航"按鈕 | 按需 | ⭐ 低 (外部連結) |
| **PlaceMap.tsx:310-411** | 標記創建 (Marker API) | 地圖載入後 | 1137 個標記/次 | ⭐⭐ 中 |
| **PlaceMap.tsx:394-398** | InfoWindow 創建 | 點擊標記時 | 每次點擊 | ⭐ 低 |
| **PlaceMap.tsx:425-460** | MarkerClusterer (已優化) | 標記聚合 | 自動 | ✅ 免費 (第三方庫) |

#### 🟡 數據 API 調用（後端）

| 調用位置 | API 類型 | 觸發時機 | 頻率 | 優化狀態 |
|---------|---------|---------|-----|---------|
| **page.tsx:59** | `placesApi.list()` | 進入地圖頁面 | 1次/訪問 | ✅ 已優化 |
| **page.tsx:74** | `favoritesApi.list()` | 進入地圖頁面 | 1次/訪問 | ✅ 已優化 |
| **[id]/page.tsx:47-50** | `placesApi.get()` + `reviewsApi.listByPlace()` | 查看場所詳情 | 1次/場所 | ✅ 已優化 |

---

### 2. 費用估算（Google Maps Platform Pricing）

#### Maps JavaScript API 計費方式
- **Dynamic Maps**: $7 USD / 1,000 loads
- **Static Maps**: $2 USD / 1,000 loads
- **Markers**: 包含在 Dynamic Maps 費用中（無額外費用）
- **InfoWindow**: 免費
- **Directions API**: $5 USD / 1,000 requests（目前是外部連結，不計費）

#### 目前每月估算（假設 1000 位活躍用戶）
```
場景 A：輕度使用
- 每用戶訪問地圖頁 2 次/月
- 1000 用戶 × 2 次 = 2,000 地圖載入
- 費用: 2,000 ÷ 1,000 × $7 = $14 USD/月

場景 B：中度使用
- 每用戶訪問地圖頁 5 次/月
- 1000 用戶 × 5 次 = 5,000 地圖載入
- 費用: 5,000 ÷ 1,000 × $7 = $35 USD/月

場景 C：重度使用
- 每用戶訪問地圖頁 10 次/月
- 1000 用戶 × 10 次 = 10,000 地圖載入
- 費用: 10,000 ÷ 1,000 × $7 = $70 USD/月
```

---

## 🎯 第二部分：優化策略（按優先級排序）

### ⭐ 優先級 1：關鍵優化（立即實施）

#### 1.1 實現地圖懶載入（Lazy Loading）
**當前問題**: 用戶進入 `/places` 頁面就立即載入地圖，即使用戶可能只是瀏覽列表

**解決方案**: 添加"顯示地圖"按鈕，讓用戶主動觸發地圖載入

**預期效果**:
- 減少 40-60% 的地圖 API 調用
- 首頁載入速度提升 2-3 秒

**實現方式**:
```typescript
// PlacesPage 添加狀態
const [mapEnabled, setMapEnabled] = useState(false);

// 渲染條件
{!mapEnabled ? (
  <Button onClick={() => setMapEnabled(true)}>
    <MapPin /> 顯示互動地圖
  </Button>
) : (
  <PlaceMap places={filteredPlaces} />
)}
```

---

#### 1.2 首頁使用靜態地圖預覽
**當前問題**: 首頁沒有地圖，但可以添加靜態預覽來吸引用戶

**解決方案**: 使用 Google Static Maps API（費用更低）

**費用對比**:
- Dynamic Maps: $7 / 1,000 loads
- Static Maps: $2 / 1,000 loads
- **節省**: 71% 成本

**實現方式**:
```typescript
// 首頁添加靜態地圖預覽圖
<img
  src={`https://maps.googleapis.com/maps/api/staticmap?
    center=25.0330,121.5654
    &zoom=11
    &size=600x400
    &markers=color:red|25.0330,121.5654
    &key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY}
  `}
  alt="雙北市地圖預覽"
  className="cursor-pointer"
  onClick={() => router.push('/places')}
/>
```

---

#### 1.3 實現地圖實例快取（Session Storage）
**當前問題**: 每次進入頁面都重新載入地圖

**解決方案**: 使用 React Context 或全域狀態管理地圖實例

**預期效果**: 同一 session 內，地圖只載入一次

**實現方式**:
```typescript
// lib/mapContext.tsx (新建文件)
import { createContext, useContext, useRef } from 'react';

const MapContext = createContext<{
  mapInstance: google.maps.Map | null;
  setMapInstance: (map: google.maps.Map) => void;
} | null>(null);

export function MapProvider({ children }) {
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  return (
    <MapContext.Provider value={{
      mapInstance: mapInstanceRef.current,
      setMapInstance: (map) => { mapInstanceRef.current = map; }
    }}>
      {children}
    </MapContext.Provider>
  );
}

export const useMapContext = () => useContext(MapContext);
```

---

### ⭐ 優先級 2：效能優化（建議實施）

#### 2.1 優化標記渲染策略
**當前狀況**: 已實現 MarkerClusterer ✅

**進一步優化**: 視野範圍過濾（Viewport Filtering）

**實現方式**:
```typescript
// PlaceMap.tsx 添加視野過濾
const [visiblePlaces, setVisiblePlaces] = useState<Place[]>([]);

useEffect(() => {
  if (!googleMapRef.current) return;

  const updateVisiblePlaces = () => {
    const bounds = googleMapRef.current?.getBounds();
    if (!bounds) return;

    const filtered = places.filter(place =>
      bounds.contains({ lat: place.latitude, lng: place.longitude })
    );

    setVisiblePlaces(filtered);
  };

  const listener = googleMapRef.current.addListener('idle', updateVisiblePlaces);
  return () => google.maps.event.removeListener(listener);
}, [places]);
```

**預期效果**:
- 只渲染可見範圍內的標記（例如：從 1137 個減少到 50-200 個）
- 地圖互動更流暢

---

#### 2.2 實現前端數據快取
**當前問題**: 每次進入頁面都重新請求 `placesApi.list()`

**解決方案**: 使用 React Query 或 SWR 進行數據快取

**實現方式**:
```typescript
// 安裝依賴
npm install @tanstack/react-query

// app/layout.tsx 添加 QueryClient
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分鐘
      cacheTime: 10 * 60 * 1000, // 10 分鐘
    },
  },
});

// places/page.tsx 使用快取
import { useQuery } from '@tanstack/react-query';

const { data, isLoading } = useQuery({
  queryKey: ['places'],
  queryFn: () => placesApi.list(),
});
```

**預期效果**:
- 5 分鐘內重複訪問不會重新請求 API
- 減少後端負載 50-70%

---

#### 2.3 添加地圖載入進度指示器
**當前問題**: 用戶不知道地圖是否正在載入

**解決方案**: 顯示友善的載入動畫

**實現方式**:
```typescript
// PlaceMap.tsx
{!isLoaded && (
  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
    <div className="text-center">
      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
      <p className="text-sm text-gray-600">正在載入地圖...</p>
      <p className="text-xs text-gray-500 mt-2">首次載入可能需要幾秒鐘</p>
    </div>
  </div>
)}
```

---

### ⭐ 優先級 3：進階優化（可選）

#### 3.1 實現地圖預載入（Preloading）
```typescript
// app/layout.tsx 頭部
<link rel="preconnect" href="https://maps.googleapis.com" />
<link rel="dns-prefetch" href="https://maps.googleapis.com" />
```

#### 3.2 使用 Web Worker 處理大量標記數據
```typescript
// workers/processMarkers.ts
self.addEventListener('message', (e) => {
  const { places, bounds } = e.data;
  const filtered = places.filter(/* ... */);
  self.postMessage(filtered);
});
```

#### 3.3 實現漸進式標記渲染
```typescript
// 分批渲染標記，避免一次性創建 1137 個
const batchSize = 100;
for (let i = 0; i < places.length; i += batchSize) {
  setTimeout(() => {
    renderMarkerBatch(places.slice(i, i + batchSize));
  }, i / batchSize * 50); // 每批延遲 50ms
}
```

---

## 📈 第三部分：優化效果預估

### 優化前 vs 優化後對比表

| 指標 | 優化前 | 優化後（實施優先級 1+2） | 改善幅度 |
|-----|-------|---------------------|---------|
| **API 調用次數** | 100% | 35-45% | **↓ 55-65%** |
| **每月費用（1000 用戶）** | $35 USD | $12-16 USD | **↓ $19-23 USD** |
| **首次載入時間** | 3.5-4.5 秒 | 1.2-1.8 秒 | **↓ 60-70%** |
| **標記渲染數量** | 1137 個 | 50-200 個（視野內） | **↓ 82-95%** |
| **地圖互動流暢度** | 中等 | 高 | **↑ 顯著提升** |

---

## 🔧 第四部分：實施計劃

### 第一階段：立即實施（預計 2-3 小時）
1. ✅ **移除首頁 console.log** - 5 分鐘
2. ⏳ **實現地圖懶載入** - 30 分鐘
3. ⏳ **添加載入進度指示器** - 20 分鐘
4. ⏳ **安裝並配置 React Query** - 30 分鐘
5. ⏳ **實現數據快取策略** - 30 分鐘

**預期成效**: 減少 40-50% API 調用

---

### 第二階段：效能優化（預計 4-6 小時）
6. ⏳ **實現視野範圍過濾** - 1.5 小時
7. ⏳ **建立地圖 Context** - 1 小時
8. ⏳ **首頁添加靜態地圖** - 45 分鐘
9. ⏳ **優化標記更新邏輯** - 1.5 小時

**預期成效**: 額外減少 15-20% API 調用

---

### 第三階段：進階優化（預計 6-8 小時）
10. ⏳ **Web Worker 處理數據** - 2 小時
11. ⏳ **漸進式標記渲染** - 2 小時
12. ⏳ **添加服務端快取（Redis）** - 3 小時

**預期成效**: 額外減少 5-10% API 調用

---

## 📝 第五部分：監控指標

### 需要追蹤的 KPI
```typescript
// lib/analytics.ts (新建)
export const trackMapLoad = () => {
  // 記錄地圖載入次數
  console.log('[Analytics] Map loaded', new Date());
};

export const trackAPICall = (endpoint: string) => {
  // 記錄 API 調用
  console.log('[Analytics] API called:', endpoint);
};
```

### Google Analytics 事件追蹤
```typescript
// 在 PlaceMap.tsx 中添加
useEffect(() => {
  if (isLoaded) {
    gtag('event', 'map_load', {
      places_count: places.length,
      load_time: performance.now(),
    });
  }
}, [isLoaded]);
```

---

## ⚠️ 注意事項

### 1. API Key 安全
```bash
# .env.local
NEXT_PUBLIC_GOOGLE_MAPS_JS_KEY=your_key_here

# 在 Google Cloud Console 設定：
# - HTTP referrer restrictions (只允許你的域名)
# - API restrictions (只啟用需要的 API)
```

### 2. 錯誤處理
```typescript
// PlaceMap.tsx 添加錯誤邊界
try {
  const loader = new Loader({ ... });
  await loader.load();
} catch (error) {
  console.error('Maps API 載入失敗:', error);

  // 顯示降級 UI（例如靜態地圖或列表視圖）
  setShowMapError(true);
}
```

### 3. 用戶體驗優先
- 即使優化 API，也不應犧牲使用體驗
- 保持地圖互動流暢性
- 提供清晰的載入反饋

---

## ✅ 總結

### 立即可實施的優化（ROI 最高）
1. **地圖懶載入** → 節省 40-60% API 調用
2. **數據快取** → 節省 50-70% 後端負載
3. **視野過濾** → 提升 3-5 倍渲染效能

### 預期節省成本（年度）
```
優化前年度費用：$420 USD (假設 1000 用戶，中度使用)
優化後年度費用：$144-192 USD
年度節省：$228-276 USD (節省 54-66%)
```

### 額外好處
- ⚡ 載入速度提升 60-70%
- 🎯 用戶體驗大幅改善
- 🔋 減少設備電量消耗
- 📱 移動端效能提升更明顯

---

**文檔版本**: v2.0
**最後更新**: 2025-10-18
**作者**: Claude AI (Backend Engineer & System Designer)
**實施狀態**: 第一階段進行中
