import { motion } from "motion/react";

interface PriceBarProps {
  bid: number;
  ask: number;
  last: number;
  change: number;
  changePercent: number;
}

function PriceCell({
  label,
  value,
  color,
}: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-3">
      <span className="text-[9px] font-mono text-white/30 tracking-widest">
        {label}
      </span>
      <motion.span
        key={value}
        initial={{ opacity: 0.5, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-black font-mono"
        style={{ color }}
      >
        {value}
      </motion.span>
    </div>
  );
}

export function PriceBar({
  bid,
  ask,
  last,
  change,
  changePercent,
}: PriceBarProps) {
  const isUp = change >= 0;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-t"
      style={{ borderColor: "rgba(255,255,255,0.07)", background: "#08080c" }}
    >
      <div className="flex items-center divide-x divide-white/10">
        <PriceCell label="BID" value={bid.toFixed(2)} color="#00c853" />
        <PriceCell label="ASK" value={ask.toFixed(2)} color="#ff1744" />
        <PriceCell
          label="LAST"
          value={last.toFixed(2)}
          color="rgba(255,255,255,0.8)"
        />
      </div>

      <motion.div
        key={change.toFixed(2)}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-2 px-3"
      >
        <span
          className={`text-xs font-mono font-bold ${isUp ? "text-[#00c853]" : "text-[#ff1744]"}`}
        >
          {isUp ? "▲" : "▼"} {Math.abs(change).toFixed(2)} (
          {Math.abs(changePercent).toFixed(2)}%)
        </span>
      </motion.div>

      <div className="flex items-center gap-2 text-[10px] font-mono text-white/20">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
        <span>LIVE SIM</span>
      </div>
    </div>
  );
}
