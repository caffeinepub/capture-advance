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
import type { CandlePattern, SignalResult } from "../utils/chartEngine";

interface SignalPanelProps {
  signal: SignalResult | null;
  isAnalyzing: boolean;
  countdown: number;
  rsiValue: number;
  ema9: number;
  ema21: number;
  pattern: CandlePattern;
  emaStatus: string;
  onBuyClick?: () => void;
  onSellClick?: () => void;
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

function AIAnalysisText({
  signal,
  isAnalyzing,
  rsiValue,
  ema9,
  ema21,
  pattern,
}: {
  signal: SignalResult | null;
  isAnalyzing: boolean;
  rsiValue: number;
  ema9: number;
  ema21: number;
  pattern: CandlePattern;
}) {
  const lines: string[] = [];

  if (isAnalyzing) {
    return (
      <div className="space-y-2">
        {([80, 60, 90, 50] as const).map((w) => (
          <motion.div
            key={w}
            className="h-2.5 rounded bg-white/10"
            style={{ width: `${w}%` }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Number.POSITIVE_INFINITY,
              delay: w * 0.002,
            }}
          />
        ))}
      </div>
    );
  }

  if (!signal) {
    const rsiMsg =
      rsiValue < 30
        ? "RSI em zona de sobrevenda — pressão compradora possível."
        : rsiValue > 70
          ? "RSI em zona de sobrecompra — atenção para reversão de baixa."
          : "RSI neutro, sem pressão direcional clara.";

    const emaMsg =
      ema9 > ema21
        ? "EMA9 acima da EMA21 — tendência de curto prazo altista."
        : "EMA9 abaixo da EMA21 — tendência de curto prazo baixista.";

    const patternMsg =
      pattern === "Bullish Engulfing"
        ? "Padrão Engulfing de Alta detectado — possível reversão para cima."
        : pattern === "Bearish Engulfing"
          ? "Padrão Engulfing de Baixa detectado — possível reversão para baixo."
          : pattern === "Hammer"
            ? "Hammer identificado — sinal de suporte e rejeição de baixa."
            : pattern === "Shooting Star"
              ? "Shooting Star identificado — sinal de resistência e rejeição de alta."
              : "Padrão neutro (Doji) — indecisão no mercado.";

    lines.push(rsiMsg, emaMsg, patternMsg);
    lines.push("Aguardando janela de sinal nos últimos 20 segundos da vela.");
  } else {
    const dir = signal.direction === "buy" ? "COMPRA" : "VENDA";
    lines.push(
      `IA concluiu análise: sinal de ${dir} com ${signal.confidence}% de confiança.`,
    );

    if (signal.confidence >= 80) {
      lines.push(
        "Alta confiança — todos os indicadores alinhados na mesma direção.",
      );
    } else if (signal.confidence >= 60) {
      lines.push(
        "Confiança moderada — maioria dos indicadores confirma o sinal.",
      );
    } else {
      lines.push("Confiança baixa — sinais divergentes, operar com cautela.");
    }

    const rsiDesc =
      signal.direction === "buy"
        ? rsiValue < 50
          ? `RSI em ${rsiValue.toFixed(0)} — espaço para alta antes de sobrecompra.`
          : `RSI em ${rsiValue.toFixed(0)} — mercado aquecido, confirmar entrada.`
        : rsiValue > 50
          ? `RSI em ${rsiValue.toFixed(0)} — espaço para queda antes de sobrevenda.`
          : `RSI em ${rsiValue.toFixed(0)} — mercado esfriando, confirmar saída.`;

    lines.push(rsiDesc);
    lines.push(`Padrão de vela: ${pattern}.`);
  }

  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <motion.p
          key={line}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="text-[12px] font-mono leading-relaxed text-white/60"
        >
          <span className="text-[#00c853]/60 mr-1.5">›</span>
          {line}
        </motion.p>
      ))}
    </div>
  );
}

export function SignalPanel({
  signal,
  isAnalyzing,
  rsiValue,
  ema9,
  ema21,
  pattern,
  emaStatus,
  onBuyClick,
  onSellClick,
}: SignalPanelProps) {
  const isGlowBuy = signal?.direction === "buy";
  const isGlowSell = signal?.direction === "sell";

  return (
    <div className="flex flex-col gap-4">
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

      {/* AI Analysis Text */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(0,200,83,0.04)",
          border: "1px solid rgba(0,200,83,0.18)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={13} className="text-[#00c853]" />
          <span className="text-[11px] font-mono text-[#00c853] tracking-widest font-bold">
            ANÁLISE IA
          </span>
          {isAnalyzing && (
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY }}
              className="ml-auto w-1.5 h-1.5 rounded-full bg-yellow-400"
            />
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={isAnalyzing ? "loading" : signal ? "signal" : "idle"}
          >
            <AIAnalysisText
              signal={signal}
              isAnalyzing={isAnalyzing}
              rsiValue={rsiValue}
              ema9={ema9}
              ema21={ema21}
              pattern={pattern}
            />
          </motion.div>
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
