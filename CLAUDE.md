# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 版權聲明

所有程式碼頂部必須保留以下版權注解，不得移除或修改：

HTML 檔（`index.html`）：
```html
<!--
  四色牌遊戲 (Four Color Cards Game)
  © 2026 彬程工作室 (Bin Cheng Studio) & 翁榮彬 (Rong-Bin Weng)
  All Rights Reserved.
  未經授權嚴禁複製、修改、散佈或商業使用。
-->
```

JS / CSS 檔（`js/*.js`、`css/style.css`）：
```js
/*
  四色牌遊戲 (Four Color Cards Game)
  © 2026 彬程工作室 (Bin Cheng Studio) & 翁榮彬 (Rong-Bin Weng)
  All Rights Reserved.
  未經授權嚴禁複製、修改、散佈或商業使用。
*/
```

---

## 常用指令

```bash
# 本地開發伺服器（PWA manifest / sw.js 需要 HTTP）
npx http-server . -p 8080 --cors -c-1

# 備選：Python
python3 -m http.server 8081

# 推送部署（Vercel 自動串接，推送後約 10–30 秒更新）
git add sisetpai-pwa.html
git commit -m "說明"
git push
```

無 build/lint/test 流程——純靜態單檔專案。

---

## 備份規則

修改前**必須先備份**：

```
backups/YYYY-MM-DD_NNN_before_功能名稱.html
```

- `NNN` 為三位數遞增序號（最新：約 011）
- 備份對象：`sisetpai-pwa.html`（唯一主檔）

---

## 專案架構

```
四色牌遊戲/
├── index.html            ← 主入口，HTML 結構（652 行）
├── css/
│   └── style.css         ← 全部樣式（364 行）
├── js/
│   ├── pwa.js            ← SW 註冊 + PWA install prompt（28 行）
│   ├── game.js           ← 遊戲核心邏輯（1156 行）
│   └── bgm.js            ← BGM 控制（38 行）
├── sisetpai-pwa.html     ← 原始單檔備份（保留，勿刪）
├── manifest.json         ← PWA manifest（icon、theme color）
├── sw.js                 ← Service Worker（network-first）
└── bgm.mp3               ← 背景音樂
```

> **JS 載入順序**（index.html 內）：`pwa.js` → `game.js` → `bgm.js`
> `bgm.js` 的 `window.addEventListener('load', ...)` 依賴 `pwa.js` 的 `_refreshInstallBtn()`，需確保順序正確。

---

## 畫面（screens）

四個畫面共用 `.screen` / `.screen.hidden` 切換，透過 `show(id)` 函式控制：

| id | 說明 |
|----|------|
| `#home` | 主頁（新遊戲 / 繼續遊戲 / 玩法規則） |
| `#setupScreen` | 場景與圖樣選擇 |
| `#game` | 遊戲主畫面 |
| `#rules` | 玩法規則 |

Overlay 元素（非 `.screen`）：`#eatOverlay`、`#notifyOverlay`、`#modal`、`#tugWar`

---

## 全域遊戲狀態 `G`（約 line 1066）

```
G.deck            []         牌堆
G.playerHand      []         玩家手牌
G.cpuHand         []         電腦手牌
G.playerMelds     [][]       玩家已組合牌組
G.cpuMelds        [][]       電腦已組合牌組
G.topCard         card|null  場上最新出的牌
G.turn            'player'|'cpu'
G.phase           'play'|'eat'|'discard'
G.hasDrawn        bool       本回合是否已摸牌
G.mustDiscard     bool       吃牌後必須打出一張
G.drewFromEmpty   bool       手牌空後才摸牌
G.pScore          int        玩家勝場
G.cScore          int        電腦勝場
G.active          bool       遊戲進行中
```

`save()` → `localStorage('scp2')`；`loadGame()` 讀回。

---

## 牌組定義（約 line 1039）

- **顏色**：`g`（綠）、`w`（白）、`r`（紅）、`y`（黃）
- **綠/白**用字：將 士 象 車 馬 包 卒
- **紅/黃**用字：帥 仕 相 俥 傌 炮 兵
- 每色 7 字 × 4 張 = 28 張 × 4 色 = **112 張**

```js
JIANG[color]  // 該色的「將/帥」牌
BING[color]   // 該色的「卒/兵」牌
SHUN_HIGH[color]  // 高順（將士象 / 帥仕相）→ 2胡
SHUN_LOW[color]   // 低順（車馬包 / 俥傌炮）→ 1胡
```

---

## 胡數計算

```
meldType(cards)          → {ming, an, label}   單組胡數
totalHu(melds)           → int                  組合區總胡（加總 ming）
calcHuWithHand(hand,melds) → int                含手中未成組將/帥（各 +1胡）
checkWin(hand,melds)     → bool                 calcHuWithHand >= 8
```

`checkHuBtn()`（render 內呼叫）：hu≥8 **且** 手中無非將/帥散牌 → 顯示胡牌按鈕。

---

## 玩家回合流程

```
回合開始（hasDrawn=false, mustDiscard=false）
  ↓
[摸牌 playerDraw()]  [放棄 playerGiveUp()]  [吃牌 promptEat→doEat]
  hasDrawn=true        turn='cpu'             mustDiscard=true
  ↓
出牌 playCard(i) → turn='cpu' → cpuCheckEat()
組合 tryFormMeld()
胡牌 declareHu()

吃牌後：mustDiscard=true → selectCard → discardCard → turn='cpu'
```

---

## CPU 回合流程

```
cpuCheckEat()
  有場上牌且可吃 → 吃 → 出牌 → 換玩家回合
  否則 → cpuTurn()
    cpuTurn() → 摸牌 → cpuTryFormMelds() → cpuChooseDiscard() → 出牌 → 換玩家
```

- **Watchdog**：CPU 超過 6 秒無回應，自動呼叫 `wakeUpCpu(true)`
- **錘子按鈕**：3.5 秒後顯示 `#hammerBtn`，手動叫醒
- **拔河動畫**：玩家回合閒置 30 秒後觸發 `#tugWar`

---

## 按鈕顯示邏輯（render() 內）

```
drawBtn.off    = !(turn==='player' && !mustDiscard && !hasDrawn)
giveUpBtn.off  = !(turn==='player' && !mustDiscard && (!hasDrawn || drewFromEmpty) && 手牌非空或hu≥8)
meldBtn        = display:block 當 selectedForMeld.length>=2 && turn==='player' && !mustDiscard
cancelSelBtn   = display:block 當 selectedForMeld.length>=1 && turn==='player'
huBtn.show     = hu>=8 && hand全為將/帥
```

---

## 場景與圖樣

```
場景（4種）：default / sports / toilet / kochikame
圖樣（6種）：none / kochikame / zebra / animals / pikmin / pawpatrol
applySceneClasses(scene, pattern)  套用 CSS class 至 <body>
CARD_ICONS = {kochikame, pawpatrol, pikmin, animals}
```

---

## BGM

- `_bgmOn`（runtime flag）、`bgm.mp3`
- 首次進入顯示 `#bgmPrompt` 詢問視窗（sessionStorage `bgmAsked` 防重複）
- `toggleBGM()` / `bgmChoose(play)` 控制播放
