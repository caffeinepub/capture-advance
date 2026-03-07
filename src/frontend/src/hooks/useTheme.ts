import { useState } from "react";

export type Theme = "dark" | "light";

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("ca_theme");
    return saved === "light" ? "light" : "dark";
  });

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("ca_theme", next);
      return next;
    });
  }

  return [theme, toggleTheme];
}
