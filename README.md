# 心平靜氣：小機械人能量控制遊戲

看到圓形就輕點，其他圖形請忍住。給小學一年級的 Go/No-Go 衝動控制練習，畫面與音效採低喚醒設計。

## 怎麼玩

1. 看到藍色**圓形**：在 1 秒內輕點圖案，或按下方「輕點這裡 (圓形專用)」。
2. 看到**其他圖形**（方形、三角形、星星）：手放開，不要按。
3. 兩個圖形之間，畫面中央會出現淺灰色十字 `+`，把視線放在那裡。
4. 一共 10 個回合。答對得 20 分，滿分 200 分。

右上角按鈕寫著「音效開」或「音效關」。預設是開。第一次點開始或點這個按鈕時，手機會解鎖聲音。

## 線上遊玩

https://robotsfunfun.github.io/

用手機直向開啟效果最好。第一次開啟後，服務工作程會把畫面暫存起來，之後沒有網路也能玩。也可以用瀏覽器的「加入主畫面」裝成 App。

## 在自己的電腦開啟

請在這個資料夾啟動靜態伺服器再開啟，不要直接用瀏覽器打開 `index.html`。遊戲以 ES module 載入 Lit，從 `file://` 開啟時瀏覽器會擋住模組，畫面會是空的。

```bash
python3 -m http.server 8080
```

然後開啟 http://localhost:8080/

第一次用 http 開啟後，服務工作程會把畫面暫存起來，之後沒有網路也能玩。

## English

Calm Energy is a portrait, mobile-first Go/No-Go game for first graders. Tap blue circles within one second. Do not tap squares, triangles, or stars. There are 10 rounds, 20 points for each correct response, and a maximum of 200.

Play: https://robotsfunfun.github.io/.

Serve this folder with any static server before opening it. The game loads Lit as an ES module, and browsers block that module from a `file://` URL, so opening `index.html` directly leaves the page blank.

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080/. After the first visit over HTTP, the service worker caches the app shell for offline play.