# 首頁 (page.tsx) 代碼清理計劃

## 📍 清理項目

### 1. 移除開發用 Console.log
**位置**: `frontend/app/page.tsx` Lines 43, 45, 54, 59-63

**移除內容**:
```typescript
console.log('[LandingPage] Loading city stats...');
console.log('[LandingPage] City stats loaded:', data);
console.log('[LandingPage] Taipei count:', taipei?.count, 'New Taipei count:', newTaipei?.count);
console.error('[LandingPage] Failed to load place count:', error);
```

**保留策略**:
- 開發環境可保留錯誤日誌
- 生產環境完全移除
- 使用環境變數控制日誌輸出

---

### 2. 優化錯誤處理
**位置**: Lines 58-66

**現有**:
```typescript
} catch (error) {
  console.error('[LandingPage] Failed to load place count:', error);
  // Use default values
  setTotalPlaces(1137);
  setTaipeiCount(543);
  setNewTaipeiCount(594);
}
```

**優化後**:
```typescript
} catch (error) {
  // Silently use defaults in production
  if (process.env.NODE_ENV === 'development') {
    console.error('Failed to load city stats:', error);
  }
  // Fallback to reasonable defaults
  setTotalPlaces(1137);
  setTaipeiCount(543);
  setNewTaipeiCount(594);
}
```

---

### 3. 優化初始狀態
**位置**: Line 19

**現有**:
```typescript
const [totalPlaces, setTotalPlaces] = useState(1137);
```

**優化後**:
```typescript
const [totalPlaces, setTotalPlaces] = useState(0);
```

**理由**:
- 讓初始值為 0，顯示載入狀態
- 數據由 API 動態決定，避免硬編碼

---

### 4. 註解優化
**位置**: 全文件

**保留的重要註解**:
- Line 30: `// Handle authentication state on client-side only to prevent hydration errors`
- Line 69: `// District options grouped by city`

**移除的冗餘註解**:
- Line 60: `// Use default values` (改為更清晰的錯誤處理)

---

## ✅ 清理後的優勢

1. **效能提升**
   - 減少控制台輸出，降低瀏覽器負擔
   - 生產環境無日誌污染

2. **代碼品質**
   - 更清晰的錯誤處理邏輯
   - 避免硬編碼數據
   - 註解更有意義

3. **維護性**
   - 開發與生產環境分離
   - 日誌輸出可控制

---

## 📋 實施檢查清單

- [ ] 移除所有 `console.log` 調試語句
- [ ] 優化 `console.error` 為條件輸出
- [ ] 修改初始狀態值為動態載入
- [ ] 檢查所有註解是否必要
- [ ] 測試頁面功能正常運作

---

**文檔版本**: v1.0
**最後更新**: 2025-10-18
**實施狀態**: 待執行
