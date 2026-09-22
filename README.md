# 打字機動戰士 (Word Mecha Fighter)

> 妙語如珠，例不虛發 —— 中文打字射擊遊戲。

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.x-teal.svg)](https://tailwindcss.com/)

---

##  遊戲特色

- **空中漂浮的敵人，快用雷射擊破它！**：目標句子在空中漂浮，於下方輸入欄鍵入整句，按 `Enter` 或點擊「發射擊破」即可發動攻擊！
- **錯字、漏字，嚴格審查**：若有錯字、漏字或多餘的字，畫面會精確標示出來，並自動清空輸入欄。
- **支援各類輸入法**：支援注音、倉頡、拼音、大易、無暇米等中文輸入法皆可使用。
- **手機電腦皆可遊玩**：電腦支援原生鍵盤與輸入法、手機與平板亦可使用虛擬鍵盤。
- **多人連線，精采對決**：免註冊，透過WebRTC P2P連線，即時同步題目與戰況。
- **可以自訂題庫！**：除內建成語、詩詞、經典歌詞與散文等，亦提供CSV範本下載，可自行編輯、匯入，且資料離線儲存於 LocalStorage。
- **個人成績結算**：自動記錄CPM（每分鐘字數）、準確率、Combo等，且成績卡片可直接複製與分享。

---

## 🛠️ 本地開發與啟動 (Local Development)

### 1. 安裝相依套件

```bash
npm install
```

### 2. 啟動開發伺服器

```bash
npm run dev
```

開啟瀏覽器並造訪 `http://localhost:3000` 即可開始遊玩！

### 3. 編譯生產版本 (Build)

```bash
npm run build
```

產生的靜態網頁檔案將位於 `dist/` 目錄，可直接部署至 GitHub Pages、Vercel、Netlify 或 Cloudflare Pages。

---

## 📂 專案架構說明

```text
├── index.html                  # HTML 入口
├── package.json                # 專案相依性與指令
├── src/
│   ├── App.tsx                 # 主應用程式控制器與狀態流
│   ├── components/
│   │   ├── TypingArena.tsx     # 空中防衛射擊戰場與雷射輸入核心
│   │   ├── GameSetup.tsx       # 模式、難度與題數設定面板
│   │   ├── Header.tsx          # 頂部導覽與功能選單
│   │   ├── InstructionModal.tsx# 玩法說明與規則彈窗
│   │   ├── LeaderboardModal.tsx# 個人歷史紀錄與成績排行榜
│   │   ├── QuestionBankModal.tsx# 題庫檢視與 Excel/CSV 匯入匯出
│   │   ├── ResultModal.tsx     # 單人結算成績卡與社群分享
│   │   ├── MultiplayerLobby.tsx# 多人大廳與房間管理
│   │   ├── MultiplayerBattleBar.tsx # 多人即時同步進度跑道
│   │   └── MultiplayerResultModal.tsx # 多人頒獎典禮
│   ├── data/
│   │   └── questions.ts        # 題庫資料與 CSV 解析工具
│   ├── utils/
│   │   ├── audio.ts            # Web Audio API 倒數與擊破音效合成器
│   │   ├── leaderboard.ts      # 本機紀錄存取與等級計算
│   │   └── p2p.ts              # WebRTC P2P 多人連線引擎
│   └── types.ts                # TypeScript 介面定義
```

---

## 📄 開源授權 (License)

本專案採 [MIT License](LICENSE) 授權釋出。
