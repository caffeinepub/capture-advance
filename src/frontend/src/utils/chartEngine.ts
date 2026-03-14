export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartIndicators {
  ema9: number[];
  ema21: number[];
  rsi: number[];
}

export type CandlePattern =
  | "Bullish Engulfing"
  | "Bearish Engulfing"
  | "Doji"
  | "Hammer"
  | "Shooting Star"
  | "Morning Star"
  | "Evening Star"
  | "Three White Soldiers"
  | "Three Black Crows"
  | "Inside Bar"
  | "Neutral";

/** Calculate EMA for a series of close prices */
export function calcEMA(closes: number[], period: number): number[] {
  if (closes.length < period) return closes.map(() => 0);
  const k = 2 / (period + 1);
  const result: number[] = new Array(closes.length).fill(0);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  result[period - 1] = sum / period;

  for (let i = period; i < closes.length; i++) {
    result[i] = closes[i] * k + result[i - 1] * (1 - k);
  }
  return result;
}

/** Calculate RSI */
export function calcRSI(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return closes.map(() => 50);
  const result: number[] = new Array(closes.length).fill(50);
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

/** Detect candle pattern from last 5 candles */
export function detectPattern(candles: Candle[]): CandlePattern {
  if (candles.length < 2) return "Neutral";
  const curr = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!curr || !prev) return "Neutral";

  const currBody = Math.abs(curr.close - curr.open);
  const prevBody = Math.abs(prev.close - prev.open);
  const currRange = curr.high - curr.low;

  // Doji: tiny body relative to range
  if (currRange > 0 && currBody / currRange < 0.1) return "Doji";

  // Hammer: small body, long lower wick, at bottom
  const lowerWick = Math.min(curr.open, curr.close) - curr.low;
  const upperWick = curr.high - Math.max(curr.open, curr.close);
  if (currBody > 0 && lowerWick > currBody * 2 && upperWick < currBody * 0.5)
    return "Hammer";

  // Shooting Star: small body, long upper wick
  if (currBody > 0 && upperWick > currBody * 2 && lowerWick < currBody * 0.5)
    return "Shooting Star";

  // Bullish Engulfing
  if (
    prev.close < prev.open &&
    curr.close > curr.open &&
    curr.open < prev.close &&
    curr.close > prev.open &&
    currBody > prevBody
  )
    return "Bullish Engulfing";

  // Bearish Engulfing
  if (
    prev.close > prev.open &&
    curr.close < curr.open &&
    curr.open > prev.close &&
    curr.close < prev.open &&
    currBody > prevBody
  )
    return "Bearish Engulfing";

  // Inside Bar: current high/low completely within previous range
  if (curr.high < prev.high && curr.low > prev.low) return "Inside Bar";

  // 3-candle patterns
  if (candles.length >= 3) {
    const c1 = candles[candles.length - 3];
    const c2 = candles[candles.length - 2];
    const c3 = candles[candles.length - 1];

    const c1Body = Math.abs(c1.close - c1.open);
    const c2Body = Math.abs(c2.close - c2.open);
    const c1Midpoint = (c1.open + c1.close) / 2;

    // Morning Star: bearish + doji/small body + bullish closing above midpoint of first
    const isSmallBody2 = c2Body < c1Body * 0.4;
    if (
      c1.close < c1.open && // c1 bearish
      isSmallBody2 && // c2 small body (doji-like)
      c3.close > c3.open && // c3 bullish
      c3.close > c1Midpoint // c3 closes above midpoint of c1
    )
      return "Morning Star";

    // Evening Star: bullish + doji/small body + bearish closing below midpoint of first
    if (
      c1.close > c1.open && // c1 bullish
      isSmallBody2 && // c2 small body
      c3.close < c3.open && // c3 bearish
      c3.close < c1Midpoint // c3 closes below midpoint of c1
    )
      return "Evening Star";

    // Three White Soldiers: 3 consecutive bullish with higher highs
    if (
      c1.close > c1.open &&
      c2.close > c2.open &&
      c3.close > c3.open &&
      c2.close > c1.close &&
      c3.close > c2.close &&
      c2.high > c1.high &&
      c3.high > c2.high
    )
      return "Three White Soldiers";

    // Three Black Crows: 3 consecutive bearish with lower lows
    if (
      c1.close < c1.open &&
      c2.close < c2.open &&
      c3.close < c3.open &&
      c2.close < c1.close &&
      c3.close < c2.close &&
      c2.low < c1.low &&
      c3.low < c2.low
    )
      return "Three Black Crows";
  }

  return "Neutral";
}

/** Generate historical candle data for a timeframe */
export function generateHistoricalCandles(
  timeframeMinutes: number,
  count = 120,
  basePrice = 4500,
): Candle[] {
  const candles: Candle[] = [];
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = timeframeMinutes * 60;
  // Start at the aligned candle boundary
  const currentCandleStart =
    Math.floor(now / intervalSeconds) * intervalSeconds;
  const startTime = currentCandleStart - (count - 1) * intervalSeconds;

  let price = basePrice;
  const volatility =
    timeframeMinutes <= 1
      ? 8
      : timeframeMinutes <= 5
        ? 15
        : timeframeMinutes <= 15
          ? 30
          : 50;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * intervalSeconds;
    const open = price;
    const moveCount = Math.max(4, Math.floor(timeframeMinutes * 2));
    let high = open;
    let low = open;
    let close = open;

    for (let j = 0; j < moveCount; j++) {
      const move = (Math.random() - 0.48) * volatility;
      close += move;
      high = Math.max(high, close);
      low = Math.min(low, close);
    }

    // Mean reversion bias
    const distFromBase = (price - basePrice) / basePrice;
    close -= distFromBase * basePrice * 0.01;
    high = Math.max(open, close, high) + Math.random() * volatility * 0.3;
    low = Math.min(open, close, low) - Math.random() * volatility * 0.3;
    high = Math.max(high, open, close);
    low = Math.min(low, open, close);

    const volume = 500 + Math.random() * 2000;
    candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  return candles;
}

/** Get timeframe duration in minutes */
export function timeframeToMinutes(tf: string): number {
  switch (tf) {
    case "m1":
      return 1;
    case "m5":
      return 5;
    case "m15":
      return 15;
    case "h1":
      return 60;
    case "d1":
      return 1440;
    case "w1":
      return 10080;
    default:
      return 1;
  }
}

/** Get seconds until next candle close, aligned to Brasília time (UTC-3).
 *  Pocket Option and most binary brokers use server time aligned to UTC boundaries,
 *  so candle closes happen at exact UTC minute multiples.
 *  We subtract clock drift by using performance.now() for sub-second accuracy. */
export function getSecondsToNextCandle(timeframeMinutes: number): number {
  // Use UTC timestamp (broker candles close at UTC boundaries)
  const nowMs = Date.now();
  const nowSec = nowMs / 1000;
  const intervalSeconds = timeframeMinutes * 60;
  const elapsed = nowSec % intervalSeconds;
  const remaining = intervalSeconds - elapsed;
  // Return integer, clamped to [0, intervalSeconds]
  return Math.max(0, Math.min(intervalSeconds, Math.round(remaining)));
}

/** Get current Brasília time string (UTC-3) */
export function getBrasiliaTimeString(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hh = brt.getUTCHours().toString().padStart(2, "0");
  const mm = brt.getUTCMinutes().toString().padStart(2, "0");
  const ss = brt.getUTCSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Compute signal from indicators */
export interface SignalResult {
  direction: "buy" | "sell";
  confidence: number;
  ema9: number;
  ema21: number;
  rsi: number;
  pattern: CandlePattern;
  emaStatus: string;
}

export function computeSignal(
  candles: Candle[],
  sensitivity: "conservative" | "normal" | "aggressive",
): SignalResult | null {
  if (candles.length < 25) return null;

  const closes = candles.map((c) => c.close);
  const ema9arr = calcEMA(closes, 9);
  const ema21arr = calcEMA(closes, 21);
  const rsiArr = calcRSI(closes, 14);

  const last = closes.length - 1;
  const ema9 = ema9arr[last];
  const ema21 = ema21arr[last];
  const rsi = rsiArr[last];
  const pattern = detectPattern(candles);

  let score = 0; // positive = buy, negative = sell

  // EMA crossover signal
  const emaCross = ema9 - ema21;
  const prevEmaCross = ema9arr[last - 1] - ema21arr[last - 1];
  if (emaCross > 0 && prevEmaCross <= 0)
    score += 40; // fresh bullish cross
  else if (emaCross < 0 && prevEmaCross >= 0)
    score -= 40; // fresh bearish cross
  else if (emaCross > 0) score += 20;
  else score -= 20;

  // RSI
  if (rsi < 30)
    score += 35; // oversold
  else if (rsi < 40) score += 15;
  else if (rsi > 70)
    score -= 35; // overbought
  else if (rsi > 60) score -= 15;

  // Candle pattern — multi-candle patterns get higher weight (+/-35)
  if (pattern === "Three White Soldiers" || pattern === "Morning Star")
    score += 35;
  else if (pattern === "Three Black Crows" || pattern === "Evening Star")
    score -= 35;
  else if (pattern === "Bullish Engulfing" || pattern === "Hammer") score += 25;
  else if (pattern === "Bearish Engulfing" || pattern === "Shooting Star")
    score -= 25;
  else if (pattern === "Inside Bar")
    score = score * 0.85; // slight indecision
  else if (pattern === "Doji") score = score * 0.7; // uncertainty

  // Sensitivity adjustment
  const threshold =
    sensitivity === "conservative"
      ? 40
      : sensitivity === "aggressive"
        ? 15
        : 25;

  if (Math.abs(score) < threshold) return null;

  const direction = score > 0 ? "buy" : "sell";
  const maxScore = 100;
  const rawConf = Math.min(100, (Math.abs(score) / maxScore) * 100);
  const confidence = Math.round(Math.max(55, Math.min(99, rawConf * 1.2)));

  const emaStatus = ema9 > ema21 ? "EMA Bullish Cross" : "EMA Bearish Cross";

  return { direction, confidence, ema9, ema21, rsi, pattern, emaStatus };
}

/** Draw the candlestick chart on a canvas */
export interface DrawChartOptions {
  canvas: HTMLCanvasElement;
  candles: Candle[];
  ema9: number[];
  ema21: number[];
  visibleCount?: number;
}

export function drawChart(opts: DrawChartOptions): void {
  const { canvas, candles, ema9, ema21 } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const priceHeight = H * 0.65;
  const volumeHeight = H * 0.2;
  const padding = { left: 8, right: 72, top: 10, bottom: 4 };
  const pricePad = 8;

  const visibleCount = Math.min(80, candles.length);
  const visible = candles.slice(-visibleCount);
  const visibleEma9 = ema9.slice(-visibleCount);
  const visibleEma21 = ema21.slice(-visibleCount);

  // Clear
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0a0a0d";
  ctx.fillRect(0, 0, W, H);

  // Draw grid
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  const gridRows = 5;
  for (let i = 0; i <= gridRows; i++) {
    const y =
      padding.top +
      (i / gridRows) * (priceHeight - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  if (visible.length === 0) return;

  // Price range
  const minLow = Math.min(...visible.map((c) => c.low));
  const maxHigh = Math.max(...visible.map((c) => c.high));
  const priceRange = maxHigh - minLow || 1;
  const priceZoneH = priceHeight - padding.top - padding.bottom;
  const chartWidth = W - padding.left - padding.right;

  const toX = (i: number) => padding.left + (i / visibleCount) * chartWidth;
  const toY = (price: number) =>
    padding.top +
    (1 - (price - minLow) / priceRange) * (priceZoneH - pricePad * 2) +
    pricePad;

  const candleW = Math.max(2, (chartWidth / visibleCount) * 0.7);

  // Volume bars
  const maxVol = Math.max(...visible.map((c) => c.volume)) || 1;
  const volTop = priceHeight + 4;
  const volH = volumeHeight - 8;
  visible.forEach((candle, i) => {
    const x = toX(i) + chartWidth / visibleCount / 2;
    const barH = (candle.volume / maxVol) * volH;
    ctx.fillStyle =
      candle.close >= candle.open
        ? "rgba(0,200,83,0.35)"
        : "rgba(255,23,68,0.35)";
    ctx.fillRect(x - candleW / 2, volTop + volH - barH, candleW, barH);
  });

  // EMA lines
  const drawEMA = (arr: number[], color: string) => {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    let started = false;
    arr.forEach((v, i) => {
      if (v === 0) return;
      const x = toX(i) + chartWidth / visibleCount / 2;
      const y = toY(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  };

  drawEMA(visibleEma9, "rgba(0, 229, 255, 0.85)");
  drawEMA(visibleEma21, "rgba(255, 214, 0, 0.85)");

  // Candles
  visible.forEach((candle, i) => {
    const x = toX(i) + chartWidth / visibleCount / 2;
    const isBull = candle.close >= candle.open;
    const color = isBull ? "#00c853" : "#ff1744";

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, toY(candle.high));
    ctx.lineTo(x, toY(candle.low));
    ctx.stroke();

    // Body
    const bodyTop = toY(Math.max(candle.open, candle.close));
    const bodyBottom = toY(Math.min(candle.open, candle.close));
    const bodyH = Math.max(1, bodyBottom - bodyTop);

    if (isBull) {
      ctx.fillStyle = "#00c853";
      ctx.strokeStyle = "#00c853";
    } else {
      ctx.fillStyle = "#ff1744";
      ctx.strokeStyle = "#ff1744";
    }

    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
  });

  // Price labels on right
  ctx.fillStyle = "rgba(150,160,180,0.7)";
  ctx.font = `10px "JetBrains Mono", monospace`;
  ctx.textAlign = "left";
  for (let i = 0; i <= gridRows; i++) {
    const price = maxHigh - (i / gridRows) * priceRange;
    const y =
      padding.top + (i / gridRows) * (priceZoneH - pricePad * 2) + pricePad;
    ctx.fillText(price.toFixed(2), W - padding.right + 4, y + 3);
  }

  // Highlight last candle (current)
  const lastCandle = visible[visible.length - 1];
  if (lastCandle) {
    const lx = toX(visibleCount - 1) + chartWidth / visibleCount / 2;
    // Current price line
    const closeY = toY(lastCandle.close);
    ctx.strokeStyle =
      lastCandle.close >= lastCandle.open
        ? "rgba(0,200,83,0.5)"
        : "rgba(255,23,68,0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, closeY);
    ctx.lineTo(W - padding.right, closeY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price tag
    const priceColor =
      lastCandle.close >= lastCandle.open ? "#00c853" : "#ff1744";
    ctx.fillStyle = priceColor;
    ctx.fillRect(W - padding.right, closeY - 10, padding.right, 20);
    ctx.fillStyle = "#000";
    ctx.font = `bold 10px "JetBrains Mono", monospace`;
    ctx.textAlign = "center";
    ctx.fillText(
      lastCandle.close.toFixed(2),
      W - padding.right / 2,
      closeY + 4,
    );
    ctx.textAlign = "left";

    // Mark current candle
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    const bodyTop = toY(Math.max(lastCandle.open, lastCandle.close));
    const bodyH = Math.max(
      1,
      toY(Math.min(lastCandle.open, lastCandle.close)) - bodyTop,
    );
    ctx.strokeRect(lx - candleW / 2 - 2, bodyTop - 2, candleW + 4, bodyH + 4);
  }
}

/** Draw RSI oscillator */
export function drawRSI(canvas: HTMLCanvasElement, rsi: number[]): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const padding = { left: 8, right: 72, top: 6, bottom: 6 };

  ctx.fillStyle = "#0a0a0d";
  ctx.fillRect(0, 0, W, H);

  // Grid + levels
  const levels = [30, 50, 70];
  ctx.font = `9px "JetBrains Mono", monospace`;
  ctx.textAlign = "left";
  for (const lvl of levels) {
    const y =
      padding.top + (1 - (lvl - 0) / 100) * (H - padding.top - padding.bottom);
    ctx.strokeStyle =
      lvl === 50 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash(lvl === 50 ? [] : [3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(150,160,180,0.6)";
    ctx.fillText(String(lvl), W - padding.right + 4, y + 3);
  }

  const visibleCount = Math.min(80, rsi.length);
  const visible = rsi.slice(-visibleCount);
  const chartWidth = W - padding.left - padding.right;

  // RSI line with gradient fill
  if (visible.length > 1) {
    const toX = (i: number) =>
      padding.left +
      (i / visibleCount) * chartWidth +
      chartWidth / visibleCount / 2;
    const toY = (v: number) =>
      padding.top + (1 - v / 100) * (H - padding.top - padding.bottom);

    // Fill area
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(visible[0]));
    for (let i = 1; i < visible.length; i++) {
      ctx.lineTo(toX(i), toY(visible[i]));
    }
    ctx.lineTo(toX(visible.length - 1), H);
    ctx.lineTo(toX(0), H);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const lastRSI = visible[visible.length - 1];
    if (lastRSI < 30) {
      grad.addColorStop(0, "rgba(0,200,83,0.3)");
      grad.addColorStop(1, "rgba(0,200,83,0.02)");
    } else if (lastRSI > 70) {
      grad.addColorStop(0, "rgba(255,23,68,0.3)");
      grad.addColorStop(1, "rgba(255,23,68,0.02)");
    } else {
      grad.addColorStop(0, "rgba(100,150,255,0.2)");
      grad.addColorStop(1, "rgba(100,150,255,0.02)");
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(visible[0]));
    for (let i = 1; i < visible.length; i++) {
      ctx.lineTo(toX(i), toY(visible[i]));
    }
    ctx.strokeStyle =
      lastRSI < 30 ? "#00c853" : lastRSI > 70 ? "#ff1744" : "#6490ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current RSI label
    const lastX = toX(visible.length - 1);
    const lastY = toY(lastRSI);
    ctx.fillStyle =
      lastRSI < 30 ? "#00c853" : lastRSI > 70 ? "#ff1744" : "#6490ff";
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
