# 台大周邊旅宿地圖 - NTU Student Version

> 專為台灣大學學生設計的無需登入版本,聚焦於台大周邊區域的旅宿資訊

## 🎯 版本特色

### 與原版的主要差異

| 功能 | 原版 (完整版) | 台大版本 (學生版) |
|------|--------------|------------------|
| **登入系統** | ✅ 需要註冊/登入 | ❌ **無需登入** |
| **資料範圍** | 雙北市全區 (1137個場所) | 台大周邊 (~495個場所) + 可切換全區 |
| **地圖中心** | 台北市中心 | **台大總區** (25.0174, 121.5393) |
| **使用者功能** | 評論、收藏、報告 | ❌ 已移除 (純查詢功能) |
| **地圖技術** | ~~Google Maps~~ → **Leaflet + OpenStreetMap** | **Leaflet + OpenStreetMap** (免費) |
| **目標用戶** | 一般大眾 | **台大學生** |

---

## 📍 涵蓋區域

### 台大周邊核心區域
1. **台大總區** (25.0174, 121.5393)
   - 半徑約 1.5 公里
   - 涵蓋公館、羅斯福路商圈

2. **台大醫院 / 台北車站** (25.0418, 121.5190)
   - 半徑約 1.5 公里
   - 涵蓋中正區、中山區部分地區

### 區域統計
- **中正區**: ~110 個場所
- **萬華區**: ~118 個場所
- **中山區**: ~124 個場所
- **大安區**: ~50 個場所
- **其他**: ~93 個場所

---

## 🚀 快速開始

### 1. 環境要求
```bash
- Node.js 18+
- npm 或 yarn
- SQLite (後端資料庫)
```

### 2. 安裝依賴

#### 前端
```bash
cd frontend
npm install --legacy-peer-deps
```

#### 後端
```bash
cd backend
npm install
```

### 3. 啟動服務

#### 後端 (Port 3000)
```bash
cd backend
npm run dev
```

#### 前端 (Port 5173)
```bash
cd frontend
npm run dev
```

### 4. 訪問應用
```
打開瀏覽器: http://localhost:5173
```
**無需登入,直接進入地圖!**

---

## 💡 使用說明

### 主要功能

#### 1. 地圖瀏覽
- 🗺️ 使用 OpenStreetMap 免費圖資
- 🔍 預設聚焦於台大總區
- 📍 顯示飯店、汽車旅館、民宿 (不同顏色區分)

#### 2. 區域切換
```
頂部按鈕: 「僅顯示台大周邊」 ⟷ 「顯示雙北全區」
```
- 默認顯示台大周邊 495 個場所
- 可切換查看雙北市全區 1137 個場所

#### 3. 搜尋與篩選
- 🔍 **搜尋**: 輸入場所名稱或地址
- 🏷️ **類型篩選**: 飯店 | 汽車旅館 | 民宿
- ⭐ **評分篩選**: 最低評分 (1.0 - 5.0)
- 🏷️ **隱私標籤**: 自助入住、隔音良好、私人停車等

#### 4. 查看詳情
- 點擊地圖標記 → 顯示場所資訊
- **在 Google 地圖中查看** (新分頁開啟)
- **規劃路線** (直接導航)

---

## 🛠️ 技術架構

### 前端
- **框架**: Next.js 15 + React 18
- **地圖**: Leaflet 1.x + OpenStreetMap
- **樣式**: Tailwind CSS
- **狀態管理**: React Query (資料快取)

### 後端
- **API**: Express.js + TypeScript
- **資料庫**: SQLite + Prisma ORM
- **端點**:
  - `GET /api/places/ntu` - 取得台大周邊場所
  - `GET /api/places` - 取得雙北市全區場所
  - `GET /api/places/stats/cities` - 城市統計

---

## 📂 關鍵檔案修改

### 新增檔案
```
backend/src/places/service.ts
  └── getNTUAreaPlaces() - 台大周邊場所查詢函數

backend/src/places/routes.ts
  └── GET /api/places/ntu - 台大專屬 API 端點

frontend/components/places/LeafletMap.tsx
  └── 全新 Leaflet 地圖元件 (替代 Google Maps)
```

### 簡化的檔案
```
frontend/app/page.tsx
  - 移除登入/註冊UI
  + 直接重定向至 /places

frontend/app/places/page.tsx
  - 移除所有帳戶功能 (登出、個人資料、收藏)
  - 移除評論、報告功能
  + 新增「台大周邊」/「雙北全區」切換
  + 簡化的詳情面板 (僅顯示基本資訊)
```

---

## 🎓 專為台大學生設計的優勢

### 1. **無需註冊**
   - 省去繁瑣的帳號註冊流程
   - 快速查詢,即開即用

### 2. **聚焦台大周邊**
   - 預設顯示離學校最近的場所
   - 涵蓋學生常去的區域 (公館、台大醫院、台北車站)

### 3. **完全免費**
   - 使用 OpenStreetMap,無 API 費用
   - 無廣告、無付費牆

### 4. **隱私保護**
   - 無需提供個人資訊
   - 不追蹤用戶行為

### 5. **快速導航**
   - 一鍵規劃路線至 Google Maps
   - 適合臨時需求

---

## 📊 資料統計

### 台大周邊區域場所分布
```sql
總計: 495 個場所

按類型:
- 汽車旅館: 469 個 (94.7%)
- 飯店: 23 個 (4.6%)
- 民宿: 3 個 (0.6%)

按行政區:
- 萬華區: 118 個
- 中山區: 124 個
- 中正區: 110 個
- 大安區: 50 個
- 其他: 93 個
```

---

## 🔧 後端 API 使用範例

### 取得台大周邊場所
```bash
curl "http://localhost:3000/api/places/ntu?limit=10"
```

### 篩選條件
```bash
# 僅顯示飯店
curl "http://localhost:3000/api/places/ntu?type=hotel"

# 最低評分 4.0 以上
curl "http://localhost:3000/api/places/ntu?minRating=4.0"

# 搜尋關鍵字
curl "http://localhost:3000/api/places/ntu?q=捷運"
```

### 回應格式
```json
{
  "places": [
    {
      "id": "uuid",
      "name": "場所名稱",
      "type": "hotel",
      "address": "台北市...",
      "latitude": 25.0174,
      "longitude": 121.5393,
      "googleRating": 4.5,
      "googleRatingsTotal": 1234,
      "privacyTags": ["self_checkin", "soundproof"]
    }
  ],
  "count": 495,
  "limit": 1000,
  "offset": 0,
  "area": "NTU (台大總區、台大醫院、台北車站)"
}
```

---

## 🚨 已知限制

### 1. 功能限制
- ❌ 無法發表評論 (需原版系統)
- ❌ 無法收藏場所
- ❌ 無法回報錯誤資料

### 2. 資料範圍
- 台大周邊定義為半徑 ~1.5km 範圍
- 不包含木柵、內湖等較遠區域
- 可手動切換至雙北全區模式

### 3. 地圖功能
- 無法使用 Google Street View
- 詳細導航需跳轉至 Google Maps

---

## 🤝 貢獻指南

歡迎台大學生提供建議!

### 回饋方式
1. **資料錯誤**: 直接在 Google Maps 回報
2. **功能建議**: 提交 GitHub Issue
3. **程式碼貢獻**: 發送 Pull Request

---

## 📝 版本歷史

### v1.0.0-ntu (2025-10-18)
- ✅ 移除登入系統
- ✅ 新增台大周邊 API 端點
- ✅ 遷移至 Leaflet + OpenStreetMap
- ✅ 簡化 UI,移除帳戶相關功能
- ✅ 地圖中心調整為台大總區
- ✅ 新增「台大周邊」/「雙北全區」切換

---

## 📄 授權

本專案基於原版「心生 - 雙北市旅宿地圖」修改而成,
僅供台灣大學學生學習與使用,不得用於商業用途。

資料來源:
- 政府開放資料平台
- Google Places API (僅評分資料)
- OpenStreetMap (地圖圖資)

---

## 🙏 致謝

- 台灣大學學生
- OpenStreetMap 社群
- Leaflet 開發團隊
- Next.js & React 社群

---

**Made with ❤️ for NTU Students**

🔗 **專案連結**: [GitHub Repository](#)
📧 **聯繫方式**: [your-email@example.com]
🌐 **Demo 網站**: [https://ntu-places.example.com](#)
