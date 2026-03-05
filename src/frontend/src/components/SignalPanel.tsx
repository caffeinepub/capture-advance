import {
  Activity,
  BarChart2,
  Brain,
  Minus,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { CandlePattern, SignalResult } from "../utils/chartEngine";
import { CaptureThumb, LiveVideoPreview } from "./ScreenCapture";

interface SignalPanelProps {
  signal: SignalResult | null;
  isAnalyzing: boolean;
  countdown: number;
  rsiValue: number;
  ema9: number;
  ema21: number;
  pattern: CandlePattern;
  emaStatus: string;
  isWindowVisible?: boolean;
  onBuyClick?: () => void;
  onSellClick?: () => void;
  captureDataUrl?: string | null;
  onClearCapture?: () => void;
  geminiAnalysis?: string | null;
  isGeminiAnalyzing?: boolean;
  liveStream?: MediaStream | null;
  /** last marked outcome for WIN/LOSS border glow */
  lastOutcome?: "win" | "loss" | null;
  /** whether a screen capture / live stream is currently active */
  hasCapture?: boolean;
}

function AnimatedDots() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((c) => (c + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);
  return <span>{".".repeat(count + 1)}</span>;
}

function RSIBar({ value }: { value: number }) {
  const color =
    value < 30
      ? "#00c853"
      : value > 70
        ? "#ff1744"
        : value < 40
          ? "#00e5ff"
          : value > 60
            ? "#ff9100"
            : "#ffd600";
  const label =
    value < 30
      ? "OVERSOLD"
      : value > 70
        ? "OVERBOUGHT"
        : value < 40
          ? "WEAK"
          : value > 60
            ? "STRONG"
            : "NEUTRAL";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-mono text-white/40">RSI (14)</span>
        <span className="text-[11px] font-mono font-semibold" style={{ color }}>
          {value.toFixed(1)} · {label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden relative">
        {/* Zone markers */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/20"
          style={{ left: "30%" }}
        />
        <div
          className="absolute top-0 bottom-0 w-px bg-white/20"
          style={{ left: "70%" }}
        />
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-white/20">
        <span>0</span>
        <span style={{ marginLeft: "27%" }}>30</span>
        <span className="mx-auto">50</span>
        <span style={{ marginRight: "27%" }}>70</span>
        <span>100</span>
      </div>
    </div>
  );
}

function PatternBadge({ pattern }: { pattern: CandlePattern }) {
  const isBull = pattern === "Bullish Engulfing" || pattern === "Hammer";
  const isBear = pattern === "Bearish Engulfing" || pattern === "Shooting Star";
  const color = isBull ? "#00c853" : isBear ? "#ff1744" : "#ffd600";
  const Icon = isBull ? TrendingUp : isBear ? TrendingDown : Minus;

  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-mono text-white/40">
        PADRÃO DE VELA
      </span>
      <div className="flex items-center gap-1.5">
        <Icon size={12} style={{ color }} />
        <span className="text-[12px] font-mono font-semibold" style={{ color }}>
          {pattern}
        </span>
      </div>
    </div>
  );
}

/** Extract the first 3 non-empty lines from Gemini analysis text */
function extractCandlePatterns(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function SignalPanel({
  signal,
  isAnalyzing,
  countdown,
  rsiValue,
  ema9,
  ema21,
  pattern,
  emaStatus,
  isWindowVisible = true,
  onBuyClick,
  onSellClick,
  captureDataUrl,
  onClearCapture,
  geminiAnalysis,
  isGeminiAnalyzing = false,
  liveStream,
  lastOutcome,
  hasCapture = false,
}: SignalPanelProps) {
  const isGlowBuy = signal?.direction === "buy";
  const isGlowSell = signal?.direction === "sell";
  const isWinGlow = lastOutcome === "win";
  const isLossGlow = lastOutcome === "loss";

  return (
    <div
      className="flex flex-col gap-4"
      style={
        isWinGlow
          ? {
              borderRadius: "0.75rem",
              boxShadow:
                "0 0 0 2px rgba(0,200,83,0.7), 0 0 30px rgba(0,200,83,0.4), 0 0 60px rgba(0,200,83,0.15)",
              animation: "winBorderGlow 1.2s ease-in-out infinite",
            }
          : isLossGlow
            ? {
                borderRadius: "0.75rem",
                boxShadow:
                  "0 0 0 2px rgba(255,23,68,0.7), 0 0 30px rgba(255,23,68,0.4), 0 0 60px rgba(255,23,68,0.15)",
                animation: "lossBorderGlow 1.2s ease-in-out infinite",
              }
            : undefined
      }
    >
      {/* Signal Direction Display */}
      <div
        className="relative flex flex-col items-center justify-center rounded-xl overflow-hidden py-8"
        style={{
          background: "rgba(5,5,12,0.7)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(8px)",
          minHeight: 120,
        }}
        data-ocid="signal.loading_state"
      >
        <AnimatePresence mode="wait">
          {isAnalyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <Brain size={20} className="text-yellow-400" />
                </motion.div>
                <span className="text-sm font-mono text-yellow-400 font-bold tracking-widest">
                  IA ANALISANDO...
                </span>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-yellow-400"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{
                      duration: 0.8,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.12,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-white/30 tracking-widest">
                PROCESSANDO INDICADORES
              </span>
            </motion.div>
          ) : signal ? (
            <motion.div
              key={`signal-${signal.direction}-${signal.confidence}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="text-5xl font-black tracking-widest font-mono"
                style={{
                  color: signal.direction === "buy" ? "#00c853" : "#ff1744",
                  textShadow:
                    signal.direction === "buy"
                      ? "0 0 40px rgba(0,200,83,0.7)"
                      : "0 0 40px rgba(255,23,68,0.7)",
                }}
              >
                {signal.direction === "buy" ? "▲ BUY" : "▼ SELL"}
              </div>
              <div className="text-sm font-mono text-white/50">
                Confiança IA:{" "}
                <span
                  className="font-black text-base"
                  style={{
                    color: signal.direction === "buy" ? "#00c853" : "#ff1744",
                  }}
                >
                  {signal.confidence}%
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <Activity size={22} className="text-white/20" />
              <span className="text-xs font-mono text-white/25 tracking-widest">
                AGUARDANDO ANÁLISE DA IA
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BUY / SELL Buttons side by side */}
      <div className="grid grid-cols-2 gap-3">
        {/* BUY Button */}
        <motion.button
          onClick={onBuyClick}
          whileTap={{ scale: 0.96 }}
          className={`
            relative w-full py-5 rounded-xl font-black text-2xl tracking-widest font-mono
            transition-all duration-300 select-none overflow-hidden
            ${isGlowBuy ? "glow-buy" : "bg-[#0d1a11] text-[#00c853]/30 border border-[#00c853]/15"}
          `}
          data-ocid="signal.buy_button"
        >
          {isGlowBuy && (
            <>
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-[#00c853]"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
              />
              <div
                className="signal-pulse-ring absolute inset-0 rounded-xl border-2 border-[#00c853]"
                style={{ pointerEvents: "none" }}
              />
            </>
          )}
          <span className={isGlowBuy ? "text-black" : ""}>▲ BUY</span>
        </motion.button>

        {/* SELL Button */}
        <motion.button
          onClick={onSellClick}
          whileTap={{ scale: 0.96 }}
          className={`
            relative w-full py-5 rounded-xl font-black text-2xl tracking-widest font-mono
            transition-all duration-300 select-none overflow-hidden
            ${isGlowSell ? "glow-sell" : "bg-[#1a0d11] text-[#ff1744]/30 border border-[#ff1744]/15"}
          `}
          data-ocid="signal.sell_button"
        >
          {isGlowSell && (
            <>
              <motion.div
                className="absolute inset-0 rounded-xl border-2 border-[#ff1744]"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
              />
              <div
                className="signal-pulse-ring absolute inset-0 rounded-xl border-2 border-[#ff1744]"
                style={{ pointerEvents: "none" }}
              />
            </>
          )}
          <span className={isGlowSell ? "text-white" : ""}>▼ SELL</span>
        </motion.button>
      </div>

      {/* Live video preview (shown when stream is active — replaces still thumb) */}
      {liveStream && onClearCapture && (
        <LiveVideoPreview
          stream={liveStream}
          onStop={onClearCapture}
          countdown={countdown}
          signalDirection={signal?.direction ?? null}
          isAnalyzing={isAnalyzing}
        />
      )}

      {/* Capture thumbnail (shown only when no live stream but still frame exists) */}
      {!liveStream && captureDataUrl && onClearCapture && (
        <CaptureThumb dataUrl={captureDataUrl} onClear={onClearCapture} />
      )}

      {/* AI Analysis Text */}
      <div
        className="rounded-xl p-4"
        style={{
          background: !isWindowVisible
            ? "rgba(255,23,68,0.06)"
            : !hasCapture
              ? "rgba(0,0,0,0.6)"
              : "rgba(0,200,83,0.04)",
          border: !isWindowVisible
            ? "1px solid rgba(255,23,68,0.35)"
            : !hasCapture
              ? "1px solid rgba(255,255,255,0.06)"
              : "1px solid rgba(0,200,83,0.18)",
          backdropFilter: "blur(8px)",
          transition: "background 0.4s, border-color 0.4s",
        }}
        data-ocid="signal.panel"
      >
        {/* Header — only shown when capture is active */}
        {hasCapture && isWindowVisible && (
          <div className="flex items-center gap-2 mb-3">
            <Brain size={13} style={{ color: "#00c853" }} />
            <span
              className="text-[11px] font-mono tracking-widest font-bold"
              style={{ color: "#00c853" }}
            >
              ANÁLISE IA
            </span>
            {(isGeminiAnalyzing || !!geminiAnalysis) && (
              <span
                className="text-[8px] font-mono tracking-widest px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(0,229,255,0.1)",
                  border: "1px solid rgba(0,229,255,0.25)",
                  color: "#00e5ff",
                }}
              >
                GEMINI
              </span>
            )}
            {isGeminiAnalyzing && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.4, repeat: Number.POSITIVE_INFINITY }}
                className="ml-auto w-1.5 h-1.5 rounded-full"
                style={{ background: "#00e5ff" }}
              />
            )}
          </div>
        )}
        <AnimatePresence mode="wait">
          {!isWindowVisible ? (
            /* Browser hidden / background */
            <motion.div
              key="not-detected"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-3 py-4"
              data-ocid="signal.error_state"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                className="text-2xl font-black font-mono tracking-widest"
                style={{
                  color: "#ff1744",
                  textShadow: "0 0 20px rgba(255,23,68,0.6)",
                }}
              >
                ⚠ NÃO DETECTADO
              </motion.div>
              <span className="text-[11px] font-mono text-white/30 tracking-widest text-center">
                Navegador em plano de fundo
              </span>
              <span className="text-[10px] font-mono text-white/20 text-center">
                Retorne para continuar análise
              </span>
            </motion.div>
          ) : !hasCapture ? (
            /* No capture active — show start prompt */
            <motion.div
              key="no-capture"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center justify-center gap-4 py-6"
              data-ocid="signal.empty_state"
            >
              <motion.div
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY }}
                style={{ color: "rgba(255,255,255,0.15)", fontSize: "2.5rem" }}
              >
                📷
              </motion.div>
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className="text-[13px] font-black font-mono tracking-[0.2em]"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                >
                  CARREGAR CAPTURA
                </span>
                <span className="text-[10px] font-mono text-white/20 tracking-widest text-center">
                  Clique no ícone de câmera
                  <br />
                  para iniciar análise ao vivo
                </span>
              </div>
            </motion.div>
          ) : isGeminiAnalyzing ? (
            /* Gemini analyzing */
            <motion.div
              key="gemini-analyzing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3 py-3"
              data-ocid="signal.loading_state"
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                  }}
                >
                  <Brain size={18} style={{ color: "#00e5ff" }} />
                </motion.div>
                <span
                  className="text-sm font-mono font-bold tracking-widest"
                  style={{ color: "#00e5ff" }}
                >
                  GEMINI ANALISANDO
                  <AnimatedDots />
                </span>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#00e5ff" }}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{
                      duration: 0.9,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: i * 0.14,
                    }}
                  />
                ))}
              </div>
              <span
                className="text-[10px] font-mono tracking-widest"
                style={{ color: "rgba(0,229,255,0.35)" }}
              >
                IDENTIFICANDO PADRÕES DE CANDLE
              </span>
            </motion.div>
          ) : geminiAnalysis ? (
            /* Gemini result — show only candle patterns */
            <motion.div
              key="gemini-result"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              {extractCandlePatterns(geminiAnalysis).map((line, i) => (
                <p
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list from API response
                  key={i}
                  className="text-[12px] font-mono leading-relaxed text-white/75"
                >
                  <span
                    style={{ color: "rgba(0,229,255,0.5)" }}
                    className="mr-1.5"
                  >
                    ›
                  </span>
                  {line}
                </p>
              ))}
              <p
                className="text-[9px] font-mono tracking-widest mt-3 pt-2"
                style={{
                  color: "rgba(0,229,255,0.35)",
                  borderTop: "1px solid rgba(0,229,255,0.1)",
                }}
              >
                PADRÕES DETECTADOS · GEMINI VISION
              </p>
            </motion.div>
          ) : (
            /* Capture active but Gemini not yet fired — waiting for 20s window */
            <motion.div
              key="capture-waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-4"
            >
              <motion.div
                animate={{ opacity: [0.3, 0.8, 0.3] }}
                transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
                className="text-[11px] font-mono tracking-widest text-center"
                style={{ color: "rgba(0,200,83,0.5)" }}
              >
                ● CAPTURA ATIVA
              </motion.div>
              <span className="text-[10px] font-mono text-white/20 tracking-widest text-center">
                Análise inicia nos últimos
                <br />
                20 segundos da vela
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Indicators */}
      <div
        className="rounded-xl p-4 space-y-4"
        style={{
          background: "rgba(5,5,12,0.65)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap size={13} className="text-white/40" />
          <span className="text-[11px] font-mono text-white/40 tracking-widest">
            INDICADORES TÉCNICOS
          </span>
        </div>

        {/* EMA Status */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-white/40">EMA CROSS</span>
          <div className="flex items-center gap-1.5">
            {ema9 > ema21 ? (
              <TrendingUp size={12} className="text-[#00c853]" />
            ) : (
              <TrendingDown size={12} className="text-[#ff1744]" />
            )}
            <span
              className="text-[12px] font-mono font-semibold"
              style={{ color: ema9 > ema21 ? "#00c853" : "#ff1744" }}
            >
              {emaStatus}
            </span>
          </div>
        </div>

        {/* EMA values */}
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span style={{ color: "rgba(0,229,255,0.8)" }}>
            EMA9: {ema9.toFixed(2)}
          </span>
          <span style={{ color: "rgba(255,214,0,0.8)" }}>
            EMA21: {ema21.toFixed(2)}
          </span>
        </div>

        {/* RSI bar */}
        <RSIBar value={rsiValue} />

        {/* Pattern */}
        <PatternBadge pattern={pattern} />
      </div>

      {/* Confidence bar */}
      {signal && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "rgba(5,5,12,0.65)",
            border: `1px solid ${signal.direction === "buy" ? "rgba(0,200,83,0.2)" : "rgba(255,23,68,0.2)"}`,
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <BarChart2 size={12} className="text-white/40" />
              <span className="text-[11px] font-mono text-white/40">
                CONFIANÇA DO SINAL
              </span>
            </div>
            <span
              className="text-lg font-black font-mono"
              style={{
                color: signal.direction === "buy" ? "#00c853" : "#ff1744",
              }}
            >
              {signal.confidence}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  signal.direction === "buy"
                    ? "linear-gradient(90deg, #00c853, #00e676)"
                    : "linear-gradient(90deg, #ff1744, #ff5252)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${signal.confidence}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-white/25">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
