import { Clock, TrendingDown, TrendingUp, Trophy, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Direction, type Signal, SignalOutcome } from "../hooks/useQueries";

interface SignalHistoryProps {
  signals: Signal[];
  isLoading: boolean;
  onMarkOutcome: (signalId: bigint, outcome: SignalOutcome) => void;
}

function formatTime(timestamp: bigint): string {
  const ts = Number(timestamp) / 1_000_000; // nanoseconds to ms
  const date = new Date(ts);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeframeLabel(tf: string): string {
  switch (tf) {
    case "m1":
      return "1m";
    case "m5":
      return "5m";
    case "m15":
      return "15m";
    case "h1":
      return "1H";
    case "d1":
      return "1D";
    case "w1":
      return "1W";
    default:
      return tf;
  }
}

const OUTCOME_MARKERS = ["1", "2", "3", "4", "5"] as const;

export function SignalHistory({
  signals,
  isLoading,
  onMarkOutcome,
}: SignalHistoryProps) {
  const sorted = [...signals]
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono text-white/30 tracking-widest">
          HISTÓRICO
        </span>
        <span className="text-[10px] font-mono text-white/20">
          {sorted.length} sinais
        </span>
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(5,5,12,0.65)",
          backdropFilter: "blur(8px)",
        }}
        data-ocid="history.list"
      >
        {isLoading ? (
          <div
            className="flex items-center justify-center py-8"
            data-ocid="history.loading_state"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/20"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{
                    duration: 0.8,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-6 gap-2"
            data-ocid="history.empty_state"
          >
            <Clock size={18} className="text-white/15" />
            <span className="text-[10px] font-mono text-white/20">
              Sem sinais ainda
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {sorted.map((sig, idx) => {
              const isBuy = sig.direction === Direction.buy;
              const color = isBuy ? "#00c853" : "#ff1744";
              const markerIdx = OUTCOME_MARKERS[idx] ?? "1";
              const hasOutcome =
                sig.outcome !== undefined && sig.outcome !== null;

              return (
                <motion.div
                  key={String(sig.id)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className="flex items-center gap-2 px-3 py-2 border-b border-white/5 last:border-0"
                  data-ocid={`history.item.${markerIdx}`}
                >
                  {/* Direction icon */}
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `${color}20`,
                      border: `1px solid ${color}40`,
                    }}
                  >
                    {isBuy ? (
                      <TrendingUp size={11} style={{ color }} />
                    ) : (
                      <TrendingDown size={11} style={{ color }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[11px] font-black font-mono"
                        style={{ color }}
                      >
                        {isBuy ? "BUY" : "SELL"}
                      </span>
                      <span className="text-[9px] font-mono text-white/30">
                        {timeframeLabel(sig.timeframe as string)}
                      </span>
                      <span className="text-[9px] font-mono text-white/20 ml-auto">
                        {formatTime(sig.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono text-white/35">
                        {Number(sig.confidenceScore)}% · {sig.candlePattern}
                      </span>
                    </div>
                  </div>

                  {/* Outcome buttons */}
                  {hasOutcome ? (
                    <div
                      className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${sig.outcome === SignalOutcome.win ? "bg-[#00c853]/20 text-[#00c853]" : "bg-[#ff1744]/20 text-[#ff1744]"}`}
                    >
                      {sig.outcome === SignalOutcome.win ? "WIN" : "LOSS"}
                    </div>
                  ) : (
                    <div
                      className="flex gap-1 flex-shrink-0"
                      data-ocid="outcome.button"
                    >
                      <button
                        type="button"
                        onClick={() => onMarkOutcome(sig.id, SignalOutcome.win)}
                        className="flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition-all hover:bg-[#00c853]/20 text-[#00c853]/50 hover:text-[#00c853] border border-[#00c853]/20 hover:border-[#00c853]/50"
                        title="Marcar como WIN"
                        data-ocid={`history.item.${markerIdx}`}
                      >
                        <Trophy size={9} />W
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onMarkOutcome(sig.id, SignalOutcome.loss)
                        }
                        className="flex items-center gap-0.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded transition-all hover:bg-[#ff1744]/20 text-[#ff1744]/50 hover:text-[#ff1744] border border-[#ff1744]/20 hover:border-[#ff1744]/50"
                        title="Marcar como LOSS"
                        data-ocid={`history.item.${markerIdx}`}
                      >
                        <XCircle size={9} />L
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
