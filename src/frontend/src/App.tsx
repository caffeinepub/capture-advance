import {
  Brain,
  Check,
  ExternalLink,
  Pencil,
  Wifi,
  WifiOff,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CountdownPanel } from "./components/CountdownPanel";
import { ScreenCaptureButton } from "./components/ScreenCapture";
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
  fetchBinanceCandles,
  fetchTickerInfo,
  isCryptoPair,
} from "./utils/binanceApi";

/** Format price: 5 decimal places for forex, 2 for crypto */
function formatPrice(price: number, pair: string): string {
  return isCryptoPair(pair) ? price.toFixed(2) : price.toFixed(5);
}
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
  const [openPrice, setOpenPrice] = useState(4500);
  const [isWindowVisible, setIsWindowVisible] = useState(!document.hidden);
  const [captureDataUrl, setCaptureDataUrl] = useState<string | null>(null);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<string | null>(null);
  const [isGeminiAnalyzing, setIsGeminiAnalyzing] = useState(false);
  const [isLiveData, setIsLiveData] = useState(false);
  const [currencyPair, setCurrencyPair] = useState<string>(() => {
    return localStorage.getItem("ca_currency_pair") || "EUR/USD";
  });
  const [editingPair, setEditingPair] = useState(false);
  const [pairInput, setPairInput] = useState(currencyPair);
  const isPopup = window.opener !== null || window.name === "ca_popup";
  const pairInputRef = useRef<HTMLInputElement>(null);
  const signalFiredRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevCountdownRef = useRef(0);
  const triggerRef = useRef<(() => void) | null>(null);
  const videoBackgroundRef = useRef<HTMLVideoElement>(null);
  const captureFrameRef = useRef<(() => string | null) | null>(null);
  const geminiAnalyzeRef = useRef<((dataUrl: string) => void) | null>(null);

  // Detect when window is hidden (minimized, other tab, etc.)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsWindowVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

  const initChart = useCallback(async (tf: Timeframe, pair: string) => {
    const minutes = timeframeToMinutes(tf);
    setSignal(null);
    signalFiredRef.current = false;

    if (isCryptoPair(pair)) {
      try {
        const binanceCandles = await fetchBinanceCandles(pair, minutes, 120);
        if (binanceCandles && binanceCandles.length > 0) {
          setCandles(binanceCandles);
          setIsLiveData(true);
          // Set initial price from last candle
          const last = binanceCandles[binanceCandles.length - 1];
          const spread = last.close * 0.0001;
          setBid(last.close - spread);
          setAsk(last.close + spread);
          setLastPrice(last.close);
          setOpenPrice(binanceCandles[0].open);
          return;
        }
      } catch {
        // fallback to simulated
      }
    }

    // Fallback: simulated data
    setIsLiveData(false);
    const newCandles = generateHistoricalCandles(minutes, 120, 4500);
    setCandles(newCandles);
  }, []);

  // Initialize chart when currency pair changes
  useEffect(() => {
    initChart(timeframe, currencyPair);
  }, [currencyPair, timeframe, initChart]);

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

    const minutes = timeframeToMinutes(timeframe);
    const intervalSeconds = minutes * 60;
    const isCrypto = isCryptoPair(currencyPair);

    // For live crypto data: fetch from Binance every 3s
    // For simulated: tick every 1-8s
    const intervalMs = isCrypto ? 3000 : getTickIntervalMs(timeframe);

    tickRef.current = setInterval(async () => {
      if (isCrypto) {
        // Fetch live ticker data
        try {
          const ticker = await fetchTickerInfo(currencyPair);
          if (ticker) {
            const now = Math.floor(Date.now() / 1000);
            const candleStart =
              Math.floor(now / intervalSeconds) * intervalSeconds;

            setBid(ticker.bid);
            setAsk(ticker.ask);
            setLastPrice(ticker.last);

            setCandles((prev) => {
              if (prev.length === 0) return prev;
              const last = prev[prev.length - 1];
              const newClose = ticker.last;

              if (candleStart > last.time) {
                // New candle started
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
                volume: last.volume + 10,
              };
              return [...prev.slice(0, -1), updated];
            });
          }
        } catch {
          // Silently ignore fetch errors
        }
      } else {
        // Simulated price movement
        setCandles((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const now = Math.floor(Date.now() / 1000);
          const candleStart =
            Math.floor(now / intervalSeconds) * intervalSeconds;

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
      }
    }, intervalMs);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [timeframe, currencyPair]);

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

  // Attach live stream to fullscreen background video
  useEffect(() => {
    if (videoBackgroundRef.current) {
      videoBackgroundRef.current.srcObject = liveStream;
      if (liveStream) {
        videoBackgroundRef.current.play().catch(() => {});
      }
    }
  }, [liveStream]);

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
        // Trigger local analysis
        triggerRef.current?.();
        // Also capture live stream frame and send to Gemini
        const frame = captureFrameRef.current?.();
        if (frame) {
          geminiAnalyzeRef.current?.(frame);
        }
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

  /** Capture a still frame from the live background video element */
  const captureFrameFromLiveStream = useCallback((): string | null => {
    const video = videoBackgroundRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0)
      return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/png");
  }, []);

  const analyzeWithGemini = useCallback(async (dataUrl: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey || apiKey === "DEMO_KEY_NOT_SET" || apiKey === "") {
      // No API key configured — silently skip Gemini, use local analysis only
      return;
    }

    setIsGeminiAnalyzing(true);
    setGeminiAnalysis(null);

    try {
      // Strip the data URL prefix to get pure base64
      const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: base64,
                    },
                  },
                  {
                    text: "Você é um analista financeiro especializado em trading de opções binárias. Analise este gráfico de candlestick e forneça: 1) Direção da tendência (ALTA ou BAIXA), 2) Padrões de velas identificados, 3) Níveis de suporte e resistência visíveis nas ordenadas (eixo Y), 4) Sua recomendação final: BUY (COMPRA) ou SELL (VENDA) com percentual de confiança de 0 a 100%. 5) Qual é o par de moedas visível neste gráfico? Responda no formato PAR: XXX/YYY na última linha se identificar. Responda em português de forma concisa.",
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 450,
              temperature: 0.2,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

      if (!text) {
        throw new Error("Resposta vazia da API Gemini");
      }

      setGeminiAnalysis(text);

      // Parse currency pair from Gemini response (e.g. "PAR: EUR/USD")
      const parMatch = text.match(/PAR:\s*([A-Z]{2,6}\/[A-Z]{2,6})/i);
      if (parMatch) {
        const detectedPair = parMatch[1].toUpperCase();
        setCurrencyPair(detectedPair);
        setPairInput(detectedPair);
        localStorage.setItem("ca_currency_pair", detectedPair);
        toast.success(`Par detectado: ${detectedPair}`, {
          style: {
            background: "rgba(8,8,16,0.95)",
            border: "1px solid rgba(0,229,255,0.3)",
            color: "#00e5ff",
            backdropFilter: "blur(12px)",
          },
        });
      }

      // Parse signal direction from Gemini response
      const upper = text.toUpperCase();
      const hasBuy =
        upper.includes("BUY") ||
        upper.includes("COMPRA") ||
        upper.includes("ALTA");
      const hasSell =
        upper.includes("SELL") ||
        upper.includes("VENDA") ||
        upper.includes("BAIXA");

      // Extract confidence percentage if present (e.g. "75%", "80%")
      const confMatch = text.match(/(\d{1,3})\s*%/);
      const confidence = confMatch
        ? Math.min(100, Math.max(0, Number.parseInt(confMatch[1], 10)))
        : 75;

      // Compute fresh indicators from latest candles state
      setCandles((prevCandles) => {
        const cls = prevCandles.map((c) => c.close);
        const e9 = calcEMA(cls, 9);
        const e21 = calcEMA(cls, 21);
        const rsi = calcRSI(cls, 14);
        const idx = cls.length - 1;
        const ema9Val = e9[idx] || 0;
        const ema21Val = e21[idx] || 0;
        const rsiVal = rsi[idx] || 50;
        const pat = detectPattern(prevCandles);

        const emaStatusVal =
          ema9Val > ema21Val ? "EMA Bullish Cross" : "EMA Bearish Cross";

        if (hasBuy && !hasSell) {
          setSignal({
            direction: "buy",
            confidence,
            ema9: ema9Val,
            ema21: ema21Val,
            rsi: rsiVal,
            pattern: pat,
            emaStatus: emaStatusVal,
          });
        } else if (hasSell && !hasBuy) {
          setSignal({
            direction: "sell",
            confidence,
            ema9: ema9Val,
            ema21: ema21Val,
            rsi: rsiVal,
            pattern: pat,
            emaStatus: emaStatusVal,
          });
        }

        return prevCandles;
      });

      toast.success("Análise Gemini concluída!", {
        style: {
          background: "rgba(8,8,16,0.95)",
          border: "1px solid rgba(0,229,255,0.3)",
          color: "#00e5ff",
          backdropFilter: "blur(12px)",
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro Gemini: ${msg}`, {
        style: {
          background: "rgba(8,8,16,0.95)",
          border: "1px solid rgba(255,23,68,0.3)",
          color: "#ff1744",
          backdropFilter: "blur(12px)",
        },
      });
      setGeminiAnalysis("Erro na análise Gemini. Verifique a chave de API.");
    } finally {
      setIsGeminiAnalyzing(false);
    }
  }, []);

  // Keep refs up-to-date so the countdown effect can call them without deps
  useEffect(() => {
    captureFrameRef.current = captureFrameFromLiveStream;
  }, [captureFrameFromLiveStream]);

  useEffect(() => {
    geminiAnalyzeRef.current = analyzeWithGemini;
  }, [analyzeWithGemini]);

  function handleOpenPopup() {
    const url = window.location.href;
    const w = 380;
    const h = 700;
    const left = window.screen.width - w - 20;
    const top = Math.floor((window.screen.height - h) / 2);
    window.open(
      url,
      "ca_popup",
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`,
    );
  }

  function handleSavePair() {
    const trimmed = pairInput.trim().toUpperCase() || "EUR/USD";
    setCurrencyPair(trimmed);
    setPairInput(trimmed);
    localStorage.setItem("ca_currency_pair", trimmed);
    setEditingPair(false);

    const isCrypto = isCryptoPair(trimmed);
    if (isCrypto) {
      toast.info(`Conectando à Binance para ${trimmed}...`, {
        style: {
          background: "rgba(8,8,16,0.95)",
          border: "1px solid rgba(0,200,83,0.3)",
          color: "#00c853",
          backdropFilter: "blur(12px)",
        },
      });
    } else {
      toast.info(`Par ${trimmed} em modo simulado`, {
        style: {
          background: "rgba(8,8,16,0.95)",
          border: "1px solid rgba(255,214,0,0.3)",
          color: "#ffd600",
          backdropFilter: "blur(12px)",
        },
      });
    }
  }

  function handleTimeframeChange(tf: Timeframe) {
    setTimeframe(tf);
    initChart(tf, currencyPair);
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
  const change = openPrice > 0 ? lastPrice - openPrice : 0;
  const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

  return (
    <div
      className={`w-full h-screen flex overflow-hidden ${isPopup ? "items-stretch justify-center" : "items-center justify-start"}`}
      style={{ background: "#080810" }}
    >
      <Toaster position="top-right" />

      {/* Fullscreen live video background when stream is active */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: liveStream ? 2 : -1, transition: "opacity 0.5s" }}
      >
        <video
          ref={videoBackgroundRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full"
          style={{ objectFit: "fill", display: "block" }}
        />
      </div>

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
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative flex flex-col overflow-hidden"
        style={{
          width: isPopup ? "100%" : "360px",
          height: "100vh",
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
                  background: isLiveData
                    ? "rgba(0,200,83,0.1)"
                    : "rgba(255,214,0,0.1)",
                  border: isLiveData
                    ? "1px solid rgba(0,200,83,0.2)"
                    : "1px solid rgba(255,214,0,0.2)",
                }}
                title={
                  isLiveData ? "Dados reais da Binance" : "Dados simulados"
                }
              >
                {isLiveData ? (
                  <Wifi size={9} style={{ color: "#00c853" }} />
                ) : (
                  <WifiOff size={9} style={{ color: "#ffd600" }} />
                )}
                <span
                  className="text-[9px] font-mono font-semibold"
                  style={{ color: isLiveData ? "#00c853" : "#ffd600" }}
                >
                  {isLiveData ? "BINANCE" : "SIM"}
                </span>
              </div>
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

              <ScreenCaptureButton
                onCapture={(url) => {
                  setCaptureDataUrl(url);
                  setGeminiAnalysis(null);
                  analyzeWithGemini(url);
                }}
                onStreamReady={(stream) => {
                  setLiveStream(stream);
                  if (!stream) {
                    setCaptureDataUrl(null);
                    setGeminiAnalysis(null);
                    setIsGeminiAnalyzing(false);
                  } else {
                    // Try to auto-detect currency pair from track label (tab title)
                    const trackLabel = stream.getTracks()[0]?.label ?? "";
                    const pairRegex = /([A-Z]{2,6}[\/\-][A-Z]{2,6})/i;
                    const match = trackLabel.match(pairRegex);
                    if (match) {
                      const detected = match[1].replace("-", "/").toUpperCase();
                      setCurrencyPair(detected);
                      setPairInput(detected);
                      localStorage.setItem("ca_currency_pair", detected);
                      toast.success(`Par detectado: ${detected}`, {
                        style: {
                          background: "rgba(8,8,16,0.95)",
                          border: "1px solid rgba(0,229,255,0.3)",
                          color: "#00e5ff",
                          backdropFilter: "blur(12px)",
                        },
                      });
                    }
                  }
                }}
              />

              {!isPopup && (
                <button
                  type="button"
                  onClick={handleOpenPopup}
                  title="Abrir como janela flutuante"
                  className="flex items-center justify-center w-6 h-6 rounded transition-opacity hover:opacity-80"
                  style={{
                    background: "rgba(0,200,83,0.1)",
                    border: "1px solid rgba(0,200,83,0.2)",
                    color: "#00c853",
                  }}
                  data-ocid="header.open_modal_button"
                >
                  <ExternalLink size={11} />
                </button>
              )}

              <SettingsPanel
                sensitivity={sensitivity}
                timeframe={timeframe}
                onSensitivityChange={handleSensitivityChange}
                onSave={handleSaveSettings}
              />
            </div>
          </header>

          {/* Timeframe selector + currency pair */}
          <div
            className="flex flex-col flex-shrink-0"
            style={{
              background: "rgba(0,0,0,0.25)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center gap-1 px-3 pt-1.5 pb-1">
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
                      timeframe === key
                        ? "0 0 10px rgba(0,200,83,0.5)"
                        : "none",
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

            {/* Currency pair display / edit */}
            <div className="flex flex-col items-center justify-center pb-1.5 gap-0.5">
              {editingPair ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={pairInputRef}
                    type="text"
                    value={pairInput}
                    onChange={(e) => setPairInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePair();
                      if (e.key === "Escape") {
                        setPairInput(currencyPair);
                        setEditingPair(false);
                      }
                    }}
                    maxLength={12}
                    className="bg-transparent border-b text-center text-[11px] font-black font-mono tracking-widest outline-none w-24"
                    style={{
                      color: "#00c853",
                      borderColor: "rgba(0,200,83,0.5)",
                      caretColor: "#00c853",
                    }}
                    data-ocid="currency_pair.input"
                  />
                  <button
                    type="button"
                    onClick={handleSavePair}
                    className="flex items-center justify-center w-4 h-4 rounded"
                    style={{ color: "#00c853" }}
                    data-ocid="currency_pair.save_button"
                  >
                    <Check size={11} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setPairInput(currencyPair);
                    setEditingPair(true);
                    setTimeout(() => pairInputRef.current?.select(), 50);
                  }}
                  className="flex items-center gap-1.5 group"
                  data-ocid="currency_pair.edit_button"
                >
                  <span
                    className="text-[11px] font-black font-mono tracking-widest"
                    style={{ color: "rgba(0,200,83,0.7)" }}
                  >
                    {liveStream ? "WEB/CONTEUDO" : currencyPair}
                  </span>
                  <Pencil
                    size={9}
                    className="opacity-0 group-hover:opacity-60 transition-opacity"
                    style={{ color: "#00c853" }}
                  />
                </button>
              )}
              {/* Live price below pair name */}
              <span
                className="text-[10px] font-mono font-bold tabular-nums"
                style={{
                  color: "rgba(0,200,83,0.55)",
                  letterSpacing: "0.05em",
                }}
              >
                {formatPrice(lastPrice, currencyPair)}
              </span>
            </div>
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
                {formatPrice(bid, currencyPair)}
              </span>
            </div>
            <div className="text-center">
              <div className="text-[12px] font-black font-mono text-white/80">
                {formatPrice(lastPrice, currencyPair)}
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
                {formatPrice(ask, currencyPair)}
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
              isWindowVisible={isWindowVisible}
              captureDataUrl={captureDataUrl}
              onClearCapture={() => {
                setCaptureDataUrl(null);
                setGeminiAnalysis(null);
                setIsGeminiAnalyzing(false);
                if (liveStream) {
                  for (const t of liveStream.getTracks()) t.stop();
                  setLiveStream(null);
                }
              }}
              geminiAnalysis={geminiAnalysis}
              isGeminiAnalyzing={isGeminiAnalyzing}
              liveStream={liveStream}
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
                  ? "radial-gradient(circle at 15% 50%, rgba(0,200,83,0.12) 0%, transparent 60%)"
                  : "radial-gradient(circle at 15% 50%, rgba(255,23,68,0.12) 0%, transparent 60%)",
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════
          FULLSCREEN SIGNAL ALERT OVERLAY
          Appears at 20 seconds remaining — covers the right side
          so user can't miss the signal while watching the chart
      ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isSignalWindow && (isAnalyzing || signal) && (
          <motion.div
            key={`signal-overlay-${isAnalyzing ? "analyzing" : signal?.direction}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="fixed pointer-events-none"
            style={{
              left: isPopup ? 0 : 360,
              right: 0,
              top: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 40,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -10 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center gap-6 px-8"
            >
              {/* Countdown seconds remaining */}
              <div
                className="text-[11px] font-mono tracking-[0.3em] font-bold"
                style={{ color: "rgba(255,255,255,0.35)" }}
              >
                ⏱ FALTAM{" "}
                <span
                  style={{
                    color:
                      countdown <= 5
                        ? "#ff1744"
                        : countdown <= 10
                          ? "#ff9100"
                          : "#ffd600",
                  }}
                >
                  {countdown}s
                </span>{" "}
                PARA FECHAR VELA
              </div>

              {isAnalyzing ? (
                /* Analyzing state */
                <div className="flex flex-col items-center gap-5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                    }}
                  >
                    <Brain
                      size={64}
                      style={{
                        color: "#ffd600",
                        filter: "drop-shadow(0 0 20px rgba(255,214,0,0.7))",
                      }}
                    />
                  </motion.div>
                  <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{
                      duration: 0.8,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="text-3xl font-black font-mono tracking-[0.15em]"
                    style={{
                      color: "#ffd600",
                      textShadow: "0 0 30px rgba(255,214,0,0.6)",
                    }}
                  >
                    IA ANALISANDO...
                  </motion.div>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 rounded-full"
                        style={{ background: "#ffd600" }}
                        animate={{
                          opacity: [0.2, 1, 0.2],
                          scale: [0.8, 1, 0.8],
                        }}
                        transition={{
                          duration: 0.9,
                          repeat: Number.POSITIVE_INFINITY,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : signal ? (
                /* Signal result */
                <div className="flex flex-col items-center gap-4">
                  {/* Big direction text */}
                  <motion.div
                    animate={{
                      textShadow:
                        signal.direction === "buy"
                          ? [
                              "0 0 40px rgba(0,200,83,0.6)",
                              "0 0 80px rgba(0,200,83,1)",
                              "0 0 40px rgba(0,200,83,0.6)",
                            ]
                          : [
                              "0 0 40px rgba(255,23,68,0.6)",
                              "0 0 80px rgba(255,23,68,1)",
                              "0 0 40px rgba(255,23,68,0.6)",
                            ],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="font-black font-mono tracking-[0.1em] select-none"
                    style={{
                      fontSize: "clamp(5rem, 12vw, 9rem)",
                      lineHeight: 1,
                      color: signal.direction === "buy" ? "#00c853" : "#ff1744",
                    }}
                  >
                    {signal.direction === "buy" ? "▲ BUY" : "▼ SELL"}
                  </motion.div>

                  {/* Confidence */}
                  <div
                    className="text-2xl font-mono font-bold tracking-widest"
                    style={{
                      color:
                        signal.direction === "buy"
                          ? "rgba(0,200,83,0.75)"
                          : "rgba(255,23,68,0.75)",
                    }}
                  >
                    Confiança:{" "}
                    <span
                      style={{
                        color:
                          signal.direction === "buy" ? "#00e676" : "#ff5252",
                      }}
                    >
                      {signal.confidence}%
                    </span>
                  </div>

                  {/* Pulse ring around the whole block */}
                  <motion.div
                    animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.7, 0.3] }}
                    transition={{
                      duration: 1,
                      repeat: Number.POSITIVE_INFINITY,
                    }}
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      border: `2px solid ${signal.direction === "buy" ? "#00c853" : "#ff1744"}`,
                      borderRadius: "50%",
                      width: 240,
                      height: 240,
                      marginLeft: "auto",
                      marginRight: "auto",
                      position: "relative",
                    }}
                  />

                  {/* Action label */}
                  <div
                    className="text-sm font-mono tracking-[0.25em] font-bold mt-2"
                    style={{
                      color:
                        signal.direction === "buy"
                          ? "rgba(0,200,83,0.5)"
                          : "rgba(255,23,68,0.5)",
                    }}
                  >
                    {signal.direction === "buy"
                      ? "ENTRE NA COMPRA AGORA"
                      : "ENTRE NA VENDA AGORA"}
                  </div>
                </div>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
