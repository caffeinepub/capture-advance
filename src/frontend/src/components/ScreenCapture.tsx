import { Camera, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ScreenCaptureProps {
  onCapture: (dataUrl: string) => void;
}

interface SelectionRect {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function ScreenCaptureButton({ onCapture }: ScreenCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  const stopCapture = useCallback(() => {
    if (stream) {
      for (const t of stream.getTracks()) t.stop();
      setStream(null);
    }
    setShowOverlay(false);
    setIsCapturing(false);
    setSelection(null);
    setIsDragging(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
      }
    };
  }, [stream]);

  async function handleStartCapture() {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      });

      // Create video element to render the stream
      const video = document.createElement("video");
      video.srcObject = mediaStream;
      video.muted = true;
      await video.play();
      videoRef.current = video;

      // Listen for stream end (user clicks "Stop sharing")
      mediaStream.getTracks()[0].addEventListener("ended", stopCapture);

      setStream(mediaStream);
      setShowOverlay(true);
    } catch {
      // User cancelled or permission denied
      setIsCapturing(false);
    }
  }

  function getOverlayCoords(e: React.MouseEvent): { x: number; y: number } {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const { x, y } = getOverlayCoords(e);
    dragStart.current = { x, y };
    setIsDragging(true);
    setSelection({ startX: x, startY: y, endX: x, endY: y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragStart.current) return;
    const { x, y } = getOverlayCoords(e);
    setSelection({
      startX: dragStart.current.x,
      startY: dragStart.current.y,
      endX: x,
      endY: y,
    });
  }

  function handleMouseUp(_e: React.MouseEvent) {
    if (!isDragging || !selection || !videoRef.current) return;
    setIsDragging(false);

    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const selWidth = Math.abs(selection.endX - selection.startX);
    const selHeight = Math.abs(selection.endY - selection.startY);

    // Minimum selection size
    if (selWidth < 10 || selHeight < 10) {
      setSelection(null);
      return;
    }

    const video = videoRef.current;

    // Scale from overlay size to video resolution
    const scaleX = video.videoWidth / rect.width;
    const scaleY = video.videoHeight / rect.height;

    const cropX = Math.min(selection.startX, selection.endX) * scaleX;
    const cropY = Math.min(selection.startY, selection.endY) * scaleY;
    const cropW = selWidth * scaleX;
    const cropH = selHeight * scaleY;

    // Draw cropped region to canvas
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(cropW);
    canvas.height = Math.round(cropH);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      video,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    const dataUrl = canvas.toDataURL("image/png");
    onCapture(dataUrl);
    canvasRef.current = canvas;
    stopCapture();
  }

  // Normalize selection rect so x/y is always top-left
  const selRect = selection
    ? {
        left: Math.min(selection.startX, selection.endX),
        top: Math.min(selection.startY, selection.endY),
        width: Math.abs(selection.endX - selection.startX),
        height: Math.abs(selection.endY - selection.startY),
      }
    : null;

  return (
    <>
      <button
        type="button"
        onClick={handleStartCapture}
        disabled={isCapturing}
        title="Capturar gráfico — clique para iniciar, depois arraste para recortar"
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

      {/* Full-screen capture overlay */}
      <AnimatePresence>
        {showOverlay && stream && (
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999]"
            style={{
              cursor: "crosshair",
              background: "rgba(0,0,0,0.35)",
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Stream preview as background */}
            <StreamPreview stream={stream} />

            {/* Instruction banner */}
            {!isDragging && !selection && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl font-mono text-sm font-bold pointer-events-none"
                style={{
                  background: "rgba(0,229,255,0.12)",
                  border: "1px solid rgba(0,229,255,0.35)",
                  color: "#00e5ff",
                  backdropFilter: "blur(12px)",
                  textShadow: "0 0 10px rgba(0,229,255,0.6)",
                  boxShadow: "0 4px 24px rgba(0,229,255,0.12)",
                }}
              >
                🎯 Clique e arraste para recortar o gráfico
              </motion.div>
            )}

            {/* Selection rectangle */}
            {selRect && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: selRect.left,
                  top: selRect.top,
                  width: selRect.width,
                  height: selRect.height,
                  border: "2px solid #00e5ff",
                  boxShadow:
                    "0 0 0 9999px rgba(0,0,0,0.45), inset 0 0 20px rgba(0,229,255,0.08)",
                  background: "rgba(0,229,255,0.04)",
                }}
              >
                {/* Corner brackets */}
                {[
                  {
                    id: "tl",
                    top: -1,
                    left: -1,
                    borderTop: true,
                    borderLeft: true,
                  },
                  {
                    id: "tr",
                    top: -1,
                    right: -1,
                    borderTop: true,
                    borderRight: true,
                  },
                  {
                    id: "bl",
                    bottom: -1,
                    left: -1,
                    borderBottom: true,
                    borderLeft: true,
                  },
                  {
                    id: "br",
                    bottom: -1,
                    right: -1,
                    borderBottom: true,
                    borderRight: true,
                  },
                ].map((corner) => (
                  <div
                    key={corner.id}
                    className="absolute w-4 h-4"
                    style={{
                      top: (corner as { top?: number }).top,
                      left: (corner as { left?: number }).left,
                      right: (corner as { right?: number }).right,
                      bottom: (corner as { bottom?: number }).bottom,
                      borderTop: (corner as { borderTop?: boolean }).borderTop
                        ? "2px solid #00e5ff"
                        : undefined,
                      borderLeft: (corner as { borderLeft?: boolean })
                        .borderLeft
                        ? "2px solid #00e5ff"
                        : undefined,
                      borderRight: (corner as { borderRight?: boolean })
                        .borderRight
                        ? "2px solid #00e5ff"
                        : undefined,
                      borderBottom: (corner as { borderBottom?: boolean })
                        .borderBottom
                        ? "2px solid #00e5ff"
                        : undefined,
                    }}
                  />
                ))}

                {/* Size label */}
                {selRect.width > 60 && selRect.height > 30 && (
                  <div
                    className="absolute bottom-1 right-1 text-[10px] font-mono"
                    style={{ color: "rgba(0,229,255,0.7)" }}
                  >
                    {Math.round(selRect.width)} × {Math.round(selRect.height)}
                  </div>
                )}
              </div>
            )}

            {/* Cancel button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopCapture();
              }}
              className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-bold"
              style={{
                background: "rgba(255,23,68,0.12)",
                border: "1px solid rgba(255,23,68,0.3)",
                color: "#ff1744",
                backdropFilter: "blur(8px)",
                zIndex: 1,
              }}
              data-ocid="capture.cancel_button"
            >
              <X size={12} />
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StreamPreview({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      muted
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80"
      style={{ zIndex: -1 }}
    />
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
