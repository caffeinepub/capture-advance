import { Delete } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useLoginUser, useRegisterUser } from "../hooks/useQueries";

interface LoginScreenProps {
  onSuccess: (username: string) => void;
  theme?: "dark" | "light";
}

type Mode = "login" | "register";

function hashPin(username: string, pin: string): string {
  return btoa(`${username}:${pin}`);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginScreen({ onSuccess, theme = "dark" }: LoginScreenProps) {
  const isLight = theme === "light";
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [confirmStep, setConfirmStep] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loginMutation = useLoginUser();
  const registerMutation = useRegisterUser();

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const activePin = mode === "register" && confirmStep ? pinConfirm : pin;
  const setActivePin =
    mode === "register" && confirmStep ? setPinConfirm : setPin;

  function handleKeyPress(digit: string) {
    if (activePin.length < 4) {
      setActivePin((prev) => prev + digit);
      setError(null);
    }
  }

  function handleBackspace() {
    setActivePin((prev) => prev.slice(0, -1));
    setError(null);
  }

  function handleClear() {
    setPin("");
    setPinConfirm("");
    setConfirmStep(false);
    setError(null);
  }

  async function handleLogin() {
    if (!username.trim()) {
      setError("Digite seu usuário.");
      return;
    }
    if (pin.length < 4) {
      setError("Digite os 4 dígitos do PIN.");
      return;
    }
    const pinHash = hashPin(username.trim(), pin);
    try {
      const result = await loginMutation.mutateAsync({
        username: username.trim(),
        pinHash,
      });
      if (result.__kind__ === "ok") {
        onSuccess(username.trim());
      } else {
        setError(result.err || "Usuário ou PIN incorreto.");
        setPin("");
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
      setPin("");
    }
  }

  async function handleRegister() {
    if (!username.trim()) {
      setError("Digite um nome de usuário.");
      return;
    }
    if (username.trim().length < 3) {
      setError("Usuário deve ter pelo menos 3 caracteres.");
      return;
    }
    if (!email.trim()) {
      setError("Digite seu email.");
      return;
    }
    if (!isValidEmail(email.trim())) {
      setError("Email inválido.");
      return;
    }
    if (!confirmStep) {
      if (pin.length < 4) {
        setError("Digite os 4 dígitos do PIN.");
        return;
      }
      setConfirmStep(true);
      setError(null);
      return;
    }
    if (pinConfirm.length < 4) {
      setError("Confirme os 4 dígitos do PIN.");
      return;
    }
    if (pin !== pinConfirm) {
      setError("PINs não conferem. Tente novamente.");
      setPinConfirm("");
      return;
    }
    const pinHash = hashPin(username.trim(), pin);
    try {
      const result = await registerMutation.mutateAsync({
        username: username.trim(),
        pinHash,
      });
      if (result.__kind__ === "ok") {
        // Store email locally associated with username
        localStorage.setItem(`ca_email_${username.trim()}`, email.trim());
        setSuccessMsg("Conta criada com sucesso! Faça login.");
        setTimeout(() => {
          setSuccessMsg(null);
          setMode("login");
          setPin("");
          setPinConfirm("");
          setConfirmStep(false);
          setEmail("");
        }, 1500);
      } else {
        setError(result.err || "Não foi possível criar a conta.");
        setPin("");
        setPinConfirm("");
        setConfirmStep(false);
      }
    } catch {
      setError("Erro ao registrar. Tente novamente.");
    }
  }

  function switchMode(newMode: Mode) {
    setMode(newMode);
    setPin("");
    setPinConfirm("");
    setConfirmStep(false);
    setError(null);
    setSuccessMsg(null);
    setUsername("");
    setEmail("");
  }

  const PIN_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

  const displayPin = mode === "register" && confirmStep ? pinConfirm : pin;

  const inputStyle = {
    background: isLight ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)",
    border: "1px solid rgba(168,85,247,0.2)",
    color: isLight ? "#1a1a1a" : "rgba(255,255,255,0.85)",
    caretColor: "#a855f7",
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: isLight ? "#f0f4f0" : "#0a0018", zIndex: 9999 }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isLight
            ? "linear-gradient(rgba(168,85,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.04) 1px, transparent 1px)"
            : "linear-gradient(rgba(168,85,247,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.015) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Scan line */}
      <motion.div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, rgba(168,85,247,0.35), transparent)",
        }}
        animate={{ top: ["0%", "100%"] }}
        transition={{
          duration: 5,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
          repeatDelay: 3,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-xs mx-4 rounded-2xl overflow-hidden"
        style={{
          background: isLight ? "rgba(255,255,255,0.92)" : "rgba(14,0,35,0.95)",
          border: "1px solid rgba(168,85,247,0.25)",
          boxShadow: isLight
            ? "0 8px 40px rgba(168,85,247,0.1), 0 2px 12px rgba(0,0,0,0.08)"
            : "0 0 60px rgba(168,85,247,0.08), inset 0 0 40px rgba(168,85,247,0.04)",
        }}
      >
        {/* Corner brackets */}
        {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => {
          const [v, h] = pos.split("-");
          return (
            <div
              key={pos}
              className="absolute pointer-events-none"
              style={{
                [v]: 0,
                [h]: 0,
                width: 16,
                height: 16,
                [`border${v.charAt(0).toUpperCase() + v.slice(1)}`]:
                  "2px solid #a855f7",
                [`border${h.charAt(0).toUpperCase() + h.slice(1)}`]:
                  "2px solid #a855f7",
                opacity: 0.9,
                zIndex: 1,
              }}
            />
          );
        })}

        <div className="px-6 py-7 flex flex-col items-center gap-5">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm font-mono"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: "#000",
                boxShadow: "0 0 20px rgba(168,85,247,0.6)",
              }}
            >
              CA
            </div>
            <div className="text-center">
              <div
                className="text-sm font-black font-mono tracking-[0.15em]"
                style={{ color: isLight ? "#1a1a1a" : "rgba(255,255,255,0.9)" }}
              >
                CAPTURE <span style={{ color: "#a855f7" }}>ADVANCE</span>
              </div>
              <div
                className="text-[9px] font-mono tracking-widest mt-0.5"
                style={{
                  color: isLight
                    ? "rgba(0,0,0,0.35)"
                    : "rgba(255,255,255,0.25)",
                }}
              >
                AI SIGNAL ANALYZER
              </div>
            </div>
          </div>

          {/* Mode title */}
          <div className="text-center">
            <div
              className="text-xs font-mono font-bold tracking-widest"
              style={{ color: "rgba(168,85,247,0.8)" }}
            >
              {mode === "login"
                ? "ENTRAR"
                : confirmStep
                  ? "CONFIRMAR PIN"
                  : "CRIAR CONTA"}
            </div>
          </div>

          {/* Username */}
          <div className="w-full">
            <label
              htmlFor="username"
              className="text-[9px] font-mono tracking-widest block mb-1"
              style={{
                color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.3)",
              }}
            >
              USUÁRIO
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="seu_usuario"
              maxLength={24}
              autoComplete="username"
              className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none transition-all"
              style={inputStyle}
              data-ocid={
                mode === "login"
                  ? "login.username_input"
                  : "register.username_input"
              }
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (mode === "login") handleLogin();
                  else handleRegister();
                }
              }}
            />
          </div>

          {/* Email field -- only on register, hidden during confirm step */}
          {mode === "register" && !confirmStep && (
            <div className="w-full">
              <label
                htmlFor="email"
                className="text-[9px] font-mono tracking-widest block mb-1"
                style={{
                  color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.3)",
                }}
              >
                EMAIL
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                placeholder="seu@email.com"
                maxLength={64}
                autoComplete="email"
                className="w-full px-3 py-2 rounded-lg text-sm font-mono outline-none transition-all"
                style={inputStyle}
                data-ocid="register.email_input"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRegister();
                }}
              />
            </div>
          )}

          {/* PIN dots */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div
              className="text-[9px] font-mono tracking-widest"
              style={{
                color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.3)",
              }}
              data-ocid="login.pin_pad"
            >
              {mode === "register" && confirmStep
                ? "CONFIRMAR PIN"
                : "PIN DE 4 DÍGITOS"}
            </div>
            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: i < displayPin.length ? 1 : 0.85,
                    background:
                      i < displayPin.length ? "#a855f7" : "transparent",
                  }}
                  transition={{ duration: 0.15 }}
                  className="w-4 h-4 rounded-full"
                  style={{
                    border: "2px solid",
                    borderColor:
                      i < displayPin.length
                        ? "#a855f7"
                        : isLight
                          ? "rgba(0,0,0,0.2)"
                          : "rgba(255,255,255,0.2)",
                    boxShadow:
                      i < displayPin.length
                        ? "0 0 8px rgba(168,85,247,0.7)"
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {PIN_KEYS.slice(0, 9).map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                disabled={isLoading || displayPin.length >= 4}
                className="py-3 rounded-lg font-mono font-bold text-base transition-all active:scale-95"
                style={{
                  background: isLight
                    ? "rgba(168,85,247,0.07)"
                    : "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  color: isLight ? "#1a1a1a" : "rgba(255,255,255,0.8)",
                  cursor: displayPin.length >= 4 ? "default" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (displayPin.length < 4) {
                    e.currentTarget.style.background = "rgba(168,85,247,0.18)";
                    e.currentTarget.style.borderColor = "rgba(168,85,247,0.35)";
                    e.currentTarget.style.color = "#a855f7";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isLight
                    ? "rgba(168,85,247,0.07)"
                    : "rgba(168,85,247,0.08)";
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.15)";
                  e.currentTarget.style.color = isLight
                    ? "#1a1a1a"
                    : "rgba(255,255,255,0.8)";
                }}
              >
                {digit}
              </button>
            ))}
            {/* Row: clear | 0 | backspace */}
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading}
              className="py-3 rounded-lg font-mono font-bold text-[10px] tracking-wider transition-all active:scale-95"
              style={{
                background: "rgba(255,214,0,0.07)",
                border: "1px solid rgba(255,214,0,0.15)",
                color: "rgba(255,214,0,0.6)",
              }}
            >
              CLR
            </button>
            <button
              key="0"
              type="button"
              onClick={() => handleKeyPress("0")}
              disabled={isLoading || displayPin.length >= 4}
              className="py-3 rounded-lg font-mono font-bold text-base transition-all active:scale-95"
              style={{
                background: isLight
                  ? "rgba(168,85,247,0.07)"
                  : "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.15)",
                color: isLight ? "#1a1a1a" : "rgba(255,255,255,0.8)",
                cursor: displayPin.length >= 4 ? "default" : "pointer",
              }}
              onMouseEnter={(e) => {
                if (displayPin.length < 4) {
                  e.currentTarget.style.background = "rgba(168,85,247,0.18)";
                  e.currentTarget.style.borderColor = "rgba(168,85,247,0.35)";
                  e.currentTarget.style.color = "#a855f7";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isLight
                  ? "rgba(168,85,247,0.07)"
                  : "rgba(168,85,247,0.08)";
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.15)";
                e.currentTarget.style.color = isLight
                  ? "#1a1a1a"
                  : "rgba(255,255,255,0.8)";
              }}
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={isLoading}
              className="py-3 rounded-lg flex items-center justify-center transition-all active:scale-95"
              style={{
                background: "rgba(255,23,68,0.07)",
                border: "1px solid rgba(255,23,68,0.15)",
                color: "rgba(255,23,68,0.7)",
              }}
            >
              <Delete size={16} />
            </button>
          </div>

          {/* Error / success messages */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full text-center text-[11px] font-mono py-2 px-3 rounded-lg"
                style={{
                  background: "rgba(255,23,68,0.1)",
                  border: "1px solid rgba(255,23,68,0.25)",
                  color: "#ff5252",
                }}
                data-ocid="login.error_state"
              >
                {error}
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full text-center text-[11px] font-mono py-2 px-3 rounded-lg"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(168,85,247,0.25)",
                  color: "#a855f7",
                }}
                data-ocid="login.success_state"
              >
                {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={mode === "login" ? handleLogin : handleRegister}
            disabled={isLoading}
            className="w-full py-3 rounded-lg text-sm font-mono font-black tracking-widest transition-all"
            style={{
              background: isLoading
                ? "rgba(168,85,247,0.3)"
                : "linear-gradient(135deg, #7c3aed, #a855f7)",
              color: "#000",
              boxShadow: isLoading
                ? "none"
                : "0 4px 20px rgba(168,85,247,0.35)",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
            data-ocid={
              mode === "login"
                ? "login.submit_button"
                : "register.submit_button"
            }
          >
            {isLoading
              ? "AGUARDE..."
              : mode === "login"
                ? "ENTRAR"
                : confirmStep
                  ? "CONFIRMAR CADASTRO"
                  : "PRÓXIMO"}
          </motion.button>

          {/* Mode switcher */}
          <div className="text-center">
            {mode === "login" ? (
              <span
                className="text-[10px] font-mono"
                style={{
                  color: isLight ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.3)",
                }}
              >
                Sem conta?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="transition-colors hover:text-[#a855f7]"
                  style={{ color: "rgba(168,85,247,0.6)" }}
                  data-ocid="login.register_link"
                >
                  CRIAR CONTA
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-[10px] font-mono transition-opacity hover:opacity-60"
                style={{
                  color: isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.3)",
                }}
              >
                ← Voltar ao login
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
