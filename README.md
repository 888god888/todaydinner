# 晚餐快選 v2

熟店、新店交替推薦。主推一家，備選最多兩家。網頁可部署到 GitHub Pages，亦有目前可直接使用的私人線上版本。

## 已完成

- 不喜歡換一批：保留篩選，同輪不重複；名單用完後需明確重新開始。
- 不再推薦、恢復推薦，與單次跳過分開。
- 每人預算上下限、生活圈、種類複選。
- 公告營業時段推算（台灣時間），支援午晚餐分段、跨午夜、24 小時、未知時段。
- Google Maps 評價查詢與導航入口。
- 熟店愛心標記、新店交替推薦，確認吃過才記錄，預設避開最近三天。
- 自訂店家、編輯時段與價位、用餐紀錄撤銷、本機持久保存、JSON 備份匯出與匯入。
- 可選定位與直線距離篩選；無座標不會杜撰距離。

## 尚未接通的資料

卡片沒有即時 Google 星等，不會自動抓取附近所有店家。Google 評價在 Maps 查詢。營業狀態依公告推算，不含臨時休息；預算是粗估區間，不是即時菜單價格。內建 11 家桃園區店家，2026/11/09 核對官網／政府網站地址與時段。每家卡片的「時段與資料」保留來源。

沒有登入同步；瀏覽器紀錄與 GitHub Actions 無關。換裝置請先匯出備份。

## GitHub Pages workflow

`.github/workflows/pages.yml` 在 push 至 `main`、`master` 或手動執行時，安裝依賴、執行推薦規則測試與 TypeScript 檢查、建立靜態網頁，再部署到 GitHub Pages。它是部署工作流程，不是每日蒐集餐廳的排程；因此沒有 cron 排程或 API 金鑰。

1. 將專案上傳到你的 GitHub 儲存庫，包含 `.github/workflows/pages.yml`。
2. 到 **Settings → Pages → Build and deployment → Source**，選 **GitHub Actions**。
3. 開啟 **Actions → Build and deploy dinner app**，或推送一次 main/master。
4. 成功後，deploy 工作的網址就是 GitHub Pages 網址。

這個流程已在本機完成同等建置檢查，未替你在 GitHub 上執行。GitHub Pages 的可見性由你的儲存庫及 Pages 設定決定；目前線上預覽的私人存取控制不會自動搬到 GitHub Pages。

## 開發

需要 Node.js 24 和 pnpm 11.25.0。

```
pnpm install --frozen-lockfile
pnpm test
pnpm exec tsc --noEmit
pnpm build:static
```

靜態輸出在 `out/`。GitHub Pages 使用相對資產路徑，支援儲存庫子目錄。

網站託管版本使用 Vinext，`pnpm build` 產生 Worker 輸出。兩種部署共用 `app/page.tsx`、`app/globals.css` 與 `lib/dinner/`；修改一次，兩種輸出都會更新。

## 主要程式

| 路徑 | 用途 |
| --- | --- |
| `app/page.tsx` | 畫面與使用者操作 |
| `app/globals.css` | 桌機與手機版面 |
| `lib/dinner/seed.ts` | 內建店家與來源 |
| `lib/dinner/engine.ts` | 篩選、交替、營業時段、驗證 |
| `tests/dinner.test.mjs` | 核心規則測試 |
| `vite.static.config.ts`、`static/` | GitHub Pages 靜態入口 |
| `.github/workflows/pages.yml` | 建置、檢查與部署 |
