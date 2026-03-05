import { Camera, MonitorPlay, X } from "lucide-react";
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

interface LiveVideoPreviewProps {
  stream: MediaStream;
  onStop: () => void;
}

export function LiveVideoPreview({ stream, onStop }: LiveVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

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

        {/* Live video */}
        <div style={{ background: "rgba(0,0,0,0.6)", position: "relative" }}>
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full"
            style={{
              height: 120,
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
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
        </div>
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
