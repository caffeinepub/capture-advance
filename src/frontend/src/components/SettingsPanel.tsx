import { Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Sensitivity } from "../hooks/useQueries";

interface SettingsPanelProps {
  sensitivity: Sensitivity;
  timeframe: string;
  onSensitivityChange: (s: Sensitivity) => void;
  onSave: () => void;
}

const SENSITIVITY_OPTIONS = [
  {
    value: Sensitivity.conservative,
    label: "Conservador",
    desc: "Sinais mais raros mas mais confiáveis",
    color: "#00e5ff",
  },
  {
    value: Sensitivity.normal,
    label: "Normal",
    desc: "Equilíbrio entre frequência e precisão",
    color: "#ffd600",
  },
  {
    value: Sensitivity.aggressive,
    label: "Agressivo",
    desc: "Mais sinais, maior risco",
    color: "#ff1744",
  },
];

export function SettingsPanel({
  sensitivity,
  onSensitivityChange,
  onSave,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false);

  function handleSave() {
    onSave();
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-white/10 text-white/40 hover:text-white/70"
        data-ocid="settings.toggle"
        title="Configurações"
      >
        <motion.div
          animate={open ? { rotate: 90 } : { rotate: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Settings size={15} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Fechar configurações"
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-10 z-50 w-72 rounded-xl overflow-hidden"
              style={{
                background: "#0f0f18",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
              }}
              data-ocid="settings.panel"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Settings size={13} className="text-white/40" />
                  <span className="text-xs font-mono font-semibold text-white/70 tracking-wider">
                    CONFIGURAÇÕES
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-white/30 hover:text-white/60 transition-colors"
                  data-ocid="settings.close_button"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-mono text-white/30 tracking-widest block mb-2">
                    SENSIBILIDADE DO SINAL
                  </p>
                  <div className="space-y-2" data-ocid="sensitivity.select">
                    {SENSITIVITY_OPTIONS.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => onSensitivityChange(opt.value)}
                        className="w-full flex items-start gap-3 p-2.5 rounded-lg transition-all text-left"
                        style={{
                          background:
                            sensitivity === opt.value
                              ? `${opt.color}15`
                              : "transparent",
                          border:
                            sensitivity === opt.value
                              ? `1px solid ${opt.color}40`
                              : "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div
                          className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 transition-all"
                          style={{
                            background:
                              sensitivity === opt.value
                                ? opt.color
                                : "transparent",
                            border: `2px solid ${opt.color}`,
                            boxShadow:
                              sensitivity === opt.value
                                ? `0 0 8px ${opt.color}`
                                : "none",
                          }}
                        />
                        <div>
                          <div
                            className="text-xs font-mono font-semibold"
                            style={{
                              color:
                                sensitivity === opt.value
                                  ? opt.color
                                  : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {opt.label}
                          </div>
                          <div className="text-[9px] font-mono text-white/25 mt-0.5">
                            {opt.desc}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-2 rounded-lg text-xs font-mono font-bold tracking-widest transition-all"
                  style={{
                    background: "linear-gradient(135deg, #00c853, #00e676)",
                    color: "#000",
                    boxShadow: "0 4px 20px rgba(0,200,83,0.3)",
                  }}
                  data-ocid="settings.save_button"
                >
                  SALVAR
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
