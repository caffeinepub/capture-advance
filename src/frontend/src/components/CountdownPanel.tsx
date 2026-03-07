import { AlertTriangle, Clock } from "lucide-react";
import { motion } from "motion/react";

interface CountdownPanelProps {
  seconds: number;
  timeframe: string;
  isSignalWindow: boolean;
  theme?: "dark" | "light";
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return `0:${seconds.toString().padStart(2, "0")}`;
}

export function CountdownPanel({
  seconds,
  timeframe,
  isSignalWindow,
  theme = "dark",
}: CountdownPanelProps) {
  const isLight = theme === "light";
  const progress = (() => {
    const total = (() => {
      switch (timeframe) {
        case "m1":
          return 60;
        case "m5":
          return 300;
        case "m15":
          return 900;
        case "h1":
          return 3600;
        case "d1":
          return 86400;
        case "w1":
          return 604800;
        default:
          return 60;
      }
    })();
    return Math.max(0, 1 - seconds / total);
  })();

  const circumference = 2 * Math.PI * 22;
  const strokeDash = circumference * (1 - progress);

  return (
    <div
      data-ocid="countdown.panel"
      className="rounded-lg p-3 flex flex-col items-center gap-2"
      style={{
        background: isLight ? "rgba(255,255,255,0.88)" : "rgba(5,5,12,0.7)",
        border: isLight
          ? "1px solid rgba(0,200,83,0.15)"
          : "1px solid rgba(0,200,83,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center gap-2 w-full">
        <Clock
          size={12}
          style={{
            color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)",
          }}
        />
        <span
          className="text-[10px] font-mono tracking-widest"
          style={{
            color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)",
          }}
        >
          PRÓXIMA VELA
        </span>
        {isSignalWindow && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.6, repeat: Number.POSITIVE_INFINITY }}
            className="ml-auto flex items-center gap-1"
          >
            <AlertTriangle size={10} className="text-yellow-400" />
            <span className="text-[9px] font-mono text-yellow-400 font-bold">
              SINAL ATIVO
            </span>
          </motion.div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Circular progress */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg
            className="w-full h-full -rotate-90"
            viewBox="0 0 50 50"
            aria-hidden="true"
          >
            {/* Track */}
            <circle
              cx="25"
              cy="25"
              r="22"
              fill="none"
              stroke={isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.07)"}
              strokeWidth="3"
            />
            {/* Progress */}
            <motion.circle
              cx="25"
              cy="25"
              r="22"
              fill="none"
              stroke={
                isSignalWindow
                  ? "#ffd600"
                  : seconds <= 10
                    ? "#ff1744"
                    : "#00c853"
              }
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              animate={{ strokeDashoffset: strokeDash }}
              transition={{ duration: 0.5 }}
              style={{ strokeDashoffset: strokeDash }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              className={`text-sm font-black font-mono ${isSignalWindow ? "countdown-urgent" : seconds <= 10 ? "text-[#ff1744]" : ""}`}
              style={
                !isSignalWindow && seconds > 10
                  ? {
                      color: isLight
                        ? "rgba(0,0,0,0.7)"
                        : "rgba(255,255,255,0.8)",
                    }
                  : undefined
              }
              animate={isSignalWindow ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
            >
              {seconds <= 99 ? seconds : "..."}
            </motion.span>
          </div>
        </div>

        {/* Text */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[10px] font-mono"
            style={{
              color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)",
            }}
          >
            Em
          </span>
          <motion.span
            className={`text-2xl font-black font-mono ${isSignalWindow ? "text-[#ffd600]" : seconds <= 10 ? "text-[#ff1744]" : ""}`}
            style={
              !isSignalWindow && seconds > 10
                ? { color: isLight ? "#1a1a1a" : "white" }
                : undefined
            }
            animate={seconds <= 10 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: Number.POSITIVE_INFINITY }}
          >
            {formatTime(seconds)}
          </motion.span>
          <span
            className="text-[10px] font-mono"
            style={{
              color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)",
            }}
          >
            segundos
          </span>
        </div>
      </div>
    </div>
  );
}
