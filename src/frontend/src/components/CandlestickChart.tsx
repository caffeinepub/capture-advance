import { useCallback, useEffect, useRef } from "react";
import {
  type Candle,
  calcEMA,
  calcRSI,
  drawChart,
  drawRSI,
} from "../utils/chartEngine";

interface CandlestickChartProps {
  candles: Candle[];
  className?: string;
}

export function CandlestickChart({
  candles,
  className = "",
}: CandlestickChartProps) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const rsiCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const render = useCallback(() => {
    if (!mainCanvasRef.current || !rsiCanvasRef.current) return;

    const closes = candles.map((c) => c.close);
    const ema9 = calcEMA(closes, 9);
    const ema21 = calcEMA(closes, 21);
    const rsi = calcRSI(closes, 14);

    drawChart({
      canvas: mainCanvasRef.current,
      candles,
      ema9,
      ema21,
    });

    drawRSI(rsiCanvasRef.current, rsi);
  }, [candles]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // Resize observer
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      animFrameRef.current = requestAnimationFrame(render);
    });
    if (mainCanvasRef.current) observer.observe(mainCanvasRef.current);
    if (rsiCanvasRef.current) observer.observe(rsiCanvasRef.current);
    return () => observer.disconnect();
  }, [render]);

  return (
    <div
      className={`flex flex-col h-full ${className}`}
      data-ocid="chart.canvas_target"
    >
      {/* Legend */}
      <div className="flex items-center gap-4 px-3 py-1.5 text-xs font-mono border-b border-white/5">
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-0.5"
            style={{ background: "rgba(0,229,255,0.85)" }}
          />
          <span style={{ color: "rgba(0,229,255,0.85)" }}>EMA9</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-5 h-0.5"
            style={{ background: "rgba(255,214,0,0.85)" }}
          />
          <span style={{ color: "rgba(255,214,0,0.85)" }}>EMA21</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-2 h-2 rounded-sm bg-[#00c853]" />
          <span className="text-white/40">Bull</span>
          <div className="w-2 h-2 rounded-sm bg-[#ff1744] ml-1" />
          <span className="text-white/40">Bear</span>
        </div>
      </div>

      {/* Main chart */}
      <div className="flex-1 min-h-0 relative">
        <canvas
          ref={mainCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: "block" }}
        />
      </div>

      {/* Volume separator */}
      <div className="border-t border-white/5 text-[10px] font-mono text-white/30 px-3 py-0.5">
        VOL
      </div>

      {/* RSI separator */}
      <div className="border-t border-white/5 text-[10px] font-mono text-white/30 px-3 py-0.5 flex justify-between">
        <span>RSI(14)</span>
        <span className="text-white/20">30 — 70</span>
      </div>

      {/* RSI canvas */}
      <div className="h-16 relative border-t border-white/5">
        <canvas
          ref={rsiCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ display: "block" }}
        />
      </div>
    </div>
  );
}
