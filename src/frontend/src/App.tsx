import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CountdownPanel } from "./components/CountdownPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SignalHistory } from "./components/SignalHistory";
import { SignalPanel } from "./components/SignalPanel";
import { Toaster } from "./components/ui/sonner";
import {
  Direction,
  Sensitivity,
  SignalOutcome,
  Timeframe,
  useGetLastSignals,
  useGetSettings,
  useSaveOutcome,
  useSaveSignal,
  useUpdateSettings,
} from "./hooks/useQueries";
import {
  type Candle,
  type CandlePattern,
  type SignalResult,
  calcEMA,
  calcRSI,
  computeSignal,
  detectPattern,
  generateHistoricalCandles,
  getSecondsToNextCandle,
  timeframeToMinutes,
} from "./utils/chartEngine";

const TIMEFRAME_LABELS: { key: Timeframe; label: string }[] = [
  { key: Timeframe.m1, label: "1m" },
  { key: Timeframe.m5, label: "5m" },
  { key: Timeframe.m15, label: "15m" },
  { key: Timeframe.h1, label: "1H" },
  { key: Timeframe.d1, label: "1D" },
  { key: Timeframe.w1, label: "1W" },
];

function getTickIntervalMs(tf: Timeframe): number {
  switch (tf) {
    case Timeframe.m1:
      return 1000;
    case Timeframe.m5:
      return 2000;
    case Timeframe.m15:
      return 3000;
    case Timeframe.h1:
      return 5000;
    default:
      return 8000;
  }
}

export default function App() {
  const [timeframe, setTimeframe] = useState<Timeframe>(Timeframe.m1);
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateHistoricalCandles(1, 120, 4500),
  );
  const [signal, setSignal] = useState<SignalResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sensitivity, setSensitivity] = useState<Sensitivity>(
    Sensitivity.normal,
  );
  const [bid, setBid] = useState(4500);
  const [ask, setAsk] = useState(4503.5);
  const [lastPrice, setLastPrice] = useState(4501.2);
  const [openPrice] = useState(4500);
  const signalFiredRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountdownRef = useRef(0);
  const triggerRef = useRef<(() => void) | null>(null);

  const { data: savedSignals = [], isLoading: signalsLoading } =
    useGetLastSignals(5);
  const { data: settings } = useGetSettings();
  const saveSignalMutation = useSaveSignal();
  const saveOutcomeMutation = useSaveOutcome();
  const updateSettingsMutation = useUpdateSettings();

  useEffect(() => {
    if (settings) {
      setSensitivity(settings.signalSensitivity);
      setTimeframe(settings.selectedTimeframe);
    }
  }, [settings]);

  const initChart = useCallback((tf: Timeframe) => {
    const minutes = timeframeToMinutes(tf);
    const newCandles = generateHistoricalCandles(minutes, 120, 4500);
    setCandles(newCandles);
    setSignal(null);
    signalFiredRef.current = false;
  }, []);

  const saveSignalMutate = saveSignalMutation.mutate;

  useEffect(() => {
    if (!signal) return;
    saveSignalMutate({
      direction: signal.direction === "buy" ? Direction.buy : Direction.sell,
      timeframe,
      confidenceScore: signal.confidence,
      ema9: signal.ema9,
      ema21: signal.ema21,
      rsi: signal.rsi,
      candlePattern: signal.pattern,
    });
    const dir = signal.direction.toUpperCase();
    const color = signal.direction === "buy" ? "#00c853" : "#ff1744";
    toast.success(`Sinal ${dir} — Confiança ${signal.confidence}%`, {
      style: {
        background: "rgba(8,8,16,0.95)",
        border: `1px solid ${color}`,
        color,
        backdropFilter: "blur(12px)",
      },
    });
  }, [signal, timeframe, saveSignalMutate]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    const intervalMs = getTickIntervalMs(timeframe);
    const minutes = timeframeToMinutes(timeframe);
    const intervalSeconds = minutes * 60;

    tickRef.current = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const now = Math.floor(Date.now() / 1000);
        const candleStart = Math.floor(now / intervalSeconds) * intervalSeconds;

        const volatility = minutes <= 1 ? 2 : minutes <= 5 ? 4 : 8;
        const move = (Math.random() - 0.49) * volatility;
        const newClose = Math.max(100, last.close + move);
        const spread = newClose * 0.0001;

        setBid(newClose - spread);
        setAsk(newClose + spread);
        setLastPrice(newClose);

        if (candleStart > last.time) {
          const newCandle: Candle = {
            time: candleStart,
            open: last.close,
            high: Math.max(last.close, newClose),
            low: Math.min(last.close, newClose),
            close: newClose,
            volume: 500 + Math.random() * 1000,
          };
          return [...prev.slice(-119), newCandle];
        }

        const updated: Candle = {
          ...last,
          high: Math.max(last.high, newClose),
          low: Math.min(last.low, newClose),
          close: newClose,
          volume: last.volume + Math.random() * 50,
        };
        return [...prev.slice(0, -1), updated];
      });
    }, intervalMs);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [timeframe]);

  const triggerSignalAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setSignal(null);

    setTimeout(() => {
      setCandles((prev) => {
        const result = computeSignal(prev, sensitivity);
        setIsAnalyzing(false);
        if (result) {
          setSignal(result);
        } else {
          toast.info("Análise concluída — sem sinal claro", {
            style: {
              background: "rgba(8,8,16,0.9)",
              color: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(12px)",
            },
          });
        }
        return prev;
      });
    }, 1800);
  }, [sensitivity]);

  useEffect(() => {
    triggerRef.current = triggerSignalAnalysis;
  }, [triggerSignalAnalysis]);

  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);

    const updateCountdown = () => {
      const minutes = timeframeToMinutes(timeframe);
      const secs = getSecondsToNextCandle(minutes);
      setCountdown(secs);

      const isSignalWindow = secs <= 20 && secs > 0;

      if (
        isSignalWindow &&
        prevCountdownRef.current > 20 &&
        !signalFiredRef.current
      ) {
        signalFiredRef.current = true;
        triggerRef.current?.();
      }

      if (secs > 20) {
        signalFiredRef.current = false;
      }

      prevCountdownRef.current = secs;
    };

    updateCountdown();
    countdownRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [timeframe]);

  function handleTimeframeChange(tf: Timeframe) {
    setTimeframe(tf);
    initChart(tf);
    updateSettingsMutation.mutate({
      selectedTimeframe: tf,
      signalSensitivity: sensitivity,
    });
  }

  function handleSensitivityChange(s: Sensitivity) {
    setSensitivity(s);
  }

  function handleSaveSettings() {
    updateSettingsMutation.mutate({
      selectedTimeframe: timeframe,
      signalSensitivity: sensitivity,
    });
    toast.success("Configurações salvas");
  }

  function handleMarkOutcome(signalId: bigint, outcome: SignalOutcome) {
    saveOutcomeMutation.mutate({ signalId, outcome });
    toast.success(
      outcome === SignalOutcome.win ? "Marcado como WIN!" : "Marcado como LOSS",
    );
  }

  const closes = candles.map((c) => c.close);
  const ema9Arr = calcEMA(closes, 9);
  const ema21Arr = calcEMA(closes, 21);
  const rsiArr = calcRSI(closes, 14);
  const lastIdx = closes.length - 1;
  const currentEma9 = ema9Arr[lastIdx] || 0;
  const currentEma21 = ema21Arr[lastIdx] || 0;
  const currentRsi = rsiArr[lastIdx] || 50;
  const currentPattern: CandlePattern = detectPattern(candles);
  const emaStatus =
    currentEma9 > currentEma21 ? "EMA Bullish Cross" : "EMA Bearish Cross";

  const isSignalWindow = countdown <= 20 && countdown > 0;
  const change = lastPrice - openPrice;
  const changePercent = (change / openPrice) * 100;

  return (
    /* Full transparent root — simulates overlay on broker screen */
    <div
      className="w-full h-screen flex items-center justify-end overflow-hidden"
      style={{ background: "transparent" }}
    >
      <Toaster position="top-right" />

      {/* 
        Ghost scan grid behind panel (subtle, to give depth without blocking broker view)
      */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,200,83,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,83,0.015) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          zIndex: 0,
        }}
      />

      {/* === FLOATING OVERLAY PANEL === */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative flex flex-col h-screen overflow-hidden"
        style={{
          width: "360px",
          zIndex: 10,
        }}
      >
        {/* Outer border glow frame */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            border: "1px solid rgba(0,200,83,0.25)",
            boxShadow: signal
              ? signal.direction === "buy"
                ? "inset 0 0 60px rgba(0,200,83,0.08), 0 0 40px rgba(0,200,83,0.12), -2px 0 30px rgba(0,200,83,0.1)"
                : "inset 0 0 60px rgba(255,23,68,0.08), 0 0 40px rgba(255,23,68,0.12), -2px 0 30px rgba(255,23,68,0.1)"
              : "inset 0 0 40px rgba(0,200,83,0.04), 0 0 20px rgba(0,200,83,0.06)",
            transition: "box-shadow 0.8s ease",
            zIndex: 20,
          }}
        />

        {/* Top-left corner bracket */}
        <div
          className="absolute top-0 left-0 w-4 h-4 pointer-events-none"
          style={{ zIndex: 21 }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 12,
              height: 12,
              borderTop: "2px solid #00c853",
              borderLeft: "2px solid #00c853",
              opacity: 0.9,
            }}
          />
        </div>
        {/* Top-right corner bracket */}
        <div
          className="absolute top-0 right-0 w-4 h-4 pointer-events-none"
          style={{ zIndex: 21 }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 12,
              height: 12,
              borderTop: "2px solid #00c853",
              borderRight: "2px solid #00c853",
              opacity: 0.9,
            }}
          />
        </div>
        {/* Bottom-left corner bracket */}
        <div
          className="absolute bottom-0 left-0 w-4 h-4 pointer-events-none"
          style={{ zIndex: 21 }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 12,
              height: 12,
              borderBottom: "2px solid #00c853",
              borderLeft: "2px solid #00c853",
              opacity: 0.9,
            }}
          />
        </div>
        {/* Bottom-right corner bracket */}
        <div
          className="absolute bottom-0 right-0 w-4 h-4 pointer-events-none"
          style={{ zIndex: 21 }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderBottom: "2px solid #00c853",
              borderRight: "2px solid #00c853",
              opacity: 0.9,
            }}
          />
        </div>

        {/* Scan line sweep effect */}
        <motion.div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(0,200,83,0.35), transparent)",
            zIndex: 22,
          }}
          animate={{ top: ["0%", "100%"] }}
          transition={{
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
            repeatDelay: 3,
          }}
        />

        {/* Glass background */}
        <div className="absolute inset-0 glass-overlay" style={{ zIndex: 1 }} />

        {/* Content */}
        <div
          className="relative flex flex-col h-full overflow-hidden"
          style={{ zIndex: 5 }}
        >
          {/* Title Bar */}
          <header
            className="flex items-center justify-between px-3 py-2 flex-shrink-0"
            style={{
              background: "rgba(0,200,83,0.06)",
              borderBottom: "1px solid rgba(0,200,83,0.18)",
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded flex items-center justify-center font-black text-[9px] font-mono"
                style={{
                  background: "linear-gradient(135deg, #00c853, #00e676)",
                  color: "#000",
                  boxShadow: "0 0 10px rgba(0,200,83,0.6)",
                }}
              >
                CA
              </div>
              <div>
                <div
                  className="text-xs font-black font-mono tracking-wider"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  CAPTURE <span style={{ color: "#00c853" }}>ADVANCE</span>
                </div>
                <div className="text-[8px] font-mono text-white/25 tracking-widest">
                  AI SIGNAL ANALYZER
                </div>
              </div>
            </div>

            {/* Right: LIVE + Settings */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded"
                style={{
                  background: "rgba(0,200,83,0.1)",
                  border: "1px solid rgba(0,200,83,0.2)",
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
                <span className="text-[9px] font-mono text-[#00c853] font-semibold">
                  LIVE
                </span>
              </div>

              <SettingsPanel
                sensitivity={sensitivity}
                timeframe={timeframe}
                onSensitivityChange={handleSensitivityChange}
                onSave={handleSaveSettings}
              />
            </div>
          </header>

          {/* Timeframe selector */}
          <div
            className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0"
            style={{
              background: "rgba(0,0,0,0.25)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            {TIMEFRAME_LABELS.map(({ key, label }, i) => (
              <button
                type="button"
                key={key}
                onClick={() => handleTimeframeChange(key)}
                className="flex-1 py-1 rounded text-[10px] font-mono font-bold transition-all"
                style={{
                  color: timeframe === key ? "#000" : "rgba(255,255,255,0.3)",
                  background:
                    timeframe === key
                      ? "linear-gradient(135deg, #00c853, #00e676)"
                      : "rgba(255,255,255,0.04)",
                  boxShadow:
                    timeframe === key ? "0 0 10px rgba(0,200,83,0.5)" : "none",
                  border:
                    timeframe === key
                      ? "none"
                      : "1px solid rgba(255,255,255,0.06)",
                }}
                data-ocid={`timeframe.tab.${i + 1}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Price ticker strip */}
          <div
            className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
            style={{
              background: "rgba(0,0,0,0.3)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-white/25">BID</span>
              <span className="text-[11px] font-mono font-bold text-[#00c853]">
                {bid.toFixed(2)}
              </span>
            </div>
            <div className="text-center">
              <div className="text-[12px] font-black font-mono text-white/80">
                {lastPrice.toFixed(2)}
              </div>
              <div
                className="text-[9px] font-mono font-semibold"
                style={{ color: change >= 0 ? "#00c853" : "#ff1744" }}
              >
                {change >= 0 ? "+" : ""}
                {changePercent.toFixed(2)}%
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono text-white/25">ASK</span>
              <span className="text-[11px] font-mono font-bold text-[#ff1744]">
                {ask.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <CountdownPanel
              seconds={countdown}
              timeframe={timeframe}
              isSignalWindow={isSignalWindow}
            />

            <SignalPanel
              signal={signal}
              isAnalyzing={isAnalyzing}
              countdown={countdown}
              rsiValue={currentRsi}
              ema9={currentEma9}
              ema21={currentEma21}
              pattern={currentPattern}
              emaStatus={emaStatus}
            />

            <SignalHistory
              signals={savedSignals}
              isLoading={signalsLoading}
              onMarkOutcome={handleMarkOutcome}
            />
          </div>

          {/* Footer strip */}
          <div
            className="flex items-center justify-center py-1 flex-shrink-0"
            style={{
              borderTop: "1px solid rgba(0,200,83,0.1)",
              background: "rgba(0,0,0,0.4)",
            }}
          >
            <span className="text-[8px] font-mono text-white/15">
              © {new Date().getFullYear()}{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/20 hover:text-white/35 transition-colors"
              >
                caffeine.ai
              </a>
            </span>
          </div>
        </div>
      </motion.div>

      {/* Signal flash overlay (full screen) */}
      <AnimatePresence>
        {signal && (
          <motion.div
            key={`flash-${signal.direction}-${signal.confidence}`}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: "easeOut" }}
            className="pointer-events-none fixed inset-0"
            style={{
              background:
                signal.direction === "buy"
                  ? "radial-gradient(circle at 85% 50%, rgba(0,200,83,0.12) 0%, transparent 60%)"
                  : "radial-gradient(circle at 85% 50%, rgba(255,23,68,0.12) 0%, transparent 60%)",
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
