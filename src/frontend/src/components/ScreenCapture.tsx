import { Camera, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ScreenCaptureProps {
  onCapture: (dataUrl: string) => void;
}

export function ScreenCaptureButton({ onCapture }: ScreenCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

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

      // Prefer browser tab sharing; fall back to full screen if cancelled
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
        // Hint the browser to prefer the "Tab" source (Chrome 107+)
        // @ts-ignore – non-standard but widely supported hint
        preferCurrentTab: false,
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: "exclude",
      } as DisplayMediaStreamOptions);

      streamRef.current = mediaStream;

      // Listen for user clicking "Stop sharing"
      mediaStream.getTracks()[0].addEventListener("ended", stopCapture);

      // Wait one frame so the video has content
      const video = document.createElement("video");
      video.srcObject = mediaStream;
      video.muted = true;
      await video.play();

      // Give the video a moment to render a real frame
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

      // Capture full frame from the shared tab
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        onCapture(dataUrl);
      }

      stopCapture();
    } catch {
      // User cancelled or permission denied
      setIsCapturing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleStartCapture}
      disabled={isCapturing}
      title="Compartilhar aba do navegador para capturar o gráfico"
      className="flex items-center justify-center w-6 h-6 rounded transition-opacity hover:opacity-80 disabled:opacity-40"
      style={{
        background: "rgba(0,229,255,0.1)",
        border: "1px solid rgba(0,229,255,0.25)",
        color: "#00e5ff",
      }}
      data-ocid="capture.upload_button"
    >
      <Camera size={11} />
    </button>
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
