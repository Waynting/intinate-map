# Demo 帳號說明

本專案已預先建立兩個 Demo 帳號供測試使用。

---

## 🔑 帳號資訊

### 一般用戶
```
Email: demo@intimate-spaces.com
Password: demo1234
Role: user
```

**權限:**
- ✅ 瀏覽所有場所
- ✅ 撰寫評論（可選擇匿名或公開）
- ✅ 檢舉不當場所或評論
- ✅ 編輯/刪除自己創建的場所
- ✅ 編輯/刪除自己的評論

**限制:**
- ❌ 無法編輯/刪除他人的場所
- ❌ 無法訪問管理後台
- ❌ 無法處理檢舉

---

### 管理員
```
Email: admin@intimate-spaces.com
Password: admin1234
Role: admin
```

**權限:**
- ✅ 一般用戶的所有權限
- ✅ 編輯/刪除任何場所
- ✅ 刪除任何評論
- ✅ 訪問管理後台（/admin/reports）
- ✅ 查看檢舉列表和統計
- ✅ 處理檢舉（批准/拒絕）
- ✅ 管理用戶（待開發）

---

## 🚀 如何使用

1. 啟動應用：
   ```bash
   # 後端
   cd backend
   npm run dev

   # 前端
   cd frontend
   npm run dev
   ```

2. 訪問前端：http://localhost:5173

3. 使用上述任一帳號登入

---

## 🔐 安全提醒

**重要:** 這些是 Demo 帳號，僅供開發和測試使用。

在生產環境中：
- ❌ 請勿使用這些帳號
- ❌ 請勿使用弱密碼（如 `demo1234`）
- ✅ 使用強密碼和適當的密碼管理
- ✅ 考慮實施多因素認證 (MFA)
- ✅ 定期更換管理員密碼

---

## 📝 創建新帳號

### 方法 1: 通過 UI 註冊
1. 訪問 http://localhost:5173/auth/register
2. 填寫 Email 和密碼
3. 點擊註冊

### 方法 2: 使用腳本創建管理員
```bash
cd backend
npm run build
node dist/scripts/create-admin.js <email> <password>
```

例如：
```bash
node dist/scripts/create-admin.js newadmin@example.com secure1234
```

---

## 🧪 測試建議

### 使用一般用戶測試
- [ ] 登入/登出
- [ ] 瀏覽地圖和場所列表
- [ ] 搜尋和過濾功能
- [ ] 查看場所詳情
- [ ] 撰寫評論（匿名和公開）
- [ ] 檢舉不當內容
- [ ] 編輯/刪除自己的評論

### 使用管理員測試
- [ ] 所有一般用戶功能
- [ ] 編輯他人創建的場所
- [ ] 刪除不當評論
- [ ] 訪問管理後台
- [ ] 查看檢舉統計
- [ ] 處理檢舉請求

---

## 💾 資料庫位置

開發環境資料庫：
```
backend/prisma/dev.db
```

查看資料庫內容：
```bash
cd backend
npx prisma studio
```

---

## 🔄 重置帳號

如果需要重置 Demo 帳號：

```bash
cd backend

# 刪除並重新創建資料庫
npx prisma migrate reset

# 重新創建 Demo 帳號
npm run build
node dist/scripts/create-admin.js admin@intimate-spaces.com admin1234
node dist/scripts/create-user.js demo@intimate-spaces.com demo1234
```

---

**最後更新:** 2025-10-17
