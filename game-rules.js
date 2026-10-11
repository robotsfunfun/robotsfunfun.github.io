export var CONFIG = {
  TOTAL_ROUNDS: 10,
  GO_RATIO: 0.6,
  GO_SHAPE: "circle",
  NO_GO_SHAPES: ["square", "triangle", "star"],
  DISPLAY_MS: 1000,
  ISI_MS: 1000,
  FEEDBACK_MS: 600,
  RESULTS_DELAY_MS: 150,
  DEBOUNCE_MS: 300,
  HIT_POINTS: 20,
  REJECTION_POINTS: 20,
  MAX_SCORE: 200
};

export var AUDIO = {
  hit: { freq: 600, type: "sine", duration: 0.1 },
  correctRejection: { freq: 700, type: "sine", duration: 0.1 },
  falseAlarm: { freq: 220, type: "triangle", duration: 0.15 },
  miss: { freq: 180, type: "sine", duration: 0.1 }
};

export var SHAPE_LABEL = {
  circle: "圓形",
  square: "正方形",
  triangle: "三角形",
  star: "星形"
};

export function judge(shape, tapped) {
  var isGo = shape === CONFIG.GO_SHAPE;
  if (isGo && tapped) {
    return {
      id: "hit",
      score: CONFIG.HIT_POINTS,
      text: "太棒了！+" + CONFIG.HIT_POINTS + "分",
      cue: "hit",
      good: true
    };
  }
  if (isGo && !tapped) {
    return { id: "miss", score: 0, text: "哎呀，漏掉了", cue: "miss", good: false };
  }
  if (!isGo && !tapped) {
    return {
      id: "correctRejection",
      score: CONFIG.REJECTION_POINTS,
      text: "忍得好！+" + CONFIG.REJECTION_POINTS + "分",
      cue: "correctRejection",
      good: true
    };
  }
  return { id: "falseAlarm", score: 0, text: "手放開，忍住喔！", cue: "falseAlarm", good: false };
}

export function tierMessage(score) {
  if (score >= CONFIG.MAX_SCORE) {
    return "🌟 完美的能量控制！你按到了所有圓形，而且看到其他圖形時都成功忍住不按，太厲害了！";
  }
  if (score >= 120 && score <= 180) {
    return "⚡ 反應超快的小達人！你表現得很棒！下次遇到不是圓形的圖案時，記得給自己 1 秒鐘深呼吸，手放開，就能拿到更高分喔！";
  }
  return "🌱 正在成長的冷靜法寶！今天練習得很認真喔。多玩幾次，你會越來越進步的！";
}

export function pickShape(random) {
  var roll = (random || Math.random)();
  if (roll < CONFIG.GO_RATIO) return CONFIG.GO_SHAPE;
  var nogoRoll = (random || Math.random)();
  var index = Math.floor(nogoRoll * CONFIG.NO_GO_SHAPES.length);
  if (index >= CONFIG.NO_GO_SHAPES.length) index = CONFIG.NO_GO_SHAPES.length - 1;
  return CONFIG.NO_GO_SHAPES[index];
}
