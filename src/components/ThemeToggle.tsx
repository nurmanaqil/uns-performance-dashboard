"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

function getSystemScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getRenderedScheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const meta = document.querySelector('meta[name="color-scheme"]');
  const content = meta?.getAttribute("content");
  if (content === "dark" || content === "light") return content;
  return getSystemScheme();
}

export function ThemeToggle() {
  const [scheme, setScheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setScheme(getRenderedScheme());

    const onStorage = (e: StorageEvent) => {
      if (e.key !== "color-scheme") return;
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) {
        meta.setAttribute(
          "content",
          e.newValue === "light" || e.newValue === "dark" ? e.newValue : "light dark"
        );
      }
      setScheme(getRenderedScheme());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function handleToggle() {
    const current = getRenderedScheme();
    const target: "light" | "dark" = current === "dark" ? "light" : "dark";
    const system = getSystemScheme();
    const meta = document.querySelector('meta[name="color-scheme"]');

    try {
      if (target === system) {
        // Reverting to system preference instead of pinning an explicit override
        localStorage.removeItem("color-scheme");
        meta?.setAttribute("content", "light dark");
      } else {
        localStorage.setItem("color-scheme", target);
        meta?.setAttribute("content", target);
      }
    } catch {
      meta?.setAttribute("content", target);
    }

    setScheme(target);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="no-print inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      {scheme === "dark" ? (
        <Sun size={18} weight="regular" aria-hidden="true" />
      ) : (
        <Moon size={18} weight="regular" aria-hidden="true" />
      )}
    </button>
  );
}
