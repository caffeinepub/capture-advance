import type { Candle } from "./chartEngine";

// Map currency pair input (e.g., "EUR/USD") to Binance-compatible symbol
// Binance uses USDT pairs for crypto; for forex we use the API endpoint
// We'll use Binance's klines endpoint for crypto and map common forex pairs
// For pairs not on Binance, we'll return null and fallback to simulated data

const BINANCE_API = "https://api.binance.com/api/v3";

// Common crypto pair mappings
const CRYPTO_PAIRS: Record<string, string> = {
  "BTC/USDT": "BTCUSDT",
  "ETH/USDT": "ETHUSDT",
  "BNB/USDT": "BNBUSDT",
  "SOL/USDT": "SOLUSDT",
  "XRP/USDT": "XRPUSDT",
  "ADA/USDT": "ADAUSDT",
  "AVAX/USDT": "AVAXUSDT",
  "DOGE/USDT": "DOGEUSDT",
  "DOT/USDT": "DOTUSDT",
  "MATIC/USDT": "MATICUSDT",
  "LINK/USDT": "LINKUSDT",
  "LTC/USDT": "LTCUSDT",
  "UNI/USDT": "UNIUSDT",
  "ATOM/USDT": "ATOMUSDT",
  "TRX/USDT": "TRXUSDT",
  "NEAR/USDT": "NEARUSDT",
  "FTM/USDT": "FTMUSDT",
  "ALGO/USDT": "ALGOUSDT",
  "VET/USDT": "VETUSDT",
  "ICP/USDT": "ICPUSDT",
  "BTC/USD": "BTCUSDT",
  "ETH/USD": "ETHUSDT",
  BTCUSDT: "BTCUSDT",
  ETHUSDT: "ETHUSDT",
  SOLUSDT: "SOLUSDT",
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};

// Timeframe mapping for Binance API
function toBinanceInterval(tfMinutes: number): string {
  if (tfMinutes === 1) return "1m";
  if (tfMinutes === 5) return "5m";
  if (tfMinutes === 15) return "15m";
  if (tfMinutes === 60) return "1h";
  if (tfMinutes === 1440) return "1d";
  if (tfMinutes === 10080) return "1w";
  return "1m";
}

// Try to resolve symbol for Binance
function resolveSymbol(pair: string): string | null {
  const upper = pair.toUpperCase().trim();
  // Direct match
  if (CRYPTO_PAIRS[upper]) return CRYPTO_PAIRS[upper];
  // Try removing slash
  const noSlash = upper.replace("/", "");
  if (CRYPTO_PAIRS[noSlash]) return CRYPTO_PAIRS[noSlash];
  // If it looks like a known crypto (ends with USDT or has crypto base)
  if (
    noSlash.endsWith("USDT") ||
    noSlash.endsWith("BTC") ||
    noSlash.endsWith("ETH")
  ) {
    return noSlash;
  }
  // Forex pairs (EUR/USD, GBP/USD, etc.) are NOT on Binance - return null
  return null;
}

// Fetch current price for a symbol
export async function fetchCurrentPrice(pair: string): Promise<number | null> {
  const symbol = resolveSymbol(pair);
  if (!symbol) return null;

  try {
    const resp = await fetch(`${BINANCE_API}/ticker/price?symbol=${symbol}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return Number.parseFloat(data.price);
  } catch {
    return null;
  }
}

// Fetch OHLCV candle data from Binance
export async function fetchBinanceCandles(
  pair: string,
  timeframeMinutes: number,
  count = 120,
): Promise<Candle[] | null> {
  const symbol = resolveSymbol(pair);
  if (!symbol) return null;

  const interval = toBinanceInterval(timeframeMinutes);
  const url = `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${count}`;

  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const raw: Array<
      [number, string, string, string, string, string, ...unknown[]]
    > = await resp.json();

    if (!Array.isArray(raw) || raw.length === 0) return null;

    const candles: Candle[] = raw.map((k) => ({
      time: Math.floor(k[0] / 1000), // ms to seconds
      open: Number.parseFloat(k[1]),
      high: Number.parseFloat(k[2]),
      low: Number.parseFloat(k[3]),
      close: Number.parseFloat(k[4]),
      volume: Number.parseFloat(k[5]),
    }));

    return candles;
  } catch {
    return null;
  }
}

// Check if a pair is available on Binance
export function isCryptoPair(pair: string): boolean {
  return resolveSymbol(pair) !== null;
}

// Get ticker info: bid, ask, last price
export interface TickerInfo {
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
}

export async function fetchTickerInfo(
  pair: string,
): Promise<TickerInfo | null> {
  const symbol = resolveSymbol(pair);
  if (!symbol) return null;

  try {
    const resp = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    const last = Number.parseFloat(d.lastPrice);
    const spread = last * 0.0001;
    return {
      bid: Number.parseFloat(d.bidPrice) || last - spread,
      ask: Number.parseFloat(d.askPrice) || last + spread,
      last,
      change: Number.parseFloat(d.priceChange),
      changePercent: Number.parseFloat(d.priceChangePercent),
    };
  } catch {
    return null;
  }
}
