# 四色牌遊戲 🀄

> 台灣人必學的傳統桌遊，單人對戰電腦的 PWA 版本

[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](./README.md)
[![Version](https://img.shields.io/badge/version-v1.0.0-gold.svg)](./README.md)
[![Deploy](https://img.shields.io/badge/deploy-Vercel-black.svg)](https://sisetpai-pwa.vercel.app)

**🎮 立即遊玩：[https://sisetpai-pwa.vercel.app](https://sisetpai-pwa.vercel.app)**

---

## 簡介

四色牌（Four Color Cards）是源自中國、流傳於台灣民間的傳統紙牌遊戲。本專案以純 HTML + CSS + JavaScript 實作，無需安裝，開啟瀏覽器即可遊玩，並支援 PWA 離線安裝至手機桌面。

---

## 功能特色

- 🃏 完整四色牌規則（將帥、士仕、象相、車俥、馬傌、包炮、卒兵）
- 🤖 電腦 AI 對戰（自動組合、出牌、叫醒機制）
- 🎨 4 種場景 × 6 種牌面圖樣（動物、汪汪隊、皮克敏、こちら葛飾区亀有公園前派出所）
- 🀄 胡牌判斷（組合區 + 手中將帥，合計 8 胡以上）
- 📱 PWA 支援，可安裝至 iOS / Android 主畫面
- 💾 自動儲存牌局進度（localStorage）

---

## 遊戲規則摘要

| 組合 | 胡數 |
|------|------|
| 將／帥 單張 | 1 胡 |
| 同色將帥 二張 | 2 胡 |
| 將帥 三張 | 4 胡（明）/ 6 胡（暗）|
| 將帥 四張 | 8 胡（明）/ 10 胡（暗）|
| 順子高（同色）| 2 胡 |
| 順子低（同色）| 1 胡 |
| 兵卒 三張 | 3 胡 |
| 兵卒 四張 | 4 胡 |
| 同色同字 三張 | 1 胡（明）/ 3 胡（暗）|
| 同色同字 四張 | 6 胡（明）/ 8 胡（暗）|

**湊滿 8 胡即可宣告胡牌！**

---

## 技術架構

- **前端**：純 HTML5 / CSS3 / Vanilla JavaScript（單一檔案）
- **PWA**：Web App Manifest + Service Worker
- **部署**：Vercel（GitHub 自動串接）
- **儲存**：localStorage（無後端）

---

## 本地執行

```bash
# 使用 http-server（需先安裝 Node.js）
npx http-server . -p 8080

# 開啟瀏覽器
open http://localhost:8080
```

---

## 更新部署

```bash
git add sisetpai-pwa.html
git commit -m "更新說明"
git push
```

推送後 Vercel 自動重新部署（約 10–30 秒）。

---

## 版權聲明

```
四色牌遊戲 (Four Color Cards Game)
© 2026 彬程工作室 (Bin Cheng Studio) & 翁榮彬 (Rong-Bin Weng)
All Rights Reserved.
```

本程式之原始碼、美術資產及遊戲邏輯均受著作權法保護。
未經版權所有者書面授權，嚴禁以任何形式進行複製、修改、散佈或用於商業用途。

凡未經授權盜用、改作或冒名發布者，彬程工作室將保留法律追訴權。
