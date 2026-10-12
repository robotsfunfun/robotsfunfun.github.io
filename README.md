# 心平靜氣：小機械人能量控制遊戲

版本 **1.1.8**（由 1.0.0 升級：20 關、800ms 顯示、隨機 ISI、滿分 400；1.1.1 修正離線快取；1.1.2 修正結算頁機械人輪廓；1.1.3 結算頁按鈕間距；1.1.4 統一全站設計 tokens；1.1.5 機械人與刺激圖形改走 CSS 色票；1.1.6 首頁與結算頁機械人同色；1.1.7 回合增至 20、滿分 400；1.1.8 結算分級改為 400 / 260–380 / ≤240）。

畫面樣式以 Material Design 3 的 token 思路統一（8dp 間距、語意色、圓角階梯、elevation），並保留童趣的立體按鈕手感。

腳本固定為 `app.js?v=x.y.z`：shell 資產採 network-first，快取比對不使用 `ignoreSearch`，之後不必改檔名。

看到圓形就輕點，其他圖形請忍住。給小學一年級的 Go/No-Go 衝動控制練習，畫面與音效採低喚醒設計。

## 怎麼玩

1. 看到藍色**圓形**：在 0.8 秒內輕點圖案，或按下方「輕點這裡 (圓形專用)」。
2. 看到**其他圖形**（方形、三角形、星星）：手放開，不要按。
3. 兩個圖形之間，畫面中央會出現淺灰色十字 `+`，把視線放在那裡（間隔約 0.7–1 秒，會隨機變化）。
4. 一共 20 個回合。答對得 20 分，滿分 400 分。按鈕與圖形點擊有約 0.28 秒防連點冷卻。

右上角按鈕寫著「音效開」或「音效關」。預設是開。第一次點開始或點這個按鈕時，手機會解鎖聲音。

## 線上遊玩

https://robotsfunfun.github.io/

用手機直向開啟效果最好。第一次開啟後，服務工作程會把畫面暫存起來，之後沒有網路也能玩。也可以用瀏覽器的「加入主畫面」裝成 App。

## 在自己的電腦開啟

直接用瀏覽器打開 `index.html` 就能玩。若要測試離線暫存，請在這個資料夾啟動靜態伺服器：

```bash
python3 -m http.server 8080
```

然後開啟 http://localhost:8080/

## English

Calm Energy is a portrait, mobile-first Go/No-Go game for first graders. Tap blue circles within 0.8 seconds. Do not tap squares, triangles, or stars. There are 20 rounds, 20 points for each correct response, and a maximum of 400. Fixation ISI varies randomly between 700–1000 ms; taps are debounce-guarded (~280 ms).

Play: https://robotsfunfun.github.io/.

Open `index.html` in a browser, or serve this folder with any static server. After the first visit over HTTP, the service worker caches the app shell for offline play.
