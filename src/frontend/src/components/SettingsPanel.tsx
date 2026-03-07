import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BookOpen, Settings, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Sensitivity } from "../hooks/useQueries";

interface SettingsPanelProps {
  sensitivity: Sensitivity;
  timeframe: string;
  onSensitivityChange: (s: Sensitivity) => void;
  onSave: () => void;
  onClearScreen?: () => void;
  theme?: "dark" | "light";
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

const MANUAL_SECTIONS = [
  {
    title: "INÍCIO",
    content:
      "Faça login ou cadastre-se com usuário e PIN de 4 dígitos para acessar o app.",
  },
  {
    title: "CAPTURA AO VIVO",
    content:
      "Clique no ícone de câmera no header → selecione a aba da corretora (ex: Pocket Option) → o vídeo aparece em tempo real no painel.",
  },
  {
    title: "SINAIS BUY/SELL",
    content:
      "Faltando 20 segundos para fechar a vela, o sistema analisa automaticamente e os botões BUY ou SELL brilham em neon com o sinal.",
  },
  {
    title: "ANÁLISE IA (GEMINI)",
    content:
      "Com captura ativa, o Gemini Vision analisa os últimos 5 candles do gráfico real da corretora e identifica padrões como Morning Star, Engulfing, Doji, Three White Soldiers, entre outros.",
  },
  {
    title: "TIMEFRAME",
    content:
      "Selecione o tempo de vela (1m, 5m, 15m, 1H...) conforme o gráfico na corretora.",
  },
  {
    title: "PAR DE MOEDAS",
    content:
      "Clique no nome do par (ex: EUR/USD) para editar. Com captura ativa, aparece como WEB/CONTEUDO.",
  },
  {
    title: "JANELA FLUTUANTE",
    content:
      "Clique no ícone de janela no header para abrir o app em janela popup flutuante, posicione ao lado da corretora.",
  },
  {
    title: "WIN / LOSS",
    content:
      "No histórico de sinais, marque o resultado de cada operação (WIN verde / LOSS vermelho).",
  },
  {
    title: "SENSIBILIDADE",
    content:
      "No painel de configurações, ajuste a sensibilidade: Conservador (menos sinais, mais precisos), Normal, Agressivo (mais sinais).",
  },
  {
    title: "LIMPAR TELA",
    content:
      'Use o botão "Limpar Tela" nas configurações para resetar captura, análise e sinais atuais.',
  },
];

export function SettingsPanel({
  sensitivity,
  onSensitivityChange,
  onSave,
  onClearScreen,
  theme = "dark",
}: SettingsPanelProps) {
  const isLight = theme === "light";
  const [open, setOpen] = useState(false);

  function handleSave() {
    onSave();
    setOpen(false);
  }

  function handleClearScreen() {
    onClearScreen?.();
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Manual button */}
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded transition-colors"
            style={{
              color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
            }}
            data-ocid="manual.open_modal_button"
            title="Manual de uso"
          >
            <BookOpen size={14} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-80 p-0"
          style={{
            background: isLight ? "#f8faf8" : "#0a0a14",
            border: isLight
              ? "1px solid rgba(0,200,83,0.2)"
              : "1px solid rgba(0,200,83,0.2)",
            boxShadow: isLight
              ? "4px 0 40px rgba(0,0,0,0.12)"
              : "4px 0 40px rgba(0,0,0,0.8)",
          }}
        >
          <SheetHeader
            className="px-5 py-4"
            style={{
              borderBottom: isLight
                ? "1px solid rgba(0,200,83,0.15)"
                : "1px solid rgba(0,200,83,0.12)",
            }}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={13} style={{ color: "#00c853" }} />
              <SheetTitle
                className="text-xs font-mono font-black tracking-[0.15em]"
                style={{ color: "#00c853" }}
              >
                MANUAL DE USO
              </SheetTitle>
            </div>
            <p
              className="text-[9px] font-mono tracking-widest mt-0.5"
              style={{
                color: isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)",
              }}
            >
              CAPTURE ADVANCE
            </p>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="px-5 py-4 space-y-5">
              {MANUAL_SECTIONS.map((section, i) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[8px] font-mono font-black tracking-widest"
                      style={{ color: "#00c853" }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3
                      className="text-[10px] font-mono font-black tracking-wider"
                      style={{ color: "#00c853" }}
                    >
                      {section.title}
                    </h3>
                  </div>
                  <p
                    className="text-[11px] font-mono leading-relaxed pl-5"
                    style={{
                      color: isLight
                        ? "rgba(0,0,0,0.55)"
                        : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {section.content}
                  </p>
                  {i < MANUAL_SECTIONS.length - 1 && (
                    <div
                      className="h-px mt-3"
                      style={{
                        background: isLight
                          ? "rgba(0,0,0,0.07)"
                          : "rgba(255,255,255,0.05)",
                      }}
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Settings button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-8 h-8 flex items-center justify-center rounded transition-colors"
          style={{
            color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
          }}
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
                  background: isLight ? "#f8faf8" : "#0f0f18",
                  border: isLight
                    ? "1px solid rgba(0,0,0,0.1)"
                    : "1px solid rgba(255,255,255,0.1)",
                  boxShadow: isLight
                    ? "0 20px 60px rgba(0,0,0,0.15)"
                    : "0 20px 60px rgba(0,0,0,0.8)",
                }}
                data-ocid="settings.panel"
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    borderBottom: isLight
                      ? "1px solid rgba(0,0,0,0.07)"
                      : "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Settings
                      size={13}
                      style={{
                        color: isLight
                          ? "rgba(0,0,0,0.4)"
                          : "rgba(255,255,255,0.4)",
                      }}
                    />
                    <span
                      className="text-xs font-mono font-semibold tracking-wider"
                      style={{
                        color: isLight
                          ? "rgba(0,0,0,0.7)"
                          : "rgba(255,255,255,0.7)",
                      }}
                    >
                      CONFIGURAÇÕES
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="transition-opacity hover:opacity-60"
                    style={{
                      color: isLight
                        ? "rgba(0,0,0,0.35)"
                        : "rgba(255,255,255,0.3)",
                    }}
                    data-ocid="settings.close_button"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p
                      className="text-[10px] font-mono tracking-widest block mb-2"
                      style={{
                        color: isLight
                          ? "rgba(0,0,0,0.4)"
                          : "rgba(255,255,255,0.3)",
                      }}
                    >
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
                                : isLight
                                  ? "1px solid rgba(0,0,0,0.07)"
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
                                    : isLight
                                      ? "rgba(0,0,0,0.55)"
                                      : "rgba(255,255,255,0.5)",
                              }}
                            >
                              {opt.label}
                            </div>
                            <div
                              className="text-[9px] font-mono mt-0.5"
                              style={{
                                color: isLight
                                  ? "rgba(0,0,0,0.35)"
                                  : "rgba(255,255,255,0.25)",
                              }}
                            >
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

                  {/* Clear Screen */}
                  {onClearScreen && (
                    <button
                      type="button"
                      onClick={handleClearScreen}
                      className="w-full py-2 rounded-lg text-xs font-mono font-bold tracking-widest transition-all"
                      style={{
                        background: "rgba(255,23,68,0.08)",
                        border: "1px solid rgba(255,23,68,0.3)",
                        color: "#ff1744",
                        boxShadow: "0 0 12px rgba(255,23,68,0.08)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,23,68,0.15)";
                        e.currentTarget.style.boxShadow =
                          "0 0 20px rgba(255,23,68,0.2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255,23,68,0.08)";
                        e.currentTarget.style.boxShadow =
                          "0 0 12px rgba(255,23,68,0.08)";
                      }}
                      data-ocid="settings.clear_screen_button"
                    >
                      ⬛ LIMPAR TELA
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
