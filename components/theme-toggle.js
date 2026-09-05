"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    let saved;
    try { saved = localStorage.getItem("alvenn-theme"); } catch {}
    const next = saved === "dark" || saved === "light" ? saved : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(next); document.documentElement.dataset.theme = next;
  }, []);
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); document.documentElement.dataset.theme = next;
    try { localStorage.setItem("alvenn-theme", next); } catch {}
  }
  return <button type="button" onClick={toggle} aria-label="Alternar modo Noite" aria-pressed={theme === "dark"} className="fixed bottom-4 right-4 z-[60] rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-lg">{theme === "dark" ? "☀ Dia" : "☾ Noite"}</button>;
}
