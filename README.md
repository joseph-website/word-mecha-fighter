# 打字機動戰士 (Word Mecha Fighter)

> 妙語如珠，例不虛發 —— 中文打字射擊遊戲。

[![Version: 1.2.0](https://img.shields.io/badge/Version-1.2.0-amber.svg)](package.json)
[![React: 19](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript: 5.x](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite: 8.x](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)

---

## 🎮 遊戲特色

- **空中漂浮的敵人，快用雷射擊破它！**：目標句子在空中漂浮，於下方輸入欄鍵入整句，按 `Enter` 或點擊「發射擊破」即可發動攻擊！
- **錯字、漏字，嚴格審查**：若有錯字、漏字或多餘的字，畫面會精確標示出來，並自動清空輸入欄。
- **支援各類輸入法**：支援注音、倉頡、拼音、大易、無暇米等中文輸入法皆可使用。
- **手機電腦皆可遊玩**：電腦支援原生鍵盤與輸入法、手機與平板亦可使用虛擬鍵盤。
- **多人連線，精采對決**：免註冊，透過WebRTC P2P連線，即時同步題目與戰況。
- **可以自訂題庫！**：除內建成語、詩詞、經典歌詞與散文等，亦提供CSV範本下載，可自行編輯、匯入，且資料離線儲存於 LocalStorage。
- **個人成績結算**：自動記錄CPM（每分鐘字數）、準確率、Combo等，且成績卡片可直接複製與分享。

---

## 🚀 快速啟動 (Quick Start)

### 1. 安裝相依套件
```bash
npm install
```

### 2. 啟動本地開發伺服器
```bash
npm run dev
```
瀏覽器開啟 `http://localhost:3000` 即可立即遊玩！

### 3. 生產版本編譯 (Build)
```bash
npm run build
```
產出的靜態網頁檔案位於 `dist/` 目錄。

---

## 📂 核心架構概覽

```text
├── index.html                   # 應用程式入口
├── package.json                 # v1.2.0 套件設定與指令
├── src/
│   ├── App.tsx                  # 主控制器、全域狀態與路由調度
│   ├── components/
│   │   ├── TypingArena.tsx      # 空中防衛戰場、雷射輸入與節流核心
│   │   ├── MultiplayerBattleBar.tsx # 單軌簡易對戰跑道 (~38px)
│   │   ├── MultiplayerLobby.tsx # 多人大廳與房間管理
│   │   ├── MultiplayerWaitingRoom.tsx # 多人準備室
│   │   ├── MultiplayerResultModal.tsx # 多人完賽頒獎台
│   │   ├── InstructionModal.tsx # 遊戲說明與玩法指南
│   │   ├── LeaderboardModal.tsx # 個人最佳成就與歷史排行榜
│   │   ├── QuestionBankModal.tsx# 題庫檢視與 Excel/CSV 匯入匯出
│   │   └── arena/               # 戰機砲塔 (FighterStation) 與複盤檢視
│   ├── data/
│   │   ├── questions.ts         # 題庫狀態管理與 CSV 工具
│   │   └── defaultQuestions.json# 內建 350 題在地文化文選
│   └── utils/
│       ├── audio.ts             # Web Audio API 脈衝倒數與擊破音效
│       ├── p2p.ts               # WebRTC PeerJS 連線引擎
│       ├── evaluator.ts         # LCS 智慧動態對齊字元評估器
│       ├── scoring.ts           # Net CPM 淨速度與評級計算
│       └── zhuyin.ts            # 教育部標準注音解析庫
```

---

## 📄 開源授權 (License)

本專案採 [MIT License](LICENSE) 授權釋出。
