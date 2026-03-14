import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

interface FloatingReadoutProps {
  signal: {
    direction: "buy" | "sell";
    confidence: number;
    pattern: string;
  } | null;
  analysis: string | null;
  visible: boolean;
}

/** Robotic voice synthesis using Web Audio API pitch/rate distortion */
function speakRobotic(text: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "pt-BR";
  utter.rate = 0.75; // slower = more robotic
  utter.pitch = 0.3; // very low pitch = robotic
  utter.volume = 1;
  // prefer a pt-BR voice
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find((v) => v.lang.startsWith("pt"));
  if (ptVoice) utter.voice = ptVoice;
  window.speechSynthesis.speak(utter);
}

export function FloatingReadout({
  signal,
  analysis,
  visible,
}: FloatingReadoutProps) {
  const spokenRef = useRef(false);

  useEffect(() => {
    if (!visible || !signal) {
      spokenRef.current = false;
      return;
    }
    if (spokenRef.current) return;
    spokenRef.current = true;

    const dir = signal.direction === "buy" ? "COMPRAR" : "VENDER";
    const conf = signal.confidence;
    const patternShort = signal.pattern.split("_")[0];
    const text = `${dir}. Confiança ${conf} por cento. Padrão ${patternShort}`;
    // Small delay to let animation show first
    setTimeout(() => speakRobotic(text), 300);
  }, [visible, signal]);

  const isBuy = signal?.direction === "buy";
  const dirLabel = isBuy ? "COMPRAR" : "VENDER";
  const neonColor = isBuy ? "#00c853" : "#ff1744";
  const bgGradient = isBuy
    ? "linear-gradient(135deg, rgba(0,200,83,0.15) 0%, rgba(0,100,40,0.25) 100%)"
    : "linear-gradient(135deg, rgba(255,23,68,0.15) 0%, rgba(120,0,30,0.25) 100%)";

  // Extract a short 1-line summary from gemini analysis (first line)
  const shortAnalysis = analysis
    ? analysis
        .split("\n")
        .filter(
          (l) => l.trim() && !l.startsWith("SR_JSON") && !l.startsWith("PAR:"),
        )
        .slice(0, 2)
        .join(" | ")
    : null;

  return (
    <AnimatePresence>
      {visible && signal && (
        <motion.div
          key="floating-readout"
          data-ocid="readout.panel"
          initial={{ opacity: 0, scale: 0.7, y: -40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          {/* Glow ring */}
          <motion.div
            animate={{
              boxShadow: [
                `0 0 30px 10px ${neonColor}44`,
                `0 0 60px 25px ${neonColor}88`,
                `0 0 30px 10px ${neonColor}44`,
              ],
            }}
            transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
            style={{
              background: bgGradient,
              backdropFilter: "blur(20px)",
              border: `2px solid ${neonColor}`,
              borderRadius: 20,
              padding: "28px 48px",
              minWidth: 280,
            }}
          >
            {/* Direction label */}
            <motion.div
              animate={{
                textShadow: [
                  `0 0 20px ${neonColor}`,
                  `0 0 40px ${neonColor}`,
                  `0 0 20px ${neonColor}`,
                ],
              }}
              transition={{ duration: 0.8, repeat: Number.POSITIVE_INFINITY }}
              style={{
                fontSize: 52,
                fontWeight: 900,
                letterSpacing: 6,
                color: neonColor,
                fontFamily: "monospace",
                lineHeight: 1,
              }}
            >
              {dirLabel}
            </motion.div>

            {/* Confidence bar */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 6,
                  background: "rgba(255,255,255,0.1)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${signal.confidence}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background: neonColor,
                    borderRadius: 3,
                  }}
                />
              </div>
              <span
                style={{
                  color: neonColor,
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                {signal.confidence}%
              </span>
            </div>

            {/* Pattern name */}
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
                fontFamily: "monospace",
                letterSpacing: 1,
              }}
            >
              {signal.pattern.replace(/_/g, " ")}
            </div>

            {/* Short analysis summary */}
            {shortAnalysis && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "monospace",
                  maxWidth: 260,
                  lineHeight: 1.4,
                }}
              >
                {shortAnalysis}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
