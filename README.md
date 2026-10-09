# 冷靜法寶：能量控制小遊戲

給小學一年級的 Go/No-Go 衝動控制練習。畫面、音效與回饋都採低喚醒設計：看到藍色圓形就輕點，看到其他圖形就把手放開。

## 怎麼玩

1. 看到藍色**圓形**：在 1 秒內輕點圖案，或按下方「輕點這裡 (圓形專用)」。
2. 看到**其他圖形**（方形、三角形、星星）：手放開，不要按。
3. 兩個圖形之間，畫面中央會出現淺灰色十字 `+`，把視線放在那裡。
4. 一共 10 個回合。答對得 20 分，滿分 200 分。

右上角可以開關音效。第一次點擊會解鎖手機的聲音播放。

## 線上遊玩

https://tsekityam.github.io/calm-energy-game/

用手機直向開啟效果最好。第一次開啟後，服務工作程會把畫面暫存起來，之後沒有網路也能玩。也可以用瀏覽器的「加入主畫面」裝成 App。

## 在自己的電腦開啟

直接用瀏覽器打開 `index.html` 就能玩。若要測試離線暫存，請在這個資料夾啟動靜態伺服器：

```bash
python3 -m http.server 8080
```

然後開啟 http://localhost:8080/

## English

Calm Energy is a portrait, mobile-first Go/No-Go game for first graders. Tap blue circles within one second. Do not tap squares, triangles, or stars. There are 10 rounds, 20 points for each correct response, and a maximum of 200.

Play: https://tsekityam.github.io/calm-energy-game/

Open `index.html` in a browser, or serve this folder with any static server. After the first visit over HTTP, the service worker caches the app shell for offline play.
