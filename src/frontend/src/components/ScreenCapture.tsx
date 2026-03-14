import {
  Brain,
  Camera,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MonitorPlay,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ScreenCaptureProps {
  onCapture: (dataUrl: string) => void;
  onStreamReady?: (stream: MediaStream | null) => void;
}

export function ScreenCaptureButton({
  onCapture,
  onStreamReady,
}: ScreenCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    setIsCapturing(false);
    onStreamReady?.(null);
  }, [onStreamReady]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
    };
  }, []);

  async function handleStartCapture() {
    try {
      setIsCapturing(true);

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
        // @ts-ignore
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "exclude",
      } as DisplayMediaStreamOptions);

      streamRef.current = mediaStream;

      // Listen for user clicking "Stop sharing"
      mediaStream.getTracks()[0].addEventListener("ended", stopCapture);

      // Notify parent with the live stream
      onStreamReady?.(mediaStream);

      // Also capture a still frame for Gemini analysis
      const video = document.createElement("video");
      video.srcObject = mediaStream;
      video.muted = true;
      await video.play();

      await new Promise<void>((resolve) => {
        const check = () => {
          if (video.readyState >= 2 && video.videoWidth > 0) {
            resolve();
          } else {
            requestAnimationFrame(check);
          }
        };
        requestAnimationFrame(check);
      });

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        onCapture(dataUrl);
      }

      // Keep stream alive (don't stop here)
    } catch {
      setIsCapturing(false);
      onStreamReady?.(null);
    }
  }

  return (
    <button
      type="button"
      onClick={isCapturing ? undefined : handleStartCapture}
      title={
        isCapturing
          ? "Gravação ao vivo ativa"
          : "Compartilhar aba do navegador para capturar o gráfico"
      }
      className="flex items-center justify-center w-6 h-6 rounded transition-opacity hover:opacity-80"
      style={{
        background: isCapturing
          ? "rgba(0,229,255,0.25)"
          : "rgba(0,229,255,0.1)",
        border: isCapturing
          ? "1px solid rgba(0,229,255,0.7)"
          : "1px solid rgba(0,229,255,0.25)",
        color: "#00e5ff",
      }}
      data-ocid="capture.upload_button"
    >
      {isCapturing ? <MonitorPlay size={11} /> : <Camera size={11} />}
    </button>
  );
}

interface SRLine {
  type: "support" | "resistance";
  yPercent: number;
  price: string;
}

interface LiveVideoPreviewProps {
  stream: MediaStream;
  onStop: () => void;
  /** countdown seconds -- used to trigger analysis animation overlay */
  countdown?: number;
  /** current signal direction when it fires */
  signalDirection?: "buy" | "sell" | null;
  /** true when IA is analyzing */
  isAnalyzing?: boolean;
  /** support/resistance lines from Gemini analysis */
  srLines?: SRLine[];
}

export function LiveVideoPreview({
  stream,
  onStop,
  countdown = 0,
  signalDirection,
  isAnalyzing = false,
  srLines = [],
}: LiveVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Draw S/R lines on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!srLines || srLines.length === 0) return;
    for (const line of srLines) {
      const y = (line.yPercent / 100) * canvas.height;
      const color = line.type === "support" ? "#00c853" : "#ff1744";
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.shadowBlur = 6;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      // Label
      const label = (line.type === "support" ? "S " : "R ") + line.price;
      ctx.font = "10px monospace";
      const tw = ctx.measureText(label).width;
      const lx = canvas.width - tw - 6;
      const ly = y - 3;
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.fillStyle =
        line.type === "support" ? "rgba(0,200,83,0.7)" : "rgba(255,23,68,0.7)";
      ctx.fillRect(lx - 2, ly - 10, tw + 4, 13);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, lx, ly);
      ctx.restore();
    }
  }, [srLines]);

  const compactHeight = 160;
  const expandedHeight = 400;

  const isSignalWindow = countdown <= 20 && countdown > 0;

  function handleOpenFloatingWindow() {
    // Open a small popup window that shows the live video + signal overlay
    const w = 480;
    const h = 320;
    const left = window.screen.width - w - 20;
    const top = 20;
    const popup = window.open(
      "",
      "ca_live_float",
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`,
    );
    if (!popup) return;

    // Write a self-contained HTML page into the popup
    popup.document.open();
    popup.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Capture Advance · AO VIVO</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:100%;height:100%;background:#080810;overflow:hidden;font-family:monospace;}
  #wrap{position:relative;width:100%;height:100%;display:flex;flex-direction:column;}
  #header{display:flex;align-items:center;justify-content:space-between;padding:4px 10px;background:rgba(0,229,255,0.06);border-bottom:1px solid rgba(0,229,255,0.2);flex-shrink:0;}
  #dot{width:8px;height:8px;border-radius:50%;background:#00e5ff;animation:pulse 0.8s ease-in-out infinite;}
  #label{font-size:10px;color:#00e5ff;font-weight:700;letter-spacing:0.15em;margin-left:6px;}
  #video{flex:1;width:100%;object-fit:fill;display:block;}
  #overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;pointer-events:none;transition:opacity 0.4s;}
  #overlay.hidden{opacity:0;}
  #countdown-label{font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.25em;}
  #countdown-val{font-size:13px;font-weight:700;}
  #big-text{font-size:4rem;font-weight:900;letter-spacing:0.08em;line-height:1;animation:textGlow 1.2s ease-in-out infinite;}
  #analyzing-wrap{display:flex;flex-direction:column;align-items:center;gap:10px;}
  #brain-icon{font-size:2.5rem;animation:spin 1.2s linear infinite;}
  #analyzing-text{font-size:1.5rem;font-weight:900;letter-spacing:0.15em;animation:blink 0.8s ease-in-out infinite;}
  .dots{display:flex;gap:6px;margin-top:4px;}
  .dot-item{width:10px;height:10px;border-radius:50%;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.3;}}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes blink{0%,100%{opacity:1;}50%{opacity:0.4;}}
  @keyframes textGlow{
    0%,100%{text-shadow:0 0 30px currentColor;}
    50%{text-shadow:0 0 70px currentColor, 0 0 120px currentColor;}
  }
  @keyframes dotBlink{
    0%,100%{opacity:0.2;}50%{opacity:1;}
  }
  @keyframes arrowBounce{
    0%,100%{transform:translateY(0);}
    50%{transform:translateY(-10px);}
  }
</style>
</head>
<body>
<div id="wrap">
  <div id="header">
    <div style="display:flex;align-items:center">
      <div id="dot"></div>
      <span id="label">AO VIVO · CAPTURE ADVANCE</span>
    </div>
    <span id="countdown-display" style="font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.1em"></span>
  </div>
  <video id="video" autoplay muted playsinline></video>
  <canvas id="sr-canvas" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;"></canvas>
  <div id="overlay" class="hidden">
    <div id="countdown-label">⏱ FALTAM <span id="countdown-val">20s</span> PARA FECHAR VELA</div>
    <div id="signal-content"></div>
  </div>
</div>
<script>
  // Receive stream from opener
  window._setStream = function(stream) {
    const vid = document.getElementById('video');
    vid.srcObject = stream;
    vid.play().catch(()=>{});
  };
  // Receive state updates from opener
  window._updateState = function(state) {
    const overlay = document.getElementById('overlay');
    const countdownVal = document.getElementById('countdown-val');
    const countdownDisplay = document.getElementById('countdown-display');
    const signalContent = document.getElementById('signal-content');

    const {countdown, isAnalyzing, signalDirection, isSignalWindow} = state;

    // Update header countdown
    if (countdown > 0) {
      countdownDisplay.textContent = countdown + 's';
      const c = countdown <= 5 ? '#ff1744' : countdown <= 10 ? '#ff9100' : '#ffd600';
      countdownDisplay.style.color = c;
    }

    // Show/hide overlay
    if (isSignalWindow && (isAnalyzing || signalDirection)) {
      overlay.classList.remove('hidden');
      countdownVal.textContent = countdown + 's';
      const cColor = countdown <= 5 ? '#ff1744' : countdown <= 10 ? '#ff9100' : '#ffd600';
      countdownVal.style.color = cColor;

      if (isAnalyzing) {
        signalContent.innerHTML = \`
          <div id="analyzing-wrap">
            <div id="brain-icon">🧠</div>
            <div id="analyzing-text" style="color:#ffd600">IA ANALISANDO...</div>
            <div class="dots">
              \${[0,1,2,3,4].map(i => \`<div class="dot-item" style="background:#ffd600;animation:dotBlink 0.9s ease-in-out \${i*0.15}s infinite"></div>\`).join('')}
            </div>
          </div>
        \`;
      } else if (signalDirection) {
        const color = signalDirection === 'buy' ? '#00c853' : '#ff1744';
        const arrow = signalDirection === 'buy' ? '↑' : '↓';
        const label = signalDirection === 'buy' ? 'BUY' : 'SELL';
        signalContent.innerHTML = \`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div id="arrow-icon" style="font-size:3.5rem;line-height:1;color:\${color};animation:arrowBounce 0.9s ease-in-out infinite, textGlow 1.2s ease-in-out infinite;">\${arrow}</div>
            <div id="big-text" style="color:\${color};font-size:2.2rem;">\${label}</div>
          </div>
        \`;
        // Darken background
        overlay.style.background = \`rgba(0,0,0,0.65)\`;
        overlay.style.backdropFilter = 'blur(4px)';
      }
    } else {
      overlay.classList.add('hidden');
      overlay.style.background = '';
      overlay.style.backdropFilter = '';
    }
  };
  // Draw S/R lines on canvas overlay
  window._updateSR = function(lines) {
    const canvas = document.getElementById('sr-canvas');
    if (!canvas) return;
    const vid = document.getElementById('video');
    canvas.width = canvas.offsetWidth || vid.offsetWidth || 480;
    canvas.height = canvas.offsetHeight || vid.offsetHeight || 280;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!lines || lines.length === 0) return;
    for (const line of lines) {
      const y = (line.yPercent / 100) * canvas.height;
      const color = line.type === 'support' ? '#00c853' : '#ff1744';
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 3]);
      ctx.shadowBlur = 6;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
      const label = (line.type === 'support' ? 'S ' : 'R ') + line.price;
      ctx.font = '10px monospace';
      const tw = ctx.measureText(label).width;
      const lx = canvas.width - tw - 6;
      const ly = y - 3;
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;
      ctx.fillStyle = line.type === 'support' ? 'rgba(0,200,83,0.7)' : 'rgba(255,23,68,0.7)';
      ctx.fillRect(lx - 2, ly - 10, tw + 4, 13);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, lx, ly);
      ctx.restore();
    }
  };
</script>
</body>
</html>`);
    popup.document.close();

    // Wait for popup to be ready, then push stream and state
    const tryConnect = () => {
      if (
        popup.closed ||
        typeof (
          popup as Window &
            typeof globalThis & { _setStream?: (s: MediaStream) => void }
        )._setStream !== "function"
      ) {
        setTimeout(tryConnect, 100);
        return;
      }
      (
        popup as Window &
          typeof globalThis & { _setStream: (s: MediaStream) => void }
      )._setStream(stream);
    };
    setTimeout(tryConnect, 300);

    // Store popup ref in window for state updates
    (
      window as Window & typeof globalThis & { _caFloatPopup?: Window }
    )._caFloatPopup = popup;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-xl overflow-hidden"
        style={{
          border: "1px solid rgba(0,229,255,0.35)",
          boxShadow: "0 0 20px rgba(0,229,255,0.12)",
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{
            background: "rgba(0,229,255,0.08)",
            borderBottom: "1px solid rgba(0,229,255,0.15)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#00e5ff" }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
            />
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#00e5ff]">
              AO VIVO
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Expand / collapse accordion button */}
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="flex items-center justify-center w-4 h-4 rounded hover:opacity-70 transition-opacity"
              style={{ color: "rgba(0,229,255,0.6)" }}
              title={isExpanded ? "Recolher vídeo" : "Expandir vídeo"}
              data-ocid="capture.toggle"
            >
              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {/* Float popup button */}
            <button
              type="button"
              onClick={handleOpenFloatingWindow}
              className="flex items-center justify-center w-4 h-4 rounded hover:opacity-70 transition-opacity"
              style={{ color: "rgba(0,229,255,0.6)" }}
              title="Abrir vídeo em janela flutuante"
              data-ocid="capture.open_modal_button"
            >
              <ExternalLink size={10} />
            </button>
            <button
              type="button"
              onClick={onStop}
              className="flex items-center justify-center w-4 h-4 rounded hover:opacity-70 transition-opacity"
              style={{ color: "rgba(255,255,255,0.3)" }}
              title="Parar captura"
              data-ocid="capture.delete_button"
            >
              <X size={10} />
            </button>
          </div>
        </div>

        {/* Live video — height animates between compact and expanded */}
        <motion.div
          animate={{ height: isExpanded ? expandedHeight : compactHeight }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          style={{
            background: "rgba(0,0,0,0.6)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full"
            style={{
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
          />
          {/* S/R lines canvas overlay */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
          {/* Scan line overlay */}
          <motion.div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              height: "1px",
              background:
                "linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)",
            }}
            animate={{ top: ["0%", "100%"] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
          {/* Signal window overlay inside the video preview */}
          <AnimatePresence>
            {isSignalWindow && (isAnalyzing || signalDirection) && (
              <motion.div
                key={`live-overlay-${isAnalyzing ? "analyzing" : signalDirection}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(3px)",
                  pointerEvents: "none",
                }}
              >
                {/* Countdown */}
                <div
                  className="text-[10px] font-mono tracking-[0.25em] font-bold"
                  style={{ color: "rgba(255,255,255,0.4)" }}
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
                  </span>
                </div>

                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      <Brain
                        size={28}
                        style={{
                          color: "#ffd600",
                          filter: "drop-shadow(0 0 10px rgba(255,214,0,0.7))",
                        }}
                      />
                    </motion.div>
                    <motion.div
                      animate={{ opacity: [0.6, 1, 0.6] }}
                      transition={{
                        duration: 0.8,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      className="text-base font-black font-mono tracking-[0.12em]"
                      style={{
                        color: "#ffd600",
                        textShadow: "0 0 20px rgba(255,214,0,0.6)",
                      }}
                    >
                      IA ANALISANDO...
                    </motion.div>
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full"
                          style={{ background: "#ffd600" }}
                          animate={{ opacity: [0.2, 1, 0.2] }}
                          transition={{
                            duration: 0.9,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : signalDirection ? (
                  /* Arrow + BUY/SELL signal */
                  <div className="flex flex-col items-center gap-1">
                    {/* Giant arrow */}
                    <motion.div
                      animate={{
                        y: signalDirection === "buy" ? [0, -10, 0] : [0, 10, 0],
                        filter:
                          signalDirection === "buy"
                            ? [
                                "drop-shadow(0 0 12px rgba(0,200,83,0.6))",
                                "drop-shadow(0 0 28px rgba(0,200,83,1))",
                                "drop-shadow(0 0 12px rgba(0,200,83,0.6))",
                              ]
                            : [
                                "drop-shadow(0 0 12px rgba(255,23,68,0.6))",
                                "drop-shadow(0 0 28px rgba(255,23,68,1))",
                                "drop-shadow(0 0 12px rgba(255,23,68,0.6))",
                              ],
                      }}
                      transition={{
                        duration: 0.9,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      style={{
                        fontSize: "3.5rem",
                        lineHeight: 1,
                        color:
                          signalDirection === "buy" ? "#00c853" : "#ff1744",
                      }}
                    >
                      {signalDirection === "buy" ? "↑" : "↓"}
                    </motion.div>
                    {/* BUY / SELL label */}
                    <motion.div
                      animate={{
                        textShadow:
                          signalDirection === "buy"
                            ? [
                                "0 0 20px rgba(0,200,83,0.6)",
                                "0 0 50px rgba(0,200,83,1)",
                                "0 0 20px rgba(0,200,83,0.6)",
                              ]
                            : [
                                "0 0 20px rgba(255,23,68,0.6)",
                                "0 0 50px rgba(255,23,68,1)",
                                "0 0 20px rgba(255,23,68,0.6)",
                              ],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                      className="font-black font-mono tracking-[0.12em]"
                      style={{
                        fontSize: "2rem",
                        lineHeight: 1,
                        color:
                          signalDirection === "buy" ? "#00c853" : "#ff1744",
                      }}
                    >
                      {signalDirection === "buy" ? "BUY" : "SELL"}
                    </motion.div>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface CaptureThumbProps {
  dataUrl: string;
  onClear: () => void;
}

export function CaptureThumb({ dataUrl, onClear }: CaptureThumbProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-xl overflow-hidden"
        style={{
          border: "1px solid rgba(0,229,255,0.25)",
          boxShadow: "0 0 16px rgba(0,229,255,0.08)",
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-3 py-1.5"
          style={{
            background: "rgba(0,229,255,0.06)",
            borderBottom: "1px solid rgba(0,229,255,0.15)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <Camera size={10} style={{ color: "#00e5ff" }} />
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#00e5ff]">
              CAPTURA DO GRÁFICO
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[9px] font-mono text-white/30 hover:text-white/60 transition-colors px-1"
              title={expanded ? "Minimizar" : "Expandir"}
            >
              {expanded ? "▲" : "▼"}
            </button>
            <button
              type="button"
              onClick={onClear}
              className="flex items-center justify-center w-4 h-4 rounded hover:opacity-70 transition-opacity"
              style={{ color: "rgba(255,255,255,0.3)" }}
              title="Remover captura"
              data-ocid="capture.delete_button"
            >
              <X size={10} />
            </button>
          </div>
        </div>

        {/* Thumbnail / expanded image */}
        <motion.div
          animate={{ height: expanded ? "auto" : 80 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
          style={{
            background: "rgba(0,0,0,0.4)",
          }}
        >
          <img
            src={dataUrl}
            alt="Captura do gráfico"
            className="w-full object-cover"
            style={{
              height: expanded ? "auto" : 80,
              objectPosition: "top",
              filter: "brightness(0.95) contrast(1.05)",
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
